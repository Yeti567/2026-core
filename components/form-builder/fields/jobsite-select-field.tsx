'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FieldWrapper } from './field-wrapper';
import { FormField, FieldValue, Jobsite } from '../types';
import { Search, MapPin } from 'lucide-react';

interface JobsiteSelectFieldProps {
  field: FormField;
  value: FieldValue;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  jobsites: Jobsite[];
}

export function JobsiteSelectField({
  field,
  value,
  onChange,
  error,
  disabled,
  jobsites,
}: JobsiteSelectFieldProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const activeJobsites = jobsites.filter(j => j.is_active !== false);
  
  const filteredJobsites = activeJobsites.filter((jobsite) => {
    const searchStr = `${jobsite.name} ${jobsite.address || ''}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });
  
  const selectedJobsite = jobsites.find(j => j.id === value);
  
  return (
    <FieldWrapper
      label={field.label}
      fieldCode={field.field_code}
      required={field.validation_rules?.required}
      helpText={field.help_text}
      error={error}
    >
      <Select
        value={String(value ?? '')}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger
          id={field.field_code}
          aria-invalid={!!error}
          className="w-full"
        >
          <SelectValue placeholder={field.placeholder || 'Select a jobsite'}>
            {selectedJobsite && (
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {selectedJobsite.name}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobsites..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-auto">
            {filteredJobsites.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No jobsites found
              </div>
            ) : (
              filteredJobsites.map((jobsite) => (
                <SelectItem key={jobsite.id} value={jobsite.id}>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div>{jobsite.name}</div>
                      {jobsite.address && (
                        <div className="text-xs text-muted-foreground">
                          {jobsite.address}
                        </div>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))
            )}
          </div>
        </SelectContent>
      </Select>
    </FieldWrapper>
  );
}

export default JobsiteSelectField;
