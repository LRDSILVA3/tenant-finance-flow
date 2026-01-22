// Searchable Select Component with Add New Option and Grouping

import React, { useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface OptionGroup {
  label: string;
  options: string[];
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options?: string[];
  groupedOptions?: OptionGroup[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  addNewLabel?: string;
  className?: string;
  disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options = [],
  groupedOptions,
  placeholder = 'Selecione...',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Nenhum resultado encontrado.',
  addNewLabel = 'Adicionar',
  className,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Get all options for filtering (from either flat or grouped)
  const allOptions = groupedOptions 
    ? groupedOptions.flatMap(g => g.options)
    : options;

  // Filter options based on search
  const searchLower = searchValue.toLowerCase();
  
  const filteredGroupedOptions = groupedOptions?.map(group => ({
    ...group,
    options: group.options.filter(opt => opt.toLowerCase().includes(searchLower))
  })).filter(group => group.options.length > 0);

  const filteredFlatOptions = options.filter(opt => 
    opt.toLowerCase().includes(searchLower)
  );

  // Check if search value is a new option
  const isNewOption = searchValue.trim() !== '' && 
    !allOptions.some(opt => opt.toLowerCase() === searchValue.trim().toLowerCase());

  const hasResults = groupedOptions 
    ? (filteredGroupedOptions && filteredGroupedOptions.length > 0)
    : filteredFlatOptions.length > 0;

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
    setSearchValue('');
  };

  const handleAddNew = () => {
    if (searchValue.trim()) {
      onChange(searchValue.trim());
      setOpen(false);
      setSearchValue('');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <span className="truncate">
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={searchPlaceholder} 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {!hasResults && !isNewOption && (
              <CommandEmpty className="py-2 px-3 text-sm text-muted-foreground">
                {emptyMessage}
              </CommandEmpty>
            )}
            
            {/* Add new option button */}
            {isNewOption && (
              <CommandGroup>
                <CommandItem
                  onSelect={handleAddNew}
                  className="cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {addNewLabel}: "{searchValue.trim()}"
                </CommandItem>
              </CommandGroup>
            )}

            {/* Grouped options */}
            {groupedOptions && filteredGroupedOptions?.map((group, index) => (
              <React.Fragment key={group.label}>
                {index > 0 && <CommandSeparator />}
                <CommandGroup heading={group.label}>
                  {group.options.map((option) => (
                    <CommandItem
                      key={option}
                      value={option}
                      onSelect={() => handleSelect(option)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </React.Fragment>
            ))}

            {/* Flat options (when not using groups) */}
            {!groupedOptions && filteredFlatOptions.length > 0 && (
              <CommandGroup>
                {filteredFlatOptions.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => handleSelect(option)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
