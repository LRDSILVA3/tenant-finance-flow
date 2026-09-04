import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFinance } from '@/contexts/FinanceContext';
import { MoneyInput } from '@/components/ui/money-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Wrench, Loader2 } from 'lucide-react';

export interface ServiceTypeDialogItem {
  id?: string;
  name: string;
  duration_minutes?: number;
  durationMinutes?: number;
  price: number;
}

interface ServiceTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceType?: ServiceTypeDialogItem | null;
  onSuccess?: () => void;
}

export const ServiceTypeDialog: React.FC<ServiceTypeDialogProps> = ({
  open,
  onOpenChange,
  serviceType,
  onSuccess,
}) => {
  const { currentClient } = useFinance();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    durationMinutes: 60,
    price: 0,
  });

  useEffect(() => {
    if (serviceType) {
      setForm({
        name: serviceType.name || '',
        durationMinutes: serviceType.durationMinutes ?? serviceType.duration_minutes ?? 60,
        price: Number(serviceType.price || 0),
      });
    } else {
      setForm({
        name: '',
        durationMinutes: 60,
        price: 0,
      });
    }
  }, [serviceType, open]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient || !form.name.trim()) {
      toast({ title: 'Nome obrigatório', description: 'Informe o nome do serviço.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        client_id: currentClient.id,
        name: form.name.trim(),
        duration_minutes: form.durationMinutes,
        price: form.price,
        is_active: true,
      };

      if (serviceType?.id) {
        const { error } = await supabase
          .from('service_types')
          .update(payload)
          .eq('id', serviceType.id);

        if (error) throw error;
        toast({ title: 'Tipo de serviço atualizado!' });
      } else {
        const { error } = await supabase
          .from('service_types')
          .insert(payload);

        if (error) throw error;
        toast({ title: 'Tipo de serviço criado com sucesso!' });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Erro ao salvar tipo de serviço',
        description: err.message || 'Erro desconhecido ao salvar serviço.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSave}>
          <DialogHeader className="pr-10">
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-indigo-600" />
              {serviceType?.id ? 'Editar Tipo de Serviço' : 'Novo Tipo de Serviço'}
            </DialogTitle>
            <DialogDescription>
              Configure nome, duração e preço padrão para agilizar os agendamentos e vendas no balcão.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="st-name">Nome do Serviço *</Label>
              <Input
                id="st-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Corte de cabelo, Troca de óleo..."
                required
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Duração (min)</Label>
                <Input
                  type="number"
                  min={5}
                  value={form.durationMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, durationMinutes: parseInt(e.target.value) || 60 }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Preço (R$)</Label>
                <MoneyInput
                  value={form.price}
                  onChange={(v) => setForm((f) => ({ ...f, price: v }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !form.name.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
