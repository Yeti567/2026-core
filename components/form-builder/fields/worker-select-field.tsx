'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FieldWrapper } from './field-wrapper';
import { FormField, FieldValue, Worker } from '../types';
import { Search, User } from 'lucide-react';

interface WorkerSelectFieldProps {
  field: FormField;
  value: FieldValue;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  workers: Worker[];
}

export function WorkerSelectField({
  field,
  value,
  onChange,
  error,
  disabled,
  workers,
}: WorkerSelectFieldProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredWorkers = workers.filter((worker) => {
    const fullName = `${worker.first_name} ${worker.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });
  
  const selectedWorker = workers.find(w => w.id === value);
  
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
          <SelectValue placeholder={field.placeholder || 'Select a worker'}>
            {selectedWorker && (
              <span className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {selectedWorker.first_name} {selectedWorker.last_name}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search workers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-auto">
            {filteredWorkers.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No workers found
              </div>
            ) : (
              filteredWorkers.map((worker) => (
                <SelectItem key={worker.id} value={worker.id}>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div>{worker.first_name} {worker.last_name}</div>
                      {worker.position && (
                        <div className="text-xs text-muted-foreground">
                          {worker.position}
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

export default WorkerSelectField;
