// ServiceOrders Component — Hub Principal de Gestão de Ordens de Serviço (OS)

import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { supabase } from '@/integrations/supabase/client';
import { ServiceOrder, ServiceOrderStatus, Customer, Collaborator } from '@/types/finance';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import {
  Wrench,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Printer,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  DollarSign,
  TrendingUp,
  MoreVertical,
  Layers,
  Download,
} from 'lucide-react';
import { ServiceOrderDialog } from './ServiceOrderDialog';
import { generateServiceOrderPdf } from './ServiceOrderPdf';

export const ServiceOrders: React.FC = () => {
  const { currentClient, collaborators } = useFinance();

  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [collaboratorFilter, setCollaboratorFilter] = useState<string>('all');

  // Modais
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedOS, setSelectedOS] = useState<ServiceOrder | null>(null);

  // Carrega Ordens de Serviço completas
  const loadServiceOrders = async () => {
    if (!currentClient) return;
    setLoading(true);
    try {
      const { data: osData, error: osError } = await supabase
        .from('service_orders')
        .select(`
          *,
          customer:customers(id, name, phone, email, document),
          collaborator:collaborators(id, name)
        `)
        .eq('client_id', currentClient.id)
        .order('created_at', { ascending: false });

      if (osError) throw osError;

      const osIds = (osData || []).map((o: any) => o.id);

      let servicesByOS: Record<string, any[]> = {};
      let productsByOS: Record<string, any[]> = {};

      if (osIds.length > 0) {
        // Busca Serviços da OS
        const { data: servData } = await supabase
          .from('service_order_services')
          .select('*')
          .in('service_order_id', osIds);

        (servData || []).forEach((s: any) => {
          if (!servicesByOS[s.service_order_id]) servicesByOS[s.service_order_id] = [];
          servicesByOS[s.service_order_id].push({
            id: s.id,
            serviceOrderId: s.service_order_id,
            serviceTypeId: s.service_type_id,
            collaboratorId: s.collaborator_id,
            name: s.name,
            quantity: Number(s.quantity),
            unitPrice: Number(s.unit_price),
            discountAmount: Number(s.discount_amount),
            totalPrice: Number(s.total_price),
            createdAt: new Date(s.created_at),
          });
        });

        // Busca Peças da OS
        const { data: prodData } = await supabase
          .from('service_order_products')
          .select(`
            *,
            product:products(name, sku)
          `)
          .in('service_order_id', osIds);

        (prodData || []).forEach((p: any) => {
          if (!productsByOS[p.service_order_id]) productsByOS[p.service_order_id] = [];
          productsByOS[p.service_order_id].push({
            id: p.id,
            serviceOrderId: p.service_order_id,
            productId: p.product_id,
            productName: p.product?.name,
            productSku: p.product?.sku,
            quantity: Number(p.quantity),
            unitPrice: Number(p.unit_price),
            costPrice: Number(p.cost_price),
            discountAmount: Number(p.discount_amount),
            totalPrice: Number(p.total_price),
            createdAt: new Date(p.created_at),
          });
        });
      }

      const formatted: ServiceOrder[] = (osData || []).map((o: any) => ({
        id: o.id,
        clientId: o.client_id,
        osNumber: o.os_number,
        title: o.title,
        customerId: o.customer_id,
        collaboratorId: o.collaborator_id,
        status: o.status as ServiceOrderStatus,
        equipmentInfo: o.equipment_info,
        reportedDefect: o.reported_defect,
        technicalDiagnosis: o.technical_diagnosis,
        scheduledAt: o.scheduled_at ? new Date(o.scheduled_at) : undefined,
        completedAt: o.completed_at ? new Date(o.completed_at) : undefined,
        warrantyTerms: o.warranty_terms,
        servicesTotal: Number(o.services_total),
        productsTotal: Number(o.products_total),
        discountAmount: Number(o.discount_amount),
        totalAmount: Number(o.total_amount),
        paymentMethod: o.payment_method,
        paymentStatus: o.payment_status,
        transactionId: o.transaction_id,
        notes: o.notes,
        services: servicesByOS[o.id] || [],
        products: productsByOS[o.id] || [],
        customer: o.customer ? {
          id: o.customer.id,
          clientId: o.client_id,
          name: o.customer.name,
          phone: o.customer.phone,
          email: o.customer.email,
          document: o.customer.document,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } : undefined,
        collaborator: o.collaborator ? {
          id: o.collaborator.id,
          userId: '',
          clientId: o.client_id,
          name: o.collaborator.name,
          createdAt: new Date(),
          updatedAt: new Date(),
        } : undefined,
        createdAt: new Date(o.created_at),
        updatedAt: new Date(o.updated_at),
      }));

      setServiceOrders(formatted);
    } catch (err) {
      console.error('Erro ao carregar Ordens de Serviço:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentClient) {
      loadServiceOrders();
    }
  }, [currentClient]);

  // Alterar Status Rápido da OS
  const handleQuickStatusChange = async (osId: string, newStatus: ServiceOrderStatus) => {
    try {
      const { error } = await supabase
        .from('service_orders')
        .update({
          status: newStatus,
          completed_at:
            newStatus === 'completed' || newStatus === 'invoiced' ? new Date().toISOString() : null,
        })
        .eq('id', osId);

      if (error) throw error;

      toast({
        title: 'Status atualizado com sucesso!',
        description: `A OS agora está como: ${newStatus.toUpperCase()}`,
      });
      loadServiceOrders();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao alterar status', variant: 'destructive' });
    }
  };

  // Excluir OS
  const handleDeleteOS = async (osId: string) => {
    if (!confirm('Deseja realmente excluir esta Ordem de Serviço?')) return;
    try {
      const { error } = await supabase.from('service_orders').delete().eq('id', osId);
      if (error) throw error;
      toast({ title: 'Ordem de Serviço excluída com sucesso!' });
      loadServiceOrders();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao excluir OS', variant: 'destructive' });
    }
  };

  // Métricas
  const totalCount = serviceOrders.length;
  const budgetCount = serviceOrders.filter((o) => o.status === 'budget').length;
  const inProgressCount = serviceOrders.filter(
    (o) => o.status === 'in_progress' || o.status === 'approved' || o.status === 'waiting_parts'
  ).length;
  const completedCount = serviceOrders.filter(
    (o) => o.status === 'completed' || o.status === 'invoiced'
  ).length;
  const totalBilledAmount = serviceOrders
    .filter((o) => o.status === 'completed' || o.status === 'invoiced')
    .reduce((acc, o) => acc + o.totalAmount, 0);

  // Filtros aplicados
  const filteredOrders = useMemo(() => {
    return serviceOrders.filter((os) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        os.osNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        os.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (os.equipmentInfo && os.equipmentInfo.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (os.customer?.name && os.customer.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || os.status === statusFilter;
      const matchesCollab = collaboratorFilter === 'all' || os.collaboratorId === collaboratorFilter;

      return matchesSearch && matchesStatus && matchesCollab;
    });
  }, [serviceOrders, searchQuery, statusFilter, collaboratorFilter]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            Ordens de Serviço (OS)
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestão de manutenção, serviços técnicos, mão de obra e consumo de peças do estoque.
          </p>
        </div>

        <Button
          onClick={() => {
            setSelectedOS(null);
            setIsDialogOpen(true);
          }}
          className="gap-1.5 shadow-sm text-xs font-semibold"
        >
          <Plus className="h-4 w-4" />
          Nova Ordem de Serviço
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total de OS</p>
              <p className="text-2xl font-bold text-foreground">{totalCount}</p>
            </div>
            <div className="p-2.5 bg-primary/10 rounded-full text-primary">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Orçamentos Pendentes</p>
              <p className="text-2xl font-bold text-amber-600">{budgetCount}</p>
            </div>
            <div className="p-2.5 bg-amber-100 rounded-full text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Em Andamento / Execução</p>
              <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
            </div>
            <div className="p-2.5 bg-blue-100 rounded-full text-blue-600">
              <Wrench className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Faturamento Concluído</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalBilledAmount)}</p>
            </div>
            <div className="p-2.5 bg-emerald-100 rounded-full text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <Card className="border-border">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, título, objeto ou cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs sm:text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="budget">Orçamento</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="waiting_parts">Aguardando Peças</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="invoiced">Faturado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={collaboratorFilter} onValueChange={setCollaboratorFilter}>
              <SelectTrigger className="h-9 text-xs w-44">
                <SelectValue placeholder="Técnico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Técnicos</SelectItem>
                {collaborators.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Ordens de Serviço */}
      <Card className="border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">OS</TableHead>
                <TableHead>Título / Equipamento</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Mão de Obra</TableHead>
                <TableHead className="text-right">Peças</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-muted-foreground text-xs">
                    Nenhuma Ordem de Serviço encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((os) => (
                  <TableRow key={os.id} className="hover:bg-muted/30">
                    <TableCell className="font-bold text-xs text-primary">#{os.osNumber}</TableCell>
                    <TableCell className="text-xs">
                      <div className="font-semibold text-foreground">{os.title}</div>
                      {os.equipmentInfo && (
                        <span className="text-[11px] text-muted-foreground block truncate max-w-xs">
                          {os.equipmentInfo}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {os.customer?.name || 'Cliente Balcão'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {os.collaborator?.name || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(new Date(os.createdAt))}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="outline-none">
                          <Badge
                            variant={
                              os.status === 'completed' || os.status === 'invoiced'
                                ? 'default'
                                : os.status === 'in_progress'
                                ? 'secondary'
                                : os.status === 'approved'
                                ? 'outline'
                                : 'outline'
                            }
                            className="cursor-pointer text-[10px] hover:opacity-80"
                          >
                            {os.status === 'budget' && 'Orçamento'}
                            {os.status === 'approved' && 'Aprovado'}
                            {os.status === 'in_progress' && 'Em Andamento'}
                            {os.status === 'waiting_parts' && 'Aguardando Peças'}
                            {os.status === 'completed' && 'Concluído'}
                            {os.status === 'invoiced' && 'Faturado'}
                            {os.status === 'cancelled' && 'Cancelado'}
                          </Badge>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="text-xs">
                          <DropdownMenuItem onClick={() => handleQuickStatusChange(os.id, 'budget')}>
                            Mudar para: Orçamento
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleQuickStatusChange(os.id, 'approved')}>
                            Mudar para: Aprovado
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleQuickStatusChange(os.id, 'in_progress')}>
                            Mudar para: Em Andamento
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleQuickStatusChange(os.id, 'waiting_parts')}>
                            Mudar para: Aguardando Peças
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleQuickStatusChange(os.id, 'completed')}>
                            Mudar para: Concluído
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleQuickStatusChange(os.id, 'invoiced')}>
                            Mudar para: Faturado
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleQuickStatusChange(os.id, 'cancelled')}
                            className="text-destructive"
                          >
                            Cancelar OS
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatCurrency(os.servicesTotal)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatCurrency(os.productsTotal)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-xs text-foreground">
                      {formatCurrency(os.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/10"
                          onClick={() => generateServiceOrderPdf(os, currentClient?.name || 'Previna Gestão')}
                          title="Baixar PDF Estilizado da OS"
                        >
                          <Download className="h-3.5 w-3.5" />
                          PDF
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => {
                            setSelectedOS(os);
                            setIsDialogOpen(true);
                          }}
                          title="Editar OS"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteOS(os.id)}
                          title="Excluir OS"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Editor de OS */}
      <ServiceOrderDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        serviceOrder={selectedOS}
        onSaved={loadServiceOrders}
      />
    </div>
  );
};
