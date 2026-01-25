'use client';

/**
 * Workflow Configuration
 * 
 * Configure form submission workflow: routing, notifications, tasks, approval.
 */

import { useFormBuilderStore } from '@/lib/stores/form-builder-store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';

const ROLES = [
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'safety_manager', label: 'Safety Manager' },
  { value: 'hr_manager', label: 'HR Manager' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'company_admin', label: 'Company Admin' },
  { value: 'owner', label: 'Owner' },
];

const COR_ELEMENTS = [
  'Element 2', 'Element 3', 'Element 4', 'Element 5', 'Element 6',
  'Element 7', 'Element 8', 'Element 9', 'Element 10', 'Element 11',
  'Element 12', 'Element 13', 'Element 14',
];

export function WorkflowConfig() {
  const { workflow, updateWorkflow } = useFormBuilderStore();
  const [newEmail, setNewEmail] = useState('');
  
  if (!workflow) return null;
  
  const addNotifyRole = (role: string) => {
    if (!workflow.notify_roles?.includes(role)) {
      updateWorkflow({
        notify_roles: [...(workflow.notify_roles || []), role]
      });
    }
  };
  
  const removeNotifyRole = (role: string) => {
    updateWorkflow({
      notify_roles: (workflow.notify_roles || []).filter(r => r !== role)
    });
  };
  
  const addNotifyEmail = () => {
    if (newEmail && !workflow.notify_emails?.includes(newEmail)) {
      updateWorkflow({
        notify_emails: [...(workflow.notify_emails || []), newEmail]
      });
      setNewEmail('');
    }
  };
  
  const removeNotifyEmail = (email: string) => {
    updateWorkflow({
      notify_emails: (workflow.notify_emails || []).filter(e => e !== email)
    });
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold">Workflow Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure what happens when the form is submitted
        </p>
      </div>
      
      <Separator />
      
      {/* Routing */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Routing</h4>
        
        <div className="space-y-2">
          <Label>Submit to Role</Label>
          <Select
            value={workflow.submit_to_role || ''}
            onValueChange={(value) => updateWorkflow({ submit_to_role: value || null })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None (direct submit)</SelectItem>
              {ROLES.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Forms will be routed to this role for review
          </p>
        </div>
      </div>
      
      <Separator />
      
      {/* Notifications */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Notifications</h4>
        
        <div className="space-y-2">
          <Label>Notify Roles</Label>
          <div className="flex flex-wrap gap-1 mb-2">
            {(workflow.notify_roles || []).map((role) => (
              <Badge key={role} variant="secondary" className="flex items-center gap-1">
                {ROLES.find(r => r.value === role)?.label || role}
                <button onClick={() => removeNotifyRole(role)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <Select onValueChange={addNotifyRole}>
            <SelectTrigger>
              <SelectValue placeholder="Add role to notify" />
            </SelectTrigger>
            <SelectContent>
              {ROLES.filter(r => !workflow.notify_roles?.includes(r.value)).map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Notify Emails</Label>
          <div className="flex flex-wrap gap-1 mb-2">
            {(workflow.notify_emails || []).map((email) => (
              <Badge key={email} variant="secondary" className="flex items-center gap-1">
                {email}
                <button onClick={() => removeNotifyEmail(email)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="email@example.com"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNotifyEmail())}
            />
            <Button variant="outline" size="icon" onClick={addNotifyEmail}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <Separator />
      
      {/* Task Creation */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium">Create Task</h4>
            <p className="text-xs text-muted-foreground">
              Auto-create a follow-up task
            </p>
          </div>
          <Switch
            checked={workflow.creates_task || false}
            onCheckedChange={(checked) => updateWorkflow({ creates_task: checked })}
          />
        </div>
        
        {workflow.creates_task && (
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label>Assign To Role</Label>
              <Select
                value={workflow.task_template?.assigned_to_role || 'supervisor'}
                onValueChange={(value) => updateWorkflow({
                  task_template: { ...(workflow.task_template || { title: '', due_days: 1, priority: 'medium' }), assigned_to_role: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Due In (days)</Label>
              <Input
                type="number"
                value={workflow.task_template?.due_days || 1}
                onChange={(e) => updateWorkflow({
                  task_template: { ...(workflow.task_template || { title: '', assigned_to_role: 'supervisor', priority: 'medium' }), due_days: parseInt(e.target.value) || 1 }
                })}
                min={1}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={workflow.task_template?.priority || 'medium'}
                onValueChange={(value) => updateWorkflow({
                  task_template: { ...(workflow.task_template || { title: '', assigned_to_role: 'supervisor', due_days: 1 }), priority: value as 'low' | 'medium' | 'high' }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
      
      <Separator />
      
      {/* Approval */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium">Requires Approval</h4>
            <p className="text-xs text-muted-foreground">
              Form needs sign-off before completion
            </p>
          </div>
          <Switch
            checked={workflow.requires_approval || false}
            onCheckedChange={(checked) => updateWorkflow({ requires_approval: checked })}
          />
        </div>
      </div>
      
      <Separator />
      
      {/* Evidence */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium">Auto-Create Evidence</h4>
            <p className="text-xs text-muted-foreground">
              Automatically link to audit evidence
            </p>
          </div>
          <Switch
            checked={workflow.auto_create_evidence || false}
            onCheckedChange={(checked) => updateWorkflow({ auto_create_evidence: checked })}
          />
        </div>
        
        {workflow.auto_create_evidence && (
          <div className="space-y-2">
            <Label>Evidence for Element</Label>
            <Select
              value={workflow.evidence_audit_element || ''}
              onValueChange={(value) => updateWorkflow({ evidence_audit_element: value || null })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select COR element" />
              </SelectTrigger>
              <SelectContent>
                {COR_ELEMENTS.map((el) => (
                  <SelectItem key={el} value={el}>
                    {el}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      
      <Separator />
      
      {/* Sync Priority */}
      <div className="space-y-2">
        <Label>Sync Priority</Label>
        <Select
          value={String(workflow.sync_priority || 3)}
          onValueChange={(value) => updateWorkflow({ sync_priority: parseInt(value) })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 - Highest (sync immediately)</SelectItem>
            <SelectItem value="2">2 - High</SelectItem>
            <SelectItem value="3">3 - Normal</SelectItem>
            <SelectItem value="4">4 - Low</SelectItem>
            <SelectItem value="5">5 - Lowest (sync when convenient)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Higher priority forms sync first when coming back online
        </p>
      </div>
    </div>
  );
}

export default WorkflowConfig;
