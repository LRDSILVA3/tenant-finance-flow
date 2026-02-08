// Collaborator Select Component with Add New Option

import React, { useState, useMemo } from 'react';
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
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Collaborator } from '@/contexts/FinanceContext';

interface CollaboratorSelectProps {
  value: string;
  onChange: (value: string) => void;
  collaborators: Collaborator[];
  onAddNew: (name: string) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
}

export const CollaboratorSelect: React.FC<CollaboratorSelectProps> = ({
  value,
  onChange,
  collaborators,
  onAddNew,
  placeholder = 'Selecione um colaborador',
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Get selected collaborator name
  const selectedCollaborator = collaborators.find(c => c.id === value);

  // Filter collaborators based on search
  const filteredCollaborators = useMemo(() => {
    const searchLower = searchValue.toLowerCase().trim();
    if (!searchLower) return collaborators;
    return collaborators.filter(c => 
      c.name.toLowerCase().includes(searchLower)
    );
  }, [collaborators, searchValue]);

  // Check if search value is a new collaborator
  const isNewCollaborator = useMemo(() => {
    const searchTrimmed = searchValue.trim();
    if (!searchTrimmed) return false;
    return !collaborators.some(c => 
      c.name.toLowerCase() === searchTrimmed.toLowerCase()
    );
  }, [collaborators, searchValue]);

  const handleSelect = (collaboratorId: string) => {
    onChange(collaboratorId);
    setOpen(false);
    setSearchValue('');
  };

  const handleAddNew = async () => {
    if (!searchValue.trim() || isAdding) return;
    
    setIsAdding(true);
    try {
      await onAddNew(searchValue.trim());
      // After adding, the collaborators list will be updated
      // We need to select the newly added one - it will be the last one with that name
      setSearchValue('');
      setOpen(false);
    } finally {
      setIsAdding(false);
    }
  };

  const handleClear = () => {
    onChange('');
    setOpen(false);
    setSearchValue('');
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
            !value && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedCollaborator?.name || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Buscar colaborador..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {filteredCollaborators.length === 0 && !isNewCollaborator && (
              <CommandEmpty className="py-2 px-3 text-sm text-muted-foreground">
                Nenhum colaborador encontrado.
              </CommandEmpty>
            )}
            
            {/* Add new collaborator option */}
            {isNewCollaborator && (
              <CommandGroup>
                <CommandItem
                  onSelect={handleAddNew}
                  className="cursor-pointer"
                  disabled={isAdding}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {isAdding ? 'Adicionando...' : `Adicionar: "${searchValue.trim()}"`}
                </CommandItem>
              </CommandGroup>
            )}

            {/* Clear option when there's a value */}
            {value && (
              <CommandGroup>
                <CommandItem
                  onSelect={handleClear}
                  className="cursor-pointer text-muted-foreground"
                >
                  Limpar seleção
                </CommandItem>
              </CommandGroup>
            )}

            {/* Existing collaborators */}
            {filteredCollaborators.length > 0 && (
              <CommandGroup heading="Colaboradores">
                {filteredCollaborators.map((collaborator) => (
                  <CommandItem
                    key={collaborator.id}
                    value={collaborator.id}
                    onSelect={() => handleSelect(collaborator.id)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === collaborator.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {collaborator.name}
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
