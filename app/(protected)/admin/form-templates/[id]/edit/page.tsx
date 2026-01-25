'use client';

/**
 * Form Template Editor
 * 
 * Drag-and-drop interface for building and editing form templates.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useFormBuilderStore } from '@/lib/stores/form-builder-store';
import { FormBuilder } from '@/components/form-builder/admin/form-builder';
import { Loader2 } from 'lucide-react';
import { FormSection, FormField } from '@/components/form-builder/types';

export default function EditFormTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const templateId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { initTemplate, sections, fields } = useFormBuilderStore();
  
  useEffect(() => {
    async function loadTemplate() {
      if (templateId === 'new') {
        initTemplate();
        setIsLoading(false);
        return;
      }
      
      try {
        // Load template with sections and fields
        const { data: template, error: templateError } = await supabase
          .from('form_templates')
          .select(`
            *,
            form_sections (
              *,
              form_fields (*)
            ),
            form_workflows (*)
          `)
          .eq('id', templateId)
          .single();
        
        if (templateError) throw templateError;
        if (!template) throw new Error('Template not found');
        
        // Initialize store with loaded data
        const store = useFormBuilderStore.getState();
        
        store.initTemplate(template);
        
        // Add sections and fields
        const sortedSections = (template.form_sections || [])
          .sort((a: FormSection, b: FormSection) => a.order_index - b.order_index);
        
        for (const section of sortedSections) {
          const sectionId = store.addSection({
            ...section,
            id: section.id, // Preserve existing ID
          });
          
          // Override with original ID
          useFormBuilderStore.setState((state) => {
            const newSections = state.sections.map(s => 
              s.order_index === section.order_index ? { ...s, id: section.id } : s
            );
            return { ...state, sections: newSections };
          });
          
          const sortedFields = (section.form_fields || [])
            .sort((a: FormField, b: FormField) => a.order_index - b.order_index);
          
          for (const field of sortedFields) {
            store.addField(section.id, {
              ...field,
              id: field.id, // Preserve existing ID
            });
          }
        }
        
        // Load workflow if exists
        if (template.form_workflows?.[0]) {
          store.updateWorkflow(template.form_workflows[0]);
        }
        
        // Mark as not dirty since we just loaded
        store.markSaved();
        
      } catch (err) {
        console.error('Failed to load template:', err);
        setError(err instanceof Error ? err.message : 'Failed to load template');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadTemplate();
  }, [templateId, supabase, initTemplate]);
  
  async function handleSave() {
    const store = useFormBuilderStore.getState();
    
    if (!store.validate()) {
      return;
    }
    
    store.setSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (!profile?.company_id) throw new Error('No company found');
      
      // Prepare template data
      const templateData = {
        ...store.template,
        company_id: profile.company_id,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      };
      
      let savedTemplateId = templateId;
      
      if (templateId === 'new') {
        // Create new template
        const { data: newTemplate, error: insertError } = await supabase
          .from('form_templates')
          .insert({
            ...templateData,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
        
        if (insertError) throw insertError;
        savedTemplateId = newTemplate.id;
      } else {
        // Update existing template
        const { error: updateError } = await supabase
          .from('form_templates')
          .update(templateData)
          .eq('id', templateId);
        
        if (updateError) throw updateError;
        
        // Delete existing sections and fields (cascade will handle fields)
        await supabase
          .from('form_sections')
          .delete()
          .eq('form_template_id', templateId);
      }
      
      // Save sections
      for (const section of store.sections) {
        const { data: savedSection, error: sectionError } = await supabase
          .from('form_sections')
          .insert({
            form_template_id: savedTemplateId,
            title: section.title,
            description: section.description,
            order_index: section.order_index,
            is_repeatable: section.is_repeatable,
            min_repeats: section.min_repeats,
            max_repeats: section.max_repeats,
            conditional_logic: section.conditional_logic,
          })
          .select()
          .single();
        
        if (sectionError) throw sectionError;
        
        // Save fields for this section
        const sectionFields = store.getSectionFields(section.id);
        
        if (sectionFields.length > 0) {
          const fieldsToInsert = sectionFields.map(field => ({
            form_section_id: savedSection.id,
            field_code: field.field_code,
            label: field.label,
            field_type: field.field_type,
            placeholder: field.placeholder,
            help_text: field.help_text,
            default_value: field.default_value,
            width: field.width,
            options: field.options,
            validation_rules: field.validation_rules,
            conditional_logic: field.conditional_logic,
            order_index: field.order_index,
          }));
          
          const { error: fieldsError } = await supabase
            .from('form_fields')
            .insert(fieldsToInsert);
          
          if (fieldsError) throw fieldsError;
        }
      }
      
      // Save workflow
      if (store.workflow) {
        // Delete existing workflow
        await supabase
          .from('form_workflows')
          .delete()
          .eq('form_template_id', savedTemplateId);
        
        // Insert new workflow
        const { error: workflowError } = await supabase
          .from('form_workflows')
          .insert({
            form_template_id: savedTemplateId,
            ...store.workflow,
          });
        
        if (workflowError) throw workflowError;
      }
      
      store.markSaved();
      
      // Redirect to the saved template if it was new
      if (templateId === 'new') {
        router.replace(`/admin/form-templates/${savedTemplateId}/edit`);
      }
      
    } catch (err) {
      console.error('Failed to save template:', err);
    } finally {
      store.setSaving(false);
    }
  }
  
  async function handlePublish() {
    const store = useFormBuilderStore.getState();
    
    if (!store.validate()) {
      return;
    }
    
    // First save
    await handleSave();
    
    // Then publish (set active and increment version)
    try {
      const { error } = await supabase
        .from('form_templates')
        .update({
          is_active: true,
          version: (store.template?.version || 0) + 1,
        })
        .eq('id', templateId);
      
      if (error) throw error;
      
      router.push('/admin/form-templates');
    } catch (err) {
      console.error('Failed to publish template:', err);
    }
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={() => router.push('/admin/form-templates')}
            className="text-primary underline"
          >
            Back to templates
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <FormBuilder
      onSave={handleSave}
      onPublish={handlePublish}
      onCancel={() => router.push('/admin/form-templates')}
    />
  );
}
