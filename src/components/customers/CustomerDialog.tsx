// CustomerDialog.tsx - Componente Oficial e Único do Sistema para Cadastro e Edição de Clientes (CRM)

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFinance } from '@/contexts/FinanceContext';
import { Customer } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { User, UserPlus, Phone, Mail, FileText, Building, MapPin, Loader2 } from 'lucide-react';

export interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSuccess?: (savedCustomer?: Customer) => void;
}

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  document: '',
  personType: 'individual' as 'individual' | 'legal',
  birthDate: '',
  cep: '',
  street: '',
  number: '',
  neighborhood: '',
  city: '',
  state: '',
  notes: '',
};

export const CustomerDialog: React.FC<CustomerDialogProps> = ({
  open,
  onOpenChange,
  customer,
  onSuccess,
}) => {
  const { currentClient, loadCustomers: reloadContextCustomers } = useFinance();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (customer) {
        setForm({
          name: customer.name ?? '',
          phone: customer.phone ?? '',
          email: customer.email ?? '',
          document: customer.document ?? '',
          personType: customer.personType ?? 'individual',
          birthDate: customer.birthDate ?? '',
          cep: customer.cep ?? '',
          street: customer.street ?? '',
          number: customer.number ?? '',
          neighborhood: customer.neighborhood ?? '',
          city: customer.city ?? '',
          state: customer.state ?? '',
          notes: customer.notes ?? '',
        });
      } else {
        setForm(emptyForm);
      }
      setErrors({});
    }
  }, [open, customer]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Nome é obrigatório.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Email inválido.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentClient || !validate()) return;

    setSaving(true);
    try {
      const payload = {
        client_id: currentClient.id,
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        document: form.document.trim() || null,
        person_type: form.personType,
        birth_date: form.birthDate || null,
        cep: form.cep.trim() || null,
        street: form.street.trim() || null,
        number: form.number.trim() || null,
        neighborhood: form.neighborhood.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        notes: form.notes.trim() || null,
        is_active: true,
      };

      let savedData: Customer | undefined;

      if (customer?.id) {
        const { error } = await supabase
          .from('customers')
          .update(payload)
          .eq('id', customer.id);

        if (error) throw error;
        toast({ title: 'Cliente atualizado com sucesso!' });
      } else {
        const { error } = await supabase
          .from('customers')
          .insert(payload);

        if (error) throw error;
        toast({ title: 'Cliente cadastrado com sucesso!' });
      }

      onOpenChange(false);
      if (currentClient) {
        reloadContextCustomers(currentClient.id);
      }
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar cliente',
        description: err.message || 'Erro ao processar os dados.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Cabeçalho com padding-right seguro para o botão X */}
        <DialogHeader className="p-5 pb-3 border-b shrink-0 pr-12">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                {customer ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {customer
                  ? 'Altere as informações cadastrais do cliente.'
                  : 'Preencha os dados abaixo para cadastrar um novo cliente.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Formulário com rolagem */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-3.5 max-h-[60vh] scrollbar-thin">
            {/* Nome */}
            <div className="space-y-1">
              <Label htmlFor="cust-name" className={cn(errors.name && 'text-destructive')}>
                Nome *
              </Label>
              <Input
                id="cust-name"
                value={form.name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }));
                  setErrors((er) => ({ ...er, name: '' }));
                }}
                className={cn('h-8 text-xs', errors.name && 'border-destructive')}
                placeholder="Ex: João da Silva / Silva & Santos Ltda"
                autoFocus
              />
              {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
            </div>

            {/* Tipo de Pessoa e Nascimento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cust-ptype" className="text-xs font-semibold">Tipo de Pessoa</Label>
                <Select
                  value={form.personType}
                  onValueChange={(val) => setForm((f) => ({ ...f, personType: val as 'individual' | 'legal' }))}
                >
                  <SelectTrigger id="cust-ptype" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Pessoa Física (PF)</SelectItem>
                    <SelectItem value="legal">Pessoa Jurídica (PJ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="cust-bday" className="text-xs font-semibold">Data de Nascimento</Label>
                <Input
                  id="cust-bday"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Documento e Telefone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cust-doc" className="text-xs font-semibold">
                  {form.personType === 'legal' ? 'CNPJ' : 'CPF'}
                </Label>
                <Input
                  id="cust-doc"
                  value={form.document}
                  onChange={(e) => setForm((f) => ({ ...f, document: e.target.value }))}
                  placeholder={form.personType === 'legal' ? '00.000.000/0000-00' : '000.000.000-00'}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cust-phone" className="text-xs font-semibold">Telefone / WhatsApp</Label>
                <Input
                  id="cust-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <Label htmlFor="cust-email" className={cn('text-xs font-semibold', errors.email && 'text-destructive')}>
                Email
              </Label>
              <Input
                id="cust-email"
                type="email"
                value={form.email}
                onChange={(e) => {
                  setForm((f) => ({ ...f, email: e.target.value }));
                  setErrors((er) => ({ ...er, email: '' }));
                }}
                className={cn('h-8 text-xs', errors.email && 'border-destructive')}
                placeholder="cliente@email.com"
              />
              {errors.email && <p className="text-[11px] text-destructive">{errors.email}</p>}
            </div>

            {/* Endereço Completo */}
            <div className="space-y-2.5 pt-2 border-t">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Endereço
              </Label>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1 col-span-1">
                  <Label htmlFor="cust-cep" className="text-xs">CEP</Label>
                  <Input
                    id="cust-cep"
                    value={form.cep}
                    onChange={(e) => setForm((f) => ({ ...f, cep: e.target.value }))}
                    placeholder="00000-000"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label htmlFor="cust-street" className="text-xs">Logradouro / Rua</Label>
                  <Input
                    id="cust-street"
                    value={form.street}
                    onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
                    placeholder="Av. Paulista"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1 col-span-1">
                  <Label htmlFor="cust-num" className="text-xs">Número</Label>
                  <Input
                    id="cust-num"
                    value={form.number}
                    onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                    placeholder="1000"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label htmlFor="cust-neigh" className="text-xs">Bairro</Label>
                  <Input
                    id="cust-neigh"
                    value={form.neighborhood}
                    onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))}
                    placeholder="Bela Vista"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1 col-span-2">
                  <Label htmlFor="cust-city" className="text-xs">Cidade</Label>
                  <Input
                    id="cust-city"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="São Paulo"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1 col-span-1">
                  <Label htmlFor="cust-state" className="text-xs">UF</Label>
                  <Input
                    id="cust-state"
                    value={form.state}
                    onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                    placeholder="SP"
                    maxLength={2}
                    className="h-8 text-xs uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-1 pt-1">
              <Label htmlFor="cust-notes" className="text-xs font-semibold">Observações / Preferências</Label>
              <Textarea
                id="cust-notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Observações internas sobre o cliente..."
                rows={2}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-muted/20 shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="text-xs h-8 bg-primary hover:bg-primary/90 font-semibold"
            >
              {saving ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Salvando...
                </span>
              ) : (
                customer ? 'Salvar Alterações' : 'Salvar Cliente'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
