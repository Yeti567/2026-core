'use client';

/**
 * Forms Library Page (Worker View)
 * 
 * Shows all available forms that workers can fill out.
 * Groups forms by frequency and shows completion status.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Clock,
  FileText,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Loader2,
  Plus,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { FormTemplate } from '@/components/form-builder/types';
import { formatFrequency, formatEstimatedTime } from '@/components/form-builder/utils';

interface FormWithStatus extends FormTemplate {
  last_submission?: {
    submitted_at: string;
    status: string;
  };
  is_due?: boolean;
  days_until_due?: number;
}

export default function FormsPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [forms, setForms] = useState<FormWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  
  const loadForms = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Get user's company
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (!profile?.company_id) return;
      
      // Get active form templates for the company (or global)
      const { data: templates, error } = await supabase
        .from('form_templates')
        .select('*')
        .or(`company_id.eq.${profile.company_id},company_id.is.null`)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      
      // Get user's recent submissions for each form
      const formsWithStatus: FormWithStatus[] = await Promise.all(
        (templates || []).map(async (template) => {
          const { data: lastSub } = await supabase
            .from('form_submissions')
            .select('submitted_at, status')
            .eq('form_template_id', template.id)
            .eq('submitted_by', user.id)
            .order('submitted_at', { ascending: false })
            .limit(1)
            .single();
          
          // Calculate if form is due based on frequency
          let isDue = false;
          let daysUntilDue: number | undefined;
          
          if (lastSub?.submitted_at) {
            const lastSubmittedDate = new Date(lastSub.submitted_at);
            const now = new Date();
            const daysSinceSubmission = Math.floor(
              (now.getTime() - lastSubmittedDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            
            const frequencyDays: Record<string, number> = {
              daily: 1,
              weekly: 7,
              monthly: 30,
              quarterly: 90,
              annual: 365,
              per_shift: 1,
            };
            
            const requiredDays = frequencyDays[template.frequency];
            if (requiredDays) {
              daysUntilDue = requiredDays - daysSinceSubmission;
              isDue = daysUntilDue <= 0;
            }
          } else if (template.frequency !== 'as_needed') {
            // Never submitted - it's due
            isDue = true;
          }
          
          return {
            ...template,
            last_submission: lastSub || undefined,
            is_due: isDue,
            days_until_due: daysUntilDue,
          };
        })
      );
      
      setForms(formsWithStatus);
    } catch (err) {
      console.error('Failed to load forms:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadForms();
  }, [loadForms]);
  
  // Filter forms
  const filteredForms = forms.filter(form => {
    if (searchQuery && !form.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    switch (activeTab) {
      case 'due':
        return form.is_due;
      case 'mandatory':
        return form.is_mandatory;
      case 'recent':
        return !!form.last_submission;
      default:
        return true;
    }
  });
  
  // Group forms by category
  const dueForms = filteredForms.filter(f => f.is_due);
  const mandatoryForms = filteredForms.filter(f => f.is_mandatory && !f.is_due);
  const otherForms = filteredForms.filter(f => !f.is_mandatory && !f.is_due);
  
  // Get icon component
  const getIcon = (iconName: string) => {
    const name = iconName.replace(/-/g, '').replace(/^\w/, c => c.toUpperCase());
    const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;
    // Safe: name is derived from controlled iconName string (from form templates), accessing known LucideIcons library object with fallback
    // eslint-disable-next-line security/detect-object-injection
    return icons[name] || FileText;
  };
  
  const FormCard = ({ form }: { form: FormWithStatus }) => {
    const Icon = getIcon(form.icon);
    
    return (
      <Card
        className="group cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
        onClick={() => router.push(`/forms/${form.form_code}`)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div
                className="rounded-lg p-2.5 transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${form.color}20` }}
              >
                <Icon className="h-5 w-5" style={{ color: form.color }} />
              </div>
              <div>
                <CardTitle className="text-base group-hover:text-primary transition-colors">
                  {form.name}
                </CardTitle>
                {form.description && (
                  <CardDescription className="text-xs mt-0.5 line-clamp-2">
                    {form.description}
                  </CardDescription>
                )}
              </div>
            </div>
            {form.is_due && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Due
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2 mb-3">
            {form.is_mandatory && (
              <Badge variant="outline" className="text-xs">Required</Badge>
            )}
            {form.cor_element && (
              <Badge variant="secondary" className="text-xs">Element {form.cor_element}</Badge>
            )}
            <Badge variant="secondary" className="text-xs">{formatFrequency(form.frequency)}</Badge>
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatEstimatedTime(form.estimated_time_minutes)}
            </span>
            {form.last_submission ? (
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Last: {new Date(form.last_submission.submitted_at).toLocaleDateString()}
              </span>
            ) : (
              <span className="text-amber-600">Never submitted</span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Forms</h1>
          <p className="text-muted-foreground">
            Complete safety forms and documentation
          </p>
        </div>
        
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search forms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All Forms</TabsTrigger>
            <TabsTrigger value="due" className="relative">
              Due Now
              {dueForms.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center">
                  {dueForms.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="mandatory">Required</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredForms.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No forms found</h3>
              <p className="text-muted-foreground mt-2">
                {searchQuery
                  ? 'Try a different search term'
                  : 'No forms are available at this time'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Due Forms */}
            {activeTab === 'all' && dueForms.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Due Now ({dueForms.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dueForms.map(form => (
                    <FormCard key={form.id} form={form} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Mandatory Forms */}
            {activeTab === 'all' && mandatoryForms.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Required Forms</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mandatoryForms.map(form => (
                    <FormCard key={form.id} form={form} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Other Forms */}
            {activeTab === 'all' && otherForms.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Other Forms</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {otherForms.map(form => (
                    <FormCard key={form.id} form={form} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Tab-specific views */}
            {activeTab !== 'all' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredForms.map(form => (
                  <FormCard key={form.id} form={form} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
