// Collaborators component - manage collaborators

import React, { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Collaborator } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export const Collaborators: React.FC = () => {
  const { collaborators, addCollaborator, updateCollaborator, deleteCollaborator } = useFinance();
  const [newCollaboratorName, setNewCollaboratorName] = useState('');
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);

  const handleAddCollaborator = async () => {
    if (newCollaboratorName.trim()) {
      await addCollaborator(newCollaboratorName.trim());
      setNewCollaboratorName('');
    }
  };

  const handleUpdateCollaborator = async () => {
    if (editingCollaborator && editingCollaborator.name.trim()) {
      await updateCollaborator(editingCollaborator.id, editingCollaborator.name.trim());
      setEditingCollaborator(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-medium">Colaboradores</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os colaboradores para o cálculo de comissões.
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Colaborador
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Colaborador</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nome
                </Label>
                <Input
                  id="name"
                  value={newCollaboratorName}
                  onChange={(e) => setNewCollaboratorName(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddCollaborator}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {collaborators.map((collaborator) => (
              <TableRow key={collaborator.id}>
                <TableCell>{collaborator.name}</TableCell>
                <TableCell className="text-right">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => setEditingCollaborator({ ...collaborator })}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar Colaborador</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="name-edit" className="text-right">
                            Nome
                          </Label>
                          <Input
                            id="name-edit"
                            value={editingCollaborator ? editingCollaborator.name : ''}
                            onChange={(e) =>
                              setEditingCollaborator(
                                editingCollaborator
                                  ? { ...editingCollaborator, name: e.target.value }
                                  : null
                              )
                            }
                            className="col-span-3"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleUpdateCollaborator}>Salvar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteCollaborator(collaborator.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
