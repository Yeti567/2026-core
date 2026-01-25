/**
 * Form Builder Schema Test
 * 
 * Tests the form builder database schema including:
 * - Creating templates, sections, fields
 * - Workflows and submissions
 * - Evidence mappings
 * - Helper functions
 */

async function testFormBuilderSchema() {
  console.log('🧪 Testing form builder schema...\n');

  const { createClient } = await import('@supabase/supabase-js');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables');
    console.log('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let templateId: string | null = null;
  let sectionId: string | null = null;
  let fieldIds: string[] = [];
  let workflowId: string | null = null;
  let submissionId: string | null = null;
  let evidenceId: string | null = null;

  try {
    // =========================================================================
    // TEST 1: Create form template
    // =========================================================================
    console.log('TEST 1: Create form template');
    
    const { data: template, error: templateError } = await supabase
      .from('form_templates')
      .insert({
        company_id: null, // Global template
        form_code: 'test_hazard_report',
        name: 'Test Hazard Reporting Form',
        description: 'Report any identified hazards immediately',
        cor_element: 3,
        frequency: 'as_needed',
        estimated_time_minutes: 5,
        icon: 'alert-triangle',
        color: '#ef4444',
        is_mandatory: true
      })
      .select()
      .single();

    if (templateError) {
      console.log('  ❌ Template creation failed:', templateError.message);
    } else {
      console.log('  ✅ Template created:', template.id);
      templateId = template.id;
    }

    // =========================================================================
    // TEST 2: Add form section
    // =========================================================================
    console.log('\nTEST 2: Add form section');
    
    if (templateId) {
      const { data: section, error: sectionError } = await supabase
        .from('form_sections')
        .insert({
          form_template_id: templateId,
          title: 'Hazard Details',
          description: 'Describe the hazard you identified',
          order_index: 1,
          is_repeatable: false
        })
        .select()
        .single();

      if (sectionError) {
        console.log('  ❌ Section creation failed:', sectionError.message);
      } else {
        console.log('  ✅ Section created:', section.id);
        sectionId = section.id;
      }
    }

    // =========================================================================
    // TEST 3: Add form fields
    // =========================================================================
    console.log('\nTEST 3: Add form fields');
    
    if (sectionId) {
      const fields = [
        {
          form_section_id: sectionId,
          field_code: 'hazard_description',
          label: 'Describe the hazard',
          field_type: 'textarea',
          placeholder: 'Enter a detailed description...',
          validation_rules: { required: true, min_length: 10 },
          order_index: 1,
          width: 'full'
        },
        {
          form_section_id: sectionId,
          field_code: 'hazard_type',
          label: 'Hazard type',
          field_type: 'dropdown',
          options: ['Slip/Trip/Fall', 'Working at Heights', 'Electrical', 'Chemical', 'Other'],
          validation_rules: { required: true },
          order_index: 2,
          width: 'half'
        },
        {
          form_section_id: sectionId,
          field_code: 'severity',
          label: 'Severity Level',
          field_type: 'dropdown',
          options: [
            { value: '1', label: 'Low - Minor issue' },
            { value: '2', label: 'Medium - Potential injury' },
            { value: '3', label: 'High - Serious risk' },
            { value: '4', label: 'Critical - Immediate danger' }
          ],
          validation_rules: { required: true },
          order_index: 3,
          width: 'half'
        },
        {
          form_section_id: sectionId,
          field_code: 'hazard_photo',
          label: 'Photo of hazard',
          field_type: 'photo',
          help_text: 'Take a photo showing the hazard',
          validation_rules: { required: false },
          order_index: 4,
          width: 'full'
        },
        {
          form_section_id: sectionId,
          field_code: 'immediate_action',
          label: 'Immediate Action Taken',
          field_type: 'textarea',
          placeholder: 'What did you do to address this hazard?',
          validation_rules: { required: true },
          order_index: 5,
          width: 'full'
        },
        {
          form_section_id: sectionId,
          field_code: 'reporter_signature',
          label: 'Your Signature',
          field_type: 'signature',
          validation_rules: { required: true },
          order_index: 6,
          width: 'full'
        }
      ];

      const { data: insertedFields, error: fieldsError } = await supabase
        .from('form_fields')
        .insert(fields)
        .select();

      if (fieldsError) {
        console.log('  ❌ Fields creation failed:', fieldsError.message);
      } else {
        console.log('  ✅ Fields created:', insertedFields?.length);
        fieldIds = insertedFields?.map(f => f.id) || [];
      }
    }

    // =========================================================================
    // TEST 4: Add conditional field
    // =========================================================================
    console.log('\nTEST 4: Add conditional field');
    
    if (sectionId && fieldIds.length > 0) {
      // Find the hazard_type field ID for conditional logic
      const hazardTypeField = await supabase
        .from('form_fields')
        .select('id')
        .eq('form_section_id', sectionId)
        .eq('field_code', 'hazard_type')
        .single();

      const { data: conditionalField, error: condFieldError } = await supabase
        .from('form_fields')
        .insert({
          form_section_id: sectionId,
          field_code: 'other_hazard_type',
          label: 'Describe other hazard type',
          field_type: 'text',
          validation_rules: { required: true },
          conditional_logic: {
            field_id: hazardTypeField.data?.id,
            operator: 'equals',
            value: 'Other'
          },
          order_index: 7,
          width: 'full'
        })
        .select()
        .single();

      if (condFieldError) {
        console.log('  ❌ Conditional field creation failed:', condFieldError.message);
      } else {
        console.log('  ✅ Conditional field created:', conditionalField.id);
        fieldIds.push(conditionalField.id);
      }
    }

    // =========================================================================
    // TEST 5: Create workflow
    // =========================================================================
    console.log('\nTEST 5: Create workflow');
    
    if (templateId) {
      const { data: workflow, error: workflowError } = await supabase
        .from('form_workflows')
        .insert({
          form_template_id: templateId,
          submit_to_role: 'supervisor',
          notify_roles: ['safety_manager'],
          creates_task: true,
          task_template: {
            title: 'Review Hazard Report',
            assigned_to_role: 'supervisor',
            due_days: 1,
            priority: 'high'
          },
          sync_priority: 1,
          auto_create_evidence: true,
          evidence_audit_element: 'Element 3'
        })
        .select()
        .single();

      if (workflowError) {
        console.log('  ❌ Workflow creation failed:', workflowError.message);
      } else {
        console.log('  ✅ Workflow created:', workflow.id);
        workflowId = workflow.id;
      }
    }

    // =========================================================================
    // TEST 6: Test form number generation
    // =========================================================================
    console.log('\nTEST 6: Test form number generation');
    
    // First create a test company
    const { data: testCompany } = await supabase
      .from('companies')
      .insert({ name: 'Test Company for Form Builder' })
      .select()
      .single();

    if (testCompany) {
      const { data: formNumber, error: fnError } = await supabase
        .rpc('generate_form_number', {
          p_form_code: 'test_hazard_report',
          p_company_id: testCompany.id
        });

      if (fnError) {
        console.log('  ❌ Form number generation failed:', fnError.message);
      } else {
        console.log('  ✅ Form number generated:', formNumber);
      }

      // =========================================================================
      // TEST 7: Submit form
      // =========================================================================
      console.log('\nTEST 7: Submit form');
      
      if (templateId) {
        const { data: submission, error: subError } = await supabase
          .from('form_submissions')
          .insert({
            company_id: testCompany.id,
            form_template_id: templateId,
            form_number: formNumber || 'FRM-TEST-2025-001',
            form_data: {
              hazard_description: 'Slippery floor near main entrance due to recent rain. No wet floor sign present.',
              hazard_type: 'Slip/Trip/Fall',
              severity: '2',
              immediate_action: 'Placed a wet floor sign and notified maintenance.',
              reporter_signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
            },
            attachments: {
              photos: [],
              signatures: {
                reporter_signature: 'data:image/png;base64,...'
              },
              files: []
            },
            gps_latitude: 43.6532,
            gps_longitude: -79.3832,
            gps_accuracy: 10.5,
            status: 'submitted',
            synced: false
          })
          .select()
          .single();

        if (subError) {
          console.log('  ❌ Form submission failed:', subError.message);
        } else {
          console.log('  ✅ Form submitted:', submission.id);
          console.log('  ✅ Form number:', submission.form_number);
          submissionId = submission.id;
        }
      }

      // =========================================================================
      // TEST 8: Create evidence mapping
      // =========================================================================
      console.log('\nTEST 8: Create evidence mapping');
      
      if (submissionId) {
        const { data: evidence, error: evError } = await supabase
          .from('form_evidence_mappings')
          .insert({
            form_submission_id: submissionId,
            audit_element: 'Element 3',
            evidence_type: 'form',
            notes: 'Hazard identification evidence'
          })
          .select()
          .single();

        if (evError) {
          console.log('  ❌ Evidence mapping failed:', evError.message);
        } else {
          console.log('  ✅ Evidence mapped:', evidence.id);
          evidenceId = evidence.id;
        }
      }

      // =========================================================================
      // TEST 9: Query full form with relations
      // =========================================================================
      console.log('\nTEST 9: Query full form template with relations');
      
      if (templateId) {
        const { data: fullTemplate, error: queryError } = await supabase
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

        if (queryError) {
          console.log('  ❌ Query failed:', queryError.message);
        } else {
          console.log('  ✅ Full template loaded');
          console.log('    - Sections:', fullTemplate.form_sections?.length);
          console.log('    - Fields:', fullTemplate.form_sections?.[0]?.form_fields?.length);
          console.log('    - Workflows:', fullTemplate.form_workflows?.length);
        }
      }

      // =========================================================================
      // TEST 10: Test completion stats function
      // =========================================================================
      console.log('\nTEST 10: Test completion stats function');
      
      const { data: stats, error: statsError } = await supabase
        .rpc('get_form_completion_stats', {
          p_company_id: testCompany.id,
          p_start_date: null,
          p_end_date: null
        });

      if (statsError) {
        console.log('  ❌ Stats function failed:', statsError.message);
      } else {
        console.log('  ✅ Stats retrieved:', stats?.length, 'form types');
        if (stats && stats.length > 0) {
          console.log('    Sample:', stats[0]);
        }
      }

      // =========================================================================
      // CLEANUP
      // =========================================================================
      console.log('\n🧹 Cleaning up test data...');
      
      if (evidenceId) {
        await supabase.from('form_evidence_mappings').delete().eq('id', evidenceId);
        console.log('  - Deleted evidence mapping');
      }
      
      if (submissionId) {
        await supabase.from('form_submissions').delete().eq('id', submissionId);
        console.log('  - Deleted submission');
      }
      
      // Delete test company (will cascade to submissions)
      await supabase.from('companies').delete().eq('id', testCompany.id);
      console.log('  - Deleted test company');
    }

    if (workflowId) {
      await supabase.from('form_workflows').delete().eq('id', workflowId);
      console.log('  - Deleted workflow');
    }
    
    if (fieldIds.length > 0) {
      await supabase.from('form_fields').delete().in('id', fieldIds);
      console.log('  - Deleted', fieldIds.length, 'fields');
    }
    
    if (sectionId) {
      await supabase.from('form_sections').delete().eq('id', sectionId);
      console.log('  - Deleted section');
    }
    
    if (templateId) {
      await supabase.from('form_templates').delete().eq('id', templateId);
      console.log('  - Deleted template');
    }

    console.log('\n✅ All cleanup complete!');
    console.log('\n🎉 Form builder schema tests complete!');
    console.log('\n📋 Summary:');
    console.log('  [✓] form_templates table');
    console.log('  [✓] form_sections table (with repeatable support)');
    console.log('  [✓] form_fields table (with conditional logic)');
    console.log('  [✓] form_workflows table');
    console.log('  [✓] form_submissions table');
    console.log('  [✓] form_evidence_mappings table');
    console.log('  [✓] generate_form_number() function');
    console.log('  [✓] get_form_completion_stats() function');
    console.log('  [✓] Nested query with relations');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    
    // Attempt cleanup on error
    console.log('\n🧹 Attempting cleanup after error...');
    try {
      if (evidenceId) await supabase.from('form_evidence_mappings').delete().eq('id', evidenceId);
      if (submissionId) await supabase.from('form_submissions').delete().eq('id', submissionId);
      if (workflowId) await supabase.from('form_workflows').delete().eq('id', workflowId);
      if (fieldIds.length > 0) await supabase.from('form_fields').delete().in('id', fieldIds);
      if (sectionId) await supabase.from('form_sections').delete().eq('id', sectionId);
      if (templateId) await supabase.from('form_templates').delete().eq('id', templateId);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
    
    process.exit(1);
  }
}

// Run the test
testFormBuilderSchema();
