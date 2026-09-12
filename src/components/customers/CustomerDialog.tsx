// CustomerDialog.tsx - Componente Oficial e Único do Sistema para Cadastro e Edição de Clientes (CRM & Preferências)

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFinance } from '@/contexts/FinanceContext';
import { Customer, CustomerPreferences } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  User, Phone, Mail, FileText, Building, MapPin, Loader2,
  Sparkles, CreditCard, Percent, Tag, Sliders, ShieldCheck, X
} from 'lucide-react';

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
  // Preferências e Condições Comerciais
  preferredPaymentMethod: 'cash',
  defaultDiscountPercent: 0,
  creditLimit: 0,
  preferredContactChannel: 'whatsapp' as 'whatsapp' | 'email' | 'phone',
  deliveryInstructions: '',
  tags: [] as string[],
  orderNotesDefault: '',
  allergiesOrRestrictions: '',
  bestContactTime: 'any' as 'any' | 'morning' | 'afternoon' | 'night',
};

const PREDEFINED_TAGS = ['VIP', 'Atacado', 'Varejo', 'Frequente', 'Corporativo', 'Restrição / Alergia', 'Indicação'];

export const CustomerDialog: React.FC<CustomerDialogProps> = ({
  open,
  onOpenChange,
  customer,
  onSuccess,
}) => {
  const { currentClient, customPaymentMethods = [], loadCustomers: reloadContextCustomers } = useFinance();
  const [activeTab, setActiveTab] = useState<'basic' | 'address' | 'preferences'>('basic');
  const [form, setForm] = useState(emptyForm);
  const [newTagInput, setNewTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setActiveTab('basic');
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
          preferredPaymentMethod: customer.preferredPaymentMethod ?? 'cash',
          defaultDiscountPercent: customer.defaultDiscountPercent ?? 0,
          creditLimit: customer.creditLimit ?? 0,
          preferredContactChannel: customer.preferredContactChannel ?? 'whatsapp',
          deliveryInstructions: customer.deliveryInstructions ?? '',
          tags: customer.tags ?? [],
          orderNotesDefault: customer.preferences?.orderNotesDefault ?? '',
          allergiesOrRestrictions: customer.preferences?.allergiesOrRestrictions ?? '',
          bestContactTime: customer.preferences?.bestContactTime ?? 'any',
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

  const handleAddTag = (tagToAdd: string) => {
    const cleanTag = tagToAdd.trim();
    if (!cleanTag) return;
    if (!form.tags.includes(cleanTag)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, cleanTag] }));
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tagToRemove) }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentClient || !validate()) return;

    setSaving(true);
    try {
      const preferencesObj: CustomerPreferences = {
        favoriteProductIds: customer?.preferences?.favoriteProductIds || [],
        orderNotesDefault: form.orderNotesDefault.trim() || undefined,
        allergiesOrRestrictions: form.allergiesOrRestrictions.trim() || undefined,
        bestContactTime: form.bestContactTime,
        enablePromotions: customer?.preferences?.enablePromotions ?? true,
      };

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
        preferred_payment_method: form.preferredPaymentMethod || 'cash',
        default_discount_percent: Number(form.defaultDiscountPercent) || 0,
        credit_limit: Number(form.creditLimit) || 0,
        preferred_contact_channel: form.preferredContactChannel,
        delivery_instructions: form.deliveryInstructions.trim() || null,
        tags: form.tags,
        preferences: preferencesObj,
        is_active: true,
      };

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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Cabeçalho */}
        <DialogHeader className="p-5 pb-3 border-b shrink-0 pr-12 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <User className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                {customer ? 'Editar Perfil do Cliente' : 'Novo Cliente'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {customer
                  ? 'Altere informações cadastrais, preferências de compra e condições comerciais.'
                  : 'Preencha os dados cadastrais e preferências de atendimento do cliente.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Formulário com Abas */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex flex-col flex-1 min-h-0">
            <div className="px-5 pt-3 border-b bg-muted/10 shrink-0">
              <TabsList className="grid grid-cols-3 h-9">
                <TabsTrigger value="basic" className="text-xs gap-1.5 font-medium">
                  <User className="h-3.5 w-3.5" />
                  Dados Básicos
                </TabsTrigger>
                <TabsTrigger value="address" className="text-xs gap-1.5 font-medium">
                  <MapPin className="h-3.5 w-3.5" />
                  Endereço & Entrega
                </TabsTrigger>
                <TabsTrigger value="preferences" className="text-xs gap-1.5 font-medium">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Preferências & CRM
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[58vh] scrollbar-thin">
              {/* ABA 1: DADOS BÁSICOS */}
              <TabsContent value="basic" className="mt-0 space-y-3.5">
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
                    <Label htmlFor="cust-bday" className="text-xs font-semibold">Data de Nascimento / Fundação</Label>
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

                {/* Email e Canal de Contato */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Canal Preferido de Contato</Label>
                    <Select
                      value={form.preferredContactChannel}
                      onValueChange={(val: any) => setForm((f) => ({ ...f, preferredContactChannel: val }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                        <SelectItem value="email">✉️ E-mail</SelectItem>
                        <SelectItem value="phone">📞 Ligação Telefônica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Observações Gerais */}
                <div className="space-y-1 pt-1">
                  <Label htmlFor="cust-notes" className="text-xs font-semibold">Observações Internas</Label>
                  <Textarea
                    id="cust-notes"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Histórico ou notas da equipe sobre o cliente..."
                    rows={2}
                    className="text-xs resize-none"
                  />
                </div>
              </TabsContent>

              {/* ABA 2: ENDEREÇO & ENTREGA */}
              <TabsContent value="address" className="mt-0 space-y-3.5">
                <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span>Endereço padrão para entregas, orçamentos, OS e emissão de notas.</span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
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

                <div className="grid grid-cols-3 gap-2.5">
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

                <div className="grid grid-cols-3 gap-2.5">
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

                {/* Instruções de Entrega / Ponto de Referência */}
                <div className="space-y-1 pt-1">
                  <Label htmlFor="cust-delivery-inst" className="text-xs font-semibold flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-primary" />
                    Ponto de Referência / Instruções de Entrega
                  </Label>
                  <Textarea
                    id="cust-delivery-inst"
                    value={form.deliveryInstructions}
                    onChange={(e) => setForm((f) => ({ ...f, deliveryInstructions: e.target.value }))}
                    placeholder="Ex: Apto 302 Bloco B - Deixar na portaria com Seu Antônio..."
                    rows={2}
                    className="text-xs resize-none"
                  />
                </div>
              </TabsContent>

              {/* ABA 3: PREFERÊNCIAS & CRM */}
              <TabsContent value="preferences" className="mt-0 space-y-4">
                {/* Tags / Segmentação do Cliente */}
                <div className="space-y-2 p-3 bg-muted/20 border rounded-lg">
                  <Label className="text-xs font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-primary" />
                      Tags & Segmentos
                    </span>
                    <span className="text-[10px] text-muted-foreground">Classifique para campanhas e atendimento</span>
                  </Label>

                  {/* Tags Atuais */}
                  <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                    {form.tags.length === 0 ? (
                      <span className="text-[11px] text-muted-foreground italic">Nenhuma tag atribuída.</span>
                    ) : (
                      form.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className={cn(
                            "text-xs gap-1 pl-2 pr-1 py-0.5",
                            tag === 'VIP' && "bg-amber-100 text-amber-900 border-amber-300 font-bold",
                            tag === 'Atacado' && "bg-purple-100 text-purple-900 border-purple-300 font-bold",
                            tag === 'Restrição / Alergia' && "bg-red-100 text-red-900 border-red-300 font-bold"
                          )}
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="text-muted-foreground hover:text-foreground rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>

                  {/* Sugestões Rápidas de Tags */}
                  <div className="flex flex-wrap items-center gap-1 pt-1 border-t">
                    <span className="text-[10px] text-muted-foreground mr-1">Sugestões:</span>
                    {PREDEFINED_TAGS.filter((pt) => !form.tags.includes(pt)).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleAddTag(tag)}
                        className="text-[10px] px-2 py-0.5 rounded-full border bg-card hover:bg-muted/70 text-foreground transition-colors"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>

                  {/* Criar Tag Personalizada */}
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      placeholder="Criar nova tag personalizada..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag(newTagInput);
                        }
                      }}
                      className="h-7 text-xs flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddTag(newTagInput)}
                      className="h-7 text-xs px-2.5"
                    >
                      Adicionar
                    </Button>
                  </div>
                </div>

                {/* Condições Comerciais Automáticas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold flex items-center gap-1">
                      <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                      Forma de Pagamento Preferida
                    </Label>
                    <Select
                      value={form.preferredPaymentMethod}
                      onValueChange={(val) => setForm((f) => ({ ...f, preferredPaymentMethod: val }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">💵 Dinheiro</SelectItem>
                        <SelectItem value="pix">⚡ PIX</SelectItem>
                        <SelectItem value="credit_card">💳 Cartão de Crédito</SelectItem>
                        <SelectItem value="debit_card">💳 Cartão de Débito</SelectItem>
                        <SelectItem value="boleto">📄 Boleto Bancário</SelectItem>
                        {customPaymentMethods.map((cm) => (
                          <SelectItem key={cm.id} value={cm.name}>
                            ⚙️ {cm.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold flex items-center gap-1">
                      <Percent className="h-3.5 w-3.5 text-blue-600" />
                      Desconto Padrão Automático (%)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={form.defaultDiscountPercent || ''}
                      onChange={(e) => setForm((f) => ({ ...f, defaultDiscountPercent: parseFloat(e.target.value) || 0 }))}
                      placeholder="0%"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                      Limite de Crédito / Faturamento (R$)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={10}
                      value={form.creditLimit || ''}
                      onChange={(e) => setForm((f) => ({ ...f, creditLimit: parseFloat(e.target.value) || 0 }))}
                      placeholder="R$ 0,00 (Sem limite configurado)"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Melhor Turno para Atendimento</Label>
                    <Select
                      value={form.bestContactTime}
                      onValueChange={(val: any) => setForm((f) => ({ ...f, bestContactTime: val }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Qualquer Horário Comercial</SelectItem>
                        <SelectItem value="morning">🌅 Manhã (08h às 12h)</SelectItem>
                        <SelectItem value="afternoon">☀️ Tarde (12h às 18h)</SelectItem>
                        <SelectItem value="night">🌙 Noite (Após as 18h)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Restrições & Customizações Fixas de Pedidos */}
                <div className="space-y-1">
                  <Label htmlFor="cust-restric" className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                    Restrições / Alergias / Exigências Técnicas
                  </Label>
                  <Input
                    id="cust-restric"
                    value={form.allergiesOrRestrictions}
                    onChange={(e) => setForm((f) => ({ ...f, allergiesOrRestrictions: e.target.value }))}
                    placeholder="Ex: Alérgico a camarão / Exige peças originais / Não aceita substituição"
                    className="h-8 text-xs"
                  />
                </div>

                {/* Observações Fixas para Pedidos no PDV */}
                <div className="space-y-1">
                  <Label htmlFor="cust-ordernotes" className="text-xs font-semibold">
                    Mensagem Padrão Fixada no Pedido (PDV / OS)
                  </Label>
                  <Textarea
                    id="cust-ordernotes"
                    value={form.orderNotesDefault}
                    onChange={(e) => setForm((f) => ({ ...f, orderNotesDefault: e.target.value }))}
                    placeholder="Ex: Cliente solicita envio de XML/PDF no email contabilidade@empresa.com..."
                    rows={2}
                    className="text-xs resize-none"
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>

          {/* Rodapé do Modal */}
          <DialogFooter className="p-4 border-t bg-muted/20 shrink-0 gap-2 flex items-center justify-between sm:justify-between">
            <div className="text-[11px] text-muted-foreground hidden sm:block">
              {activeTab === 'basic' && 'Passo 1: Identificação cadastral'}
              {activeTab === 'address' && 'Passo 2: Localização e entrega'}
              {activeTab === 'preferences' && 'Passo 3: Regras e preferências comerciais'}
            </div>

            <div className="flex items-center gap-2">
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
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
