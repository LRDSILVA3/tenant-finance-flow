import React, { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { CommissionSettlement, commissionSettlementService } from '@/services/commissionSettlementService';
import { CommissionSettlementDialog } from '@/components/collaborators/CommissionSettlementDialog';
import { CommissionReceiptDialog } from '@/components/collaborators/CommissionReceiptDialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  DollarSign,
  CheckCircle2,
  Clock,
  Printer,
  FileCheck,
  Search,
  Filter,
  History,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';

interface CommissionManagerProps {
  startDate?: Date;
  endDate?: Date;
}

export const CommissionManager: React.FC<CommissionManagerProps> = ({
  startDate: propStartDate,
  endDate: propEndDate,
}) => {
  const { currentClient, transactions, collaborators, customers, formatCurrency } = useFinance();

  // Internal state
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'settled'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'entries' | 'history'>('entries');

  // Dialog states
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [activeSettlement, setActiveSettlement] = useState<CommissionSettlement | null>(null);

  // Settlements from local storage
  const [settlements, setSettlements] = useState<CommissionSettlement[]>(() =>
    currentClient?.id ? commissionSettlementService.getSettlements(currentClient.id) : []
  );

  const refreshSettlements = () => {
    if (currentClient?.id) {
      setSettlements(commissionSettlementService.getSettlements(currentClient.id));
    }
  };

  const settledTxIds = useMemo(() => {
    const ids = new Set<string>();
    settlements.forEach((s) => {
      s.transactionIds.forEach((txId) => ids.add(txId));
    });
    return ids;
  }, [settlements]);

  // Extract all commission entries from transactions
  const allCommissionEntries = useMemo(() => {
    const entries: {
      id: string;
      transactionId: string;
      date: Date;
      collaboratorId: string;
      collaboratorName: string;
      amount: number;
      commissionAmount: number;
      reference: string;
      description: string;
      customerName?: string;
      isSettled: boolean;
      settlementId?: string;
    }[] = [];

    transactions.forEach((tx) => {
      if (tx.type !== 'income') return;

      // Period filter
      if (propStartDate && new Date(tx.date) < propStartDate) return;
      if (propEndDate && new Date(tx.date) > propEndDate) return;

      const customer = tx.customerId ? customers.find((c) => c.id === tx.customerId) : undefined;

      // Multi-commission format
      if (tx.commissions && tx.commissions.length > 0) {
        tx.commissions.forEach((comm, idx) => {
          const col = collaborators.find((c) => c.id === comm.collaboratorId);
          const isSettled = settledTxIds.has(tx.id);
          const relatedSettlement = isSettled
            ? settlements.find((s) => s.transactionIds.includes(tx.id))
            : undefined;

          entries.push({
            id: `${tx.id}_${comm.collaboratorId}_${idx}`,
            transactionId: tx.id,
            date: new Date(tx.date),
            collaboratorId: comm.collaboratorId,
            collaboratorName: col?.name || 'Desconhecido',
            amount: tx.amount,
            commissionAmount: comm.commissionAmount,
            reference: tx.reference || `#${tx.id.slice(0, 6)}`,
            description: tx.description,
            customerName: customer?.name,
            isSettled,
            settlementId: relatedSettlement?.id,
          });
        });
      }
      // Single collaborator commission format (legacy)
      else if (tx.collaboratorId && (tx.commissionAmount || 0) > 0) {
        const col = collaborators.find((c) => c.id === tx.collaboratorId);
        const isSettled = settledTxIds.has(tx.id);
        const relatedSettlement = isSettled
          ? settlements.find((s) => s.transactionIds.includes(tx.id))
          : undefined;

        entries.push({
          id: `${tx.id}_${tx.collaboratorId}`,
          transactionId: tx.id,
          date: new Date(tx.date),
          collaboratorId: tx.collaboratorId,
          collaboratorName: col?.name || 'Desconhecido',
          amount: tx.amount,
          commissionAmount: tx.commissionAmount || 0,
          reference: tx.reference || `#${tx.id.slice(0, 6)}`,
          description: tx.description,
          customerName: customer?.name,
          isSettled,
          settlementId: relatedSettlement?.id,
        });
      }
    });

    return entries.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [transactions, collaborators, customers, propStartDate, propEndDate, settledTxIds, settlements]);

  // Filtered Entries
  const filteredEntries = useMemo(() => {
    return allCommissionEntries.filter((entry) => {
      if (selectedCollaboratorId !== 'all' && entry.collaboratorId !== selectedCollaboratorId) {
        return false;
      }
      if (statusFilter === 'pending' && entry.isSettled) return false;
      if (statusFilter === 'settled' && !entry.isSettled) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesCollab = entry.collaboratorName.toLowerCase().includes(q);
        const matchesRef = entry.reference.toLowerCase().includes(q);
        const matchesDesc = entry.description.toLowerCase().includes(q);
        const matchesCust = entry.customerName?.toLowerCase().includes(q);
        if (!matchesCollab && !matchesRef && !matchesDesc && !matchesCust) return false;
      }

      return true;
    });
  }, [allCommissionEntries, selectedCollaboratorId, statusFilter, searchTerm]);

  // KPIs
  const kpis = useMemo(() => {
    const list = selectedCollaboratorId === 'all'
      ? allCommissionEntries
      : allCommissionEntries.filter((e) => e.collaboratorId === selectedCollaboratorId);

    const totalSales = list.reduce((acc, e) => acc + e.amount, 0);
    const totalCommissions = list.reduce((acc, e) => acc + e.commissionAmount, 0);
    const settledCommissions = list
      .filter((e) => e.isSettled)
      .reduce((acc, e) => acc + e.commissionAmount, 0);
    const pendingCommissions = list
      .filter((e) => !e.isSettled)
      .reduce((acc, e) => acc + e.commissionAmount, 0);

    return { totalSales, totalCommissions, settledCommissions, pendingCommissions };
  }, [allCommissionEntries, selectedCollaboratorId]);

  // Candidate items for settlement (pending items for the selected collaborator)
  const candidateItems = useMemo(() => {
    if (selectedCollaboratorId === 'all') return [];
    return allCommissionEntries
      .filter((e) => e.collaboratorId === selectedCollaboratorId && !e.isSettled)
      .map((e) => ({
        transactionId: e.transactionId,
        amount: e.amount,
        commissionAmount: e.commissionAmount,
        date: e.date,
        reference: e.reference,
        description: e.description,
      }));
  }, [allCommissionEntries, selectedCollaboratorId]);

  const selectedCollaborator = collaborators.find((c) => c.id === selectedCollaboratorId);

  const handleSettlementSuccess = (settlement: CommissionSettlement) => {
    refreshSettlements();
    setActiveSettlement(settlement);
    setIsReceiptOpen(true);
  };

  const handleViewReceipt = (settlementId: string) => {
    const found = settlements.find((s) => s.id === settlementId);
    if (found) {
      setActiveSettlement(found);
      setIsReceiptOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Vendas c/ Comissão</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-mono">{formatCurrency(kpis.totalSales)}</div>
            <p className="text-xs text-muted-foreground mt-1">Base de cálculo no período</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Comissões Apuradas</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(kpis.totalCommissions)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total bruto devido</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Comissões Liquidadas</span>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
              {formatCurrency(kpis.settledCommissions)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Já pagas via fluxo de caixa</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold uppercase text-amber-800 dark:text-amber-300">
              Saldo Pendente a Pagar
            </span>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-mono text-amber-700 dark:text-amber-400">
              {formatCurrency(kpis.pendingCommissions)}
            </div>
            <p className="text-xs text-amber-800/80 dark:text-amber-400/80 mt-1">
              Aguardando liquidação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Commission Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList>
            <TabsTrigger value="entries" className="gap-2">
              <FileCheck className="h-4 w-4" />
              Lançamentos de Vendas & Comissões
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Histórico de Fechamentos ({settlements.length})
            </TabsTrigger>
          </TabsList>

          {/* Action to Settle */}
          {selectedCollaboratorId !== 'all' && candidateItems.length > 0 && (
            <Button
              onClick={() => setIsSettleOpen(true)}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow"
            >
              <DollarSign className="h-4 w-4" />
              Liquidar Comissões ({formatCurrency(kpis.pendingCommissions)})
            </Button>
          )}
        </div>

        {/* Tab 1: Entries */}
        <TabsContent value="entries" className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-muted/40 p-3 rounded-lg border">
            {/* Collaborator Selector */}
            <div className="w-full sm:w-64">
              <Select value={selectedCollaboratorId} onValueChange={setSelectedCollaboratorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por Colaborador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Colaboradores</SelectItem>
                  {collaborators.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="w-full sm:w-44">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pending">Apenas Pendentes</SelectItem>
                  <SelectItem value="settled">Apenas Liquidados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição, referência ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Table */}
          <Card className="border shadow-sm">
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[750px]">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Referência / Descrição</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor Venda</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhum lançamento de comissão encontrado para os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEntries.map((entry) => (
                      <TableRow key={entry.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs whitespace-nowrap">
                          {format(entry.date, 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {entry.collaboratorName}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-mono font-medium text-foreground">
                            {entry.reference}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={entry.description}>
                            {entry.description}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {entry.customerName || '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(entry.amount)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(entry.commissionAmount)}
                        </TableCell>
                        <TableCell className="text-center">
                          {entry.isSettled ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300">
                              Liquidado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300">
                              Pendente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.isSettled && entry.settlementId ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewReceipt(entry.settlementId!)}
                              className="h-8 gap-1 text-xs"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              Recibo
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Settlement History */}
        <TabsContent value="history" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Histórico de Quitações & Fechamentos</CardTitle>
              <CardDescription>
                Registros de comissões liquidadas com lançamento automático no Livro Caixa.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Data Fechamento</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Período Apurado</TableHead>
                    <TableHead className="text-center">Vendas</TableHead>
                    <TableHead className="text-right">Comissão Bruta</TableHead>
                    <TableHead className="text-right">Deduções</TableHead>
                    <TableHead className="text-right">Líquido Repassado</TableHead>
                    <TableHead>Forma Pgto</TableHead>
                    <TableHead className="text-right">Recibo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Nenhum fechamento de comissões registrado até o momento.
                      </TableCell>
                    </TableRow>
                  ) : (
                    settlements.map((s) => (
                      <TableRow key={s.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs whitespace-nowrap">
                          {format(new Date(s.settledAt), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {s.collaboratorName}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(s.startDate), 'dd/MM/yy')} até{' '}
                          {format(new Date(s.endDate), 'dd/MM/yy')}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{s.transactionIds.length}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(s.totalCommission)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-red-500">
                          {s.deductions > 0 ? `-${formatCurrency(s.deductions)}` : 'R$ 0,00'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-primary text-sm">
                          {formatCurrency(s.netPaid)}
                        </TableCell>
                        <TableCell className="text-xs uppercase">{s.paymentMethod}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActiveSettlement(s);
                              setIsReceiptOpen(true);
                            }}
                            className="h-8 gap-1 text-xs"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            Imprimir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Settlement Dialog */}
      {selectedCollaborator && (
        <CommissionSettlementDialog
          open={isSettleOpen}
          onOpenChange={setIsSettleOpen}
          collaboratorId={selectedCollaborator.id}
          collaboratorName={selectedCollaborator.name}
          candidateItems={candidateItems}
          startDate={propStartDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1)}
          endDate={propEndDate || new Date()}
          onSettlementSuccess={handleSettlementSuccess}
        />
      )}

      {/* Printable Receipt Dialog */}
      <CommissionReceiptDialog
        open={isReceiptOpen}
        onOpenChange={setIsReceiptOpen}
        settlement={activeSettlement}
      />
    </div>
  );
};
