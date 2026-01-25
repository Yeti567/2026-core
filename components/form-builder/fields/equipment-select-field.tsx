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
import { FormField, FieldValue, Equipment } from '../types';
import { Search, Wrench } from 'lucide-react';

interface EquipmentSelectFieldProps {
  field: FormField;
  value: FieldValue;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  equipment: Equipment[];
}

export function EquipmentSelectField({
  field,
  value,
  onChange,
  error,
  disabled,
  equipment,
}: EquipmentSelectFieldProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredEquipment = equipment.filter((item) => {
    const searchStr = `${item.name} ${item.type} ${item.serial_number || ''}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });
  
  const selectedEquipment = equipment.find(e => e.id === value);
  
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
          <SelectValue placeholder={field.placeholder || 'Select equipment'}>
            {selectedEquipment && (
              <span className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                {selectedEquipment.name}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search equipment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-auto">
            {filteredEquipment.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No equipment found
              </div>
            ) : (
              filteredEquipment.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div>{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.type}
                        {item.serial_number && ` • ${item.serial_number}`}
                      </div>
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

export default EquipmentSelectField;
