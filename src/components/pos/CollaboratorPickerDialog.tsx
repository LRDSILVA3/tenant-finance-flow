import React, { useState, useMemo } from 'react';
import { Collaborator } from '@/contexts/FinanceContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  UserCheck,
  UserPlus,
  Check,
  X,
  Plus,
  Shield,
  Percent,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useFinance } from '@/contexts/FinanceContext';

interface CollaboratorPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaborators: Collaborator[];
  selectedCollaboratorId: string;
  onSelectCollaborator: (collaboratorId: string) => void;
}

export const CollaboratorPickerDialog: React.FC<CollaboratorPickerDialogProps> = ({
  open,
  onOpenChange,
  collaborators,
  selectedCollaboratorId,
  onSelectCollaborator,
}) => {
  const { addCollaborator } = useFinance();
  const [search, setSearch] = useState('');
  
  // Quick Add Collaborator
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filter Collaborators
  const filteredCollaborators = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return collaborators;
    return collaborators.filter((col) => col.name.toLowerCase().includes(q));
  }, [collaborators, search]);

  const handleSelect = (id: string) => {
    onSelectCollaborator(id);
    onOpenChange(false);
    setSearch('');
  };

  const handleCreateCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSaving(true);
    try {
      const created = await addCollaborator(newName.trim());
      if (created) {
        toast({
          title: 'Atendente adicionado com sucesso! 👏',
          description: `${newName.trim()} foi cadastrado e selecionado.`,
        });
        setNewName('');
        setIsAddingNew(false);
        handleSelect(created.id);
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao adicionar atendente',
        description: err.message || 'Falha ao salvar colaborador.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Cabeçalho com pr-12 para não sobrepor o botão X de fechar */}
        <DialogHeader className="p-4 pb-3 border-b bg-muted/20 pr-12">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold truncate">Selecionar Atendente / Vendedor</DialogTitle>
                <DialogDescription className="text-xs">
                  Vincule o colaborador responsável pela venda para comissionamento e relatórios.
                </DialogDescription>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAddingNew(true)}
              className="text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs shrink-0"
            >
              <UserPlus className="h-3.5 w-3.5" />
              + Novo Atendente
            </Button>
          </div>

          {/* Barra de Busca */}
          <div className="mt-3 relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Pesquisar atendente por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 text-xs h-9"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </DialogHeader>

        {/* Formulário Rápido de Inclusão de Colaborador */}
        {isAddingNew && (
          <form onSubmit={handleCreateCollaborator} className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 border-b flex gap-2 items-center animate-in fade-in slide-in-from-top-2">
            <Input
              required
              placeholder="Nome do novo colaborador..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="text-xs h-8 bg-background"
              autoFocus
            />
            <Button
              type="submit"
              size="sm"
              disabled={isSaving || !newName.trim()}
              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shrink-0"
            >
              {isSaving ? 'Salvando...' : 'Adicionar'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAddingNew(false);
                setNewName('');
              }}
              className="h-8 text-xs shrink-0"
            >
              Cancelar
            </Button>
          </form>
        )}

        {/* Opção Nenhum Atendente / Balcão */}
        <div className="p-3 pb-1 border-b bg-muted/10">
          <button
            type="button"
            onClick={() => handleSelect('none')}
            className={cn(
              'w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-all group',
              selectedCollaboratorId === 'none'
                ? 'bg-indigo-500/10 border-indigo-500 shadow-xs'
                : 'bg-card hover:bg-muted/50 border-dashed border-border/80'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-xs group-hover:bg-indigo-500/20 group-hover:text-indigo-600 transition-colors">
                ⚡
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground">Nenhum / Venda Balcão</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase">Sem Vendedor</Badge>
                </div>
                <p className="text-[10.5px] text-muted-foreground">Venda direta sem atribuição de comissão</p>
              </div>
            </div>

            {selectedCollaboratorId === 'none' ? (
              <Badge className="bg-indigo-600 text-white text-xs gap-1">
                <Check className="h-3 w-3" /> Selecionado
              </Badge>
            ) : (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
                Selecionar
              </Button>
            )}
          </button>
        </div>

        {/* Lista Rolável de Colaboradores */}
        <ScrollArea className="flex-1 p-3 min-h-[200px] max-h-[350px]">
          {filteredCollaborators.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <UserCheck className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p className="text-xs font-medium text-muted-foreground">
                Nenhum atendente cadastrado ou encontrado para "{search}"
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setNewName(search);
                  setIsAddingNew(true);
                }}
                className="text-xs gap-1 mt-1 border-indigo-500/30 text-indigo-600"
              >
                <Plus className="h-3.5 w-3.5" />
                Cadastrar "{search}"
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredCollaborators.map((col) => {
                const isSelected = selectedCollaboratorId === col.id;
                const initials = col.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => handleSelect(col.id)}
                    className={cn(
                      'w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-all select-none',
                      isSelected
                        ? 'bg-indigo-500/10 border-indigo-500 shadow-xs font-medium'
                        : 'bg-card hover:bg-muted/40 border-border hover:border-indigo-500/40'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="h-9 w-9 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {initials || <UserCheck className="h-4 w-4" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-foreground truncate">{col.name}</span>
                          {col.defaultCommissionPercentage !== undefined && col.defaultCommissionPercentage > 0 && (
                            <Badge variant="outline" className="text-[8.5px] px-1 py-0 gap-0.5 text-emerald-600 border-emerald-500/30">
                              <Percent className="h-2.5 w-2.5" />
                              {col.defaultCommissionPercentage}% Comis.
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-[10.5px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Shield className="h-3 w-3 text-muted-foreground" />
                            Atendente Ativo
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isSelected ? (
                        <Badge className="bg-indigo-600 text-white text-xs gap-1">
                          <Check className="h-3 w-3" /> Selecionado
                        </Badge>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
                          Selecionar
                        </Button>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Rodapé */}
        <DialogFooter className="p-3 border-t bg-muted/20 flex items-center justify-between sm:justify-between">
          <span className="text-[11px] text-muted-foreground">
            {filteredCollaborators.length} de {collaborators.length} atendentes
          </span>
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)} className="text-xs h-7">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
