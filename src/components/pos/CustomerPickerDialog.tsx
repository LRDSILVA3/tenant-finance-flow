import React, { useState, useMemo } from 'react';
import { Customer } from '@/types/finance';
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
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  User,
  UserPlus,
  Phone,
  FileText,
  Mail,
  Check,
  Building,
  Users,
  X,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useFinance } from '@/contexts/FinanceContext';

interface CustomerPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  selectedCustomerId: string;
  onSelectCustomer: (customerId: string) => void;
  onCustomerCreated?: (newCustomer: Customer) => void;
}

export const CustomerPickerDialog: React.FC<CustomerPickerDialogProps> = ({
  open,
  onOpenChange,
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onCustomerCreated,
}) => {
  const { currentClient } = useFinance();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'with_phone' | 'individual' | 'legal'>('all');
  
  // Quick Add Customer Inline Modal
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickDocument, setQuickDocument] = useState('');
  const [quickPersonType, setQuickPersonType] = useState<'individual' | 'legal'>('individual');
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Filter and Search Customers
  const filteredCustomers = useMemo(() => {
    const q = search.toLowerCase().trim();
    return customers.filter((c) => {
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.document && c.document.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (filterType === 'with_phone') return Boolean(c.phone && c.phone.trim().length > 0);
      if (filterType === 'individual') return c.personType === 'individual' || !c.personType;
      if (filterType === 'legal') return c.personType === 'legal';

      return true;
    });
  }, [customers, search, filterType]);

  const handleSelect = (id: string) => {
    onSelectCustomer(id);
    onOpenChange(false);
    setSearch('');
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) {
      toast({ title: 'Nome obrigatório', description: 'Informe o nome do cliente.', variant: 'destructive' });
      return;
    }
    if (!currentClient?.id) return;

    setSavingCustomer(true);
    try {
      const payload = {
        client_id: currentClient.id,
        name: quickName.trim(),
        phone: quickPhone.trim() || null,
        document: quickDocument.trim() || null,
        person_type: quickPersonType,
        is_active: true,
      };

      const { data, error } = await supabase
        .from('customers')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      const created: Customer = {
        id: data.id,
        clientId: data.client_id,
        name: data.name,
        phone: data.phone || undefined,
        document: data.document || undefined,
        personType: data.person_type || 'individual',
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      toast({
        title: 'Cliente cadastrado com sucesso! 🎉',
        description: `${created.name} foi adicionado e selecionado.`,
      });

      if (onCustomerCreated) {
        onCustomerCreated(created);
      }

      // Reset & Select
      setQuickName('');
      setQuickPhone('');
      setQuickDocument('');
      setIsQuickAddOpen(false);
      handleSelect(created.id);
    } catch (err: any) {
      toast({
        title: 'Erro ao cadastrar cliente',
        description: err.message || 'Falha ao salvar no banco.',
        variant: 'destructive',
      });
    } finally {
      setSavingCustomer(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          {/* Cabeçalho */}
          <DialogHeader className="p-4 pb-3 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold">Selecionar Cliente</DialogTitle>
                  <DialogDescription className="text-xs">
                    Busque por nome, CPF/CNPJ ou telefone para vincular à venda.
                  </DialogDescription>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setIsQuickAddOpen(true)}
                className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
              >
                <UserPlus className="h-3.5 w-3.5" />
                + Novo Cliente
              </Button>
            </div>

            {/* Barra de Busca e Filtros */}
            <div className="mt-3 space-y-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por nome, telefone, documento ou e-mail..."
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

              {/* Filtros Rápidos */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border',
                    filterType === 'all'
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-muted/40 hover:bg-muted text-muted-foreground border-transparent'
                  )}
                >
                  Todos ({customers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('with_phone')}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border',
                    filterType === 'with_phone'
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-muted/40 hover:bg-muted text-muted-foreground border-transparent'
                  )}
                >
                  📱 Com Telefone
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('individual')}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border',
                    filterType === 'individual'
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-muted/40 hover:bg-muted text-muted-foreground border-transparent'
                  )}
                >
                  👤 Pessoa Física (CPF)
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('legal')}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border',
                    filterType === 'legal'
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-muted/40 hover:bg-muted text-muted-foreground border-transparent'
                  )}
                >
                  🏢 Pessoa Jurídica (CNPJ)
                </button>
              </div>
            </div>
          </DialogHeader>

          {/* Opção Cliente Balcão Fixa no Topo */}
          <div className="p-3 pb-1 border-b bg-muted/10">
            <button
              type="button"
              onClick={() => handleSelect('none')}
              className={cn(
                'w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-all group',
                selectedCustomerId === 'none'
                  ? 'bg-primary/10 border-primary shadow-xs'
                  : 'bg-card hover:bg-muted/50 border-dashed border-border/80'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-xs group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                  ⚡
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">Cliente Balcão (Sem Cadastro)</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase">Padrão PDV</Badge>
                  </div>
                  <p className="text-[10.5px] text-muted-foreground">Venda rápida avulsa não identificada</p>
                </div>
              </div>

              {selectedCustomerId === 'none' ? (
                <Badge className="bg-primary text-primary-foreground text-xs gap-1">
                  <Check className="h-3 w-3" /> Selecionado
                </Badge>
              ) : (
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
                  Selecionar
                </Button>
              )}
            </button>
          </div>

          {/* Lista Rolável de Clientes */}
          <ScrollArea className="flex-1 p-3 min-h-[220px] max-h-[380px]">
            {filteredCustomers.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <User className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p className="text-xs font-medium text-muted-foreground">
                  Nenhum cliente encontrado para "{search}"
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setQuickName(search);
                    setIsQuickAddOpen(true);
                  }}
                  className="text-xs gap-1 mt-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Cadastrar "{search}"
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredCustomers.map((customer) => {
                  const isSelected = selectedCustomerId === customer.id;
                  const initials = customer.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => handleSelect(customer.id)}
                      className={cn(
                        'w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-all select-none',
                        isSelected
                          ? 'bg-primary/10 border-primary shadow-xs font-medium'
                          : 'bg-card hover:bg-muted/40 border-border hover:border-primary/40'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {customer.personType === 'legal' ? (
                            <Building className="h-4 w-4" />
                          ) : (
                            initials || <User className="h-4 w-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-foreground truncate">{customer.name}</span>
                            {customer.personType === 'legal' && (
                              <Badge variant="outline" className="text-[8.5px] px-1 py-0">PJ</Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[10.5px] text-muted-foreground">
                            {customer.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-emerald-600" />
                                {customer.phone}
                              </span>
                            )}
                            {customer.document && (
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3 text-indigo-600" />
                                {customer.document}
                              </span>
                            )}
                            {customer.email && (
                              <span className="flex items-center gap-1 truncate max-w-[150px]">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                {customer.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isSelected ? (
                          <Badge className="bg-primary text-primary-foreground text-xs gap-1">
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
              {filteredCustomers.length} de {customers.length} clientes exibidos
            </span>
            <Button size="sm" variant="outline" onClick={() => onOpenChange(false)} className="text-xs h-7">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Rápido de Cadastro de Cliente */}
      <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleQuickAdd} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-1.5">
                <UserPlus className="h-4 w-4 text-emerald-600" />
                Cadastrar Novo Cliente Rápido
              </DialogTitle>
              <DialogDescription className="text-xs">
                Preencha os dados básicos para incluir e selecionar este cliente imediatamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div>
                <Label className="text-xs font-semibold">Tipo de Pessoa</Label>
                <div className="flex gap-2 mt-1">
                  <Button
                    type="button"
                    variant={quickPersonType === 'individual' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 text-xs h-7"
                    onClick={() => setQuickPersonType('individual')}
                  >
                    Pessoa Física (CPF)
                  </Button>
                  <Button
                    type="button"
                    variant={quickPersonType === 'legal' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 text-xs h-7"
                    onClick={() => setQuickPersonType('legal')}
                  >
                    Pessoa Jurídica (CNPJ)
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Nome Completo / Razão Social *</Label>
                <Input
                  required
                  placeholder="Ex: João da Silva / Silva Mercantil"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  className="text-xs h-8 mt-1"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-semibold">WhatsApp / Telefone</Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={quickPhone}
                    onChange={(e) => setQuickPhone(e.target.value)}
                    className="text-xs h-8 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">
                    {quickPersonType === 'legal' ? 'CNPJ' : 'CPF'}
                  </Label>
                  <Input
                    placeholder={quickPersonType === 'legal' ? '00.000.000/0000-00' : '000.000.000-00'}
                    value={quickDocument}
                    onChange={(e) => setQuickDocument(e.target.value)}
                    className="text-xs h-8 mt-1"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => setIsQuickAddOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingCustomer}
                className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {savingCustomer ? 'Salvando...' : 'Salvar & Selecionar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
