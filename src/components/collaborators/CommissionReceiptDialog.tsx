import React from 'react';
import { CommissionSettlement } from '@/services/commissionSettlementService';
import { useFinance } from '@/contexts/FinanceContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, CheckCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CommissionReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settlement: CommissionSettlement | null;
}

export const CommissionReceiptDialog: React.FC<CommissionReceiptDialogProps> = ({
  open,
  onOpenChange,
  settlement,
}) => {
  const { currentClient, formatCurrency } = useFinance();

  if (!settlement) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = settlement.settledAt
    ? format(new Date(settlement.settledAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto print:max-w-full print:m-0 print:p-0 print:border-none print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <FileText className="h-5 w-5 text-primary" />
            Recibo de Repasse de Comissão
          </DialogTitle>
        </DialogHeader>

        {/* Printable Voucher Section */}
        <div id="commission-receipt-print" className="p-6 border rounded-lg bg-card text-card-foreground space-y-6 print:border-none print:p-2">
          {/* Header */}
          <div className="border-b pb-4 flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
                {currentClient?.name || 'Sistema Financeiro'}
              </h2>
              <p className="text-xs text-muted-foreground">
                Documento de Prestação de Contas e Quitação de Comissões
              </p>
              {currentClient?.taxId && (
                <p className="text-xs text-muted-foreground">CNPJ/CPF: {currentClient.taxId}</p>
              )}
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 rounded bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 px-2 py-0.5 text-xs font-semibold">
                <CheckCircle className="h-3.5 w-3.5" />
                LIQUIDADO
              </span>
              <p className="text-xs font-mono text-muted-foreground mt-1">ID: {settlement.id.slice(0, 8)}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-md">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">COLABORADOR</span>
              <strong className="text-foreground text-base">{settlement.collaboratorName}</strong>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block font-medium">FORMA DE PAGAMENTO</span>
              <strong className="text-foreground uppercase">{settlement.paymentMethod || 'PIX'}</strong>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block font-medium">PERÍODO DE APURAÇÃO</span>
              <span className="text-foreground">
                {format(new Date(settlement.startDate), 'dd/MM/yyyy')} até{' '}
                {format(new Date(settlement.endDate), 'dd/MM/yyyy')}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block font-medium">DATA DE LIQUIDAÇÃO</span>
              <span className="text-foreground">
                {format(new Date(settlement.settledAt), 'dd/MM/yyyy HH:mm')}
              </span>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              Demonstrativo Financeiro
            </h4>
            <div className="border rounded-md divide-y text-sm">
              <div className="flex justify-between items-center p-3">
                <span className="text-muted-foreground">Volume de Vendas / Serviços Apurados ({settlement.transactionIds.length} lançamentos):</span>
                <span className="font-mono font-medium">{formatCurrency(settlement.totalSales)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/10">
                <span className="font-medium text-foreground">Comissão Bruta Calculada:</span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(settlement.totalCommission)}
                </span>
              </div>
              {settlement.deductions > 0 && (
                <div className="flex justify-between items-center p-3 text-red-600 dark:text-red-400">
                  <span>
                    Deduções / Adiantamentos / Vales
                    {settlement.deductionNotes ? ` (${settlement.deductionNotes})` : ''}:
                  </span>
                  <span className="font-mono font-semibold">
                    - {formatCurrency(settlement.deductions)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center p-3 bg-muted/40 text-base font-bold">
                <span className="text-foreground uppercase tracking-wide">Valor Líquido Repassado:</span>
                <span className="font-mono text-lg text-primary">{formatCurrency(settlement.netPaid)}</span>
              </div>
            </div>
          </div>

          {settlement.notes && (
            <div className="text-xs text-muted-foreground bg-muted/20 p-3 rounded border">
              <strong>Observações:</strong> {settlement.notes}
            </div>
          )}

          {/* Legal declaration & Signatures */}
          <div className="pt-6 space-y-8">
            <p className="text-xs text-muted-foreground text-justify leading-relaxed">
              Declaro para os devidos fins ter recebido a quantia líquida supramencionada correspondente ao
              repasse e quitação integral das comissões apuradas no período indicado, dando plena, geral e irrevogável
              quitação das referidas parcelas.
            </p>

            <div className="text-center text-xs text-muted-foreground">
              {currentClient?.city || 'Local'}, {formattedDate}
            </div>

            <div className="grid grid-cols-2 gap-8 pt-8 border-t">
              <div className="text-center">
                <div className="border-b border-foreground/30 w-3/4 mx-auto mb-2" />
                <p className="text-xs font-semibold text-foreground uppercase">{currentClient?.name || 'Empresa'}</p>
                <p className="text-[10px] text-muted-foreground">Responsável Financeiro</p>
              </div>
              <div className="text-center">
                <div className="border-b border-foreground/30 w-3/4 mx-auto mb-2" />
                <p className="text-xs font-semibold text-foreground uppercase">{settlement.collaboratorName}</p>
                <p className="text-[10px] text-muted-foreground">Colaborador / Beneficiário</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="print:hidden flex justify-between items-center sm:justify-between w-full">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir Recibo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
