import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Truck,
  Plus,
  Search,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Loader2,
  X
} from 'lucide-react';

interface Supplier {
  id: string;
  clientId: string;
  name: string;
  contactInfo?: string;
}

const emptyForm = {
  name: '',
  contactInfo: '',
};

export const Suppliers: React.FC = () => {
  const { currentClient, loadSuppliers: reloadContextSuppliers } = useFinance();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadSuppliers = useCallback(async () => {
    if (!currentClient) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('client_id', currentClient.id)
        .order('name');

      if (!error && data) {
        setSuppliers(
          data.map((s: any) => ({
            id: s.id,
            clientId: s.client_id,
            name: s.name,
            contactInfo: s.contact_info || '',
          }))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentClient]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      return (
        s.name.toLowerCase().includes(query) ||
        (s.contactInfo && s.contactInfo.toLowerCase().includes(query))
      );
    });
  }, [suppliers, searchQuery]);

  const handleOpenCreate = () => {
    setSelectedSupplier(null);
    setForm(emptyForm);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setForm({
      name: supplier.name,
      contactInfo: supplier.contactInfo || '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenDelete = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient) return;

    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = 'Nome é obrigatório';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);

    try {
      if (selectedSupplier) {
        // Edit mode
        const { error } = await supabase
          .from('suppliers')
          .update({
            name: form.name.trim(),
            contact_info: form.contactInfo.trim() || null,
          })
          .eq('id', selectedSupplier.id);

        if (error) throw error;
        toast({ title: 'Fornecedor atualizado com sucesso!' });
      } else {
        // Create mode
        const { error } = await supabase
          .from('suppliers')
          .insert({
            client_id: currentClient.id,
            name: form.name.trim(),
            contact_info: form.contactInfo.trim() || null,
          });

        if (error) throw error;
        toast({ title: 'Fornecedor cadastrado com sucesso!' });
      }

      setIsModalOpen(false);
      loadSuppliers();
      if (currentClient.id) {
        reloadContextSuppliers(currentClient.id);
      }
    } catch (err) {
      console.error(err);
      toast({
        title: 'Erro ao salvar fornecedor',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSupplier || !currentClient) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', selectedSupplier.id);

      if (error) throw error;

      toast({ title: 'Fornecedor removido com sucesso!' });
      setIsDeleteOpen(false);
      loadSuppliers();
      if (currentClient.id) {
        reloadContextSuppliers(currentClient.id);
      }
    } catch (err) {
      console.error(err);
      toast({
        title: 'Erro ao remover fornecedor',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="page-title flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            Fornecedores
          </h2>
          <p className="page-subtitle">Gerencie os contatos de fornecedores e parceiros de abastecimento.</p>
        </div>
        <Button onClick={handleOpenCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Novo Fornecedor
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
        <div className="flex items-center gap-2 max-w-md w-full bg-muted/30 px-3 py-1.5 rounded-lg border focus-within:border-primary/50 transition-colors">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar fornecedor por nome ou contato..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-8 text-sm w-full"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchQuery('')}
              className="h-6 w-6 p-0 hover:bg-muted"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
        <div className="text-xs text-muted-foreground shrink-0">
          Total de {filteredSuppliers.length} fornecedores encontrados
        </div>
      </div>

      {/* Suppliers Table Card */}
      <Card className="border border-border/60 shadow-sm overflow-hidden bg-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground italic">
              Nenhum fornecedor encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Fornecedor</TableHead>
                    <TableHead>Informações de Contato / Observações</TableHead>
                    <TableHead className="text-right w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((s) => (
                    <TableRow key={s.id} className="hover:bg-muted/30">
                      <TableCell className="font-semibold text-foreground">
                        {s.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-lg truncate">
                        {s.contactInfo || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(s)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {s.name !== 'Fornecedor Padrão' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDelete(s)}
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:rounded-lg">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>
                {selectedSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </DialogTitle>
              <DialogDescription>
                Preencha as informações do fornecedor para salvar.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className={cn(errors.name && "text-destructive")}>
                  Nome do Fornecedor *
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, name: e.target.value }));
                    if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  placeholder="Ex: Fornecedora de Bebidas LTDA"
                  className={cn(errors.name && "border-destructive")}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactInfo">Informações de Contato / Observações</Label>
                <Textarea
                  id="contactInfo"
                  value={form.contactInfo}
                  onChange={(e) => setForm((prev) => ({ ...prev, contactInfo: e.target.value }))}
                  placeholder="Ex: Telefone: (11) 99999-9999 / Email: contato@fornecedor.com"
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Fornecedor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-destructive">Remover Fornecedor</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover <strong>{selectedSupplier?.name}</strong>?
              <br />
              <span className="text-xs text-muted-foreground mt-2 block">
                Produtos vinculados passarão a ter fornecedor nulo. Esta ação não pode ser desfeita.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? 'Removendo...' : 'Confirmar Remoção'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
