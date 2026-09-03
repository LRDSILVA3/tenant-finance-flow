// OrderReceiptDialog - Comprovante e Espelho do Pedido para Impressão e PDF

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Order } from '@/types/finance';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Printer, Download, CheckCircle2, Clock, ShoppingCart, User, Building2, Calendar, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { generateOrderPdf } from './OrderPdf';

interface OrderReceiptDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName?: string;
}

export const OrderReceiptDialog: React.FC<OrderReceiptDialogProps> = ({
  order,
  open,
  onOpenChange,
  companyName = 'Previna Gestão'
}) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    generateOrderPdf(order, companyName);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Pedido #{order.orderNumber}
            </DialogTitle>
            <Badge
              variant={
                order.status === 'completed' ? 'default' :
                order.status === 'pending' ? 'secondary' :
                order.status === 'draft' ? 'outline' : 'destructive'
              }
            >
              {order.status === 'completed' && 'Concluído'}
              {order.status === 'pending' && 'Pendente'}
              {order.status === 'draft' && 'Orçamento / Rascunho'}
              {order.status === 'cancelled' && 'Cancelado'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/40 rounded-lg border">
            <div>
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="font-semibold text-foreground">{order.customer?.name || 'Cliente Balcão'}</p>
              {order.customer?.phone && <p className="text-xs text-muted-foreground">{order.customer.phone}</p>}
              {order.customer?.document && <p className="text-xs text-muted-foreground">{order.customer.document}</p>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Detalhes da Venda</p>
              <p className="text-xs font-medium">Emissão: {formatDate(new Date(order.createdAt))}</p>
              <p className="text-xs font-medium">
                Pagamento: <span className="capitalize">{order.paymentMethod || 'Dinheiro'}</span> ({order.paymentStatus === 'paid' ? 'Pago' : 'Pendente / A Prazo'})
              </p>
              {order.collaborator?.name && <p className="text-xs text-muted-foreground">Vendedor: {order.collaborator.name}</p>}
            </div>
          </div>

          {/* Itens */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Itens do Pedido ({order.items?.length || 0})
            </h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground border-b">
                  <tr>
                    <th className="p-2.5">Item</th>
                    <th className="p-2.5 text-center">Qtd</th>
                    <th className="p-2.5 text-right">Preço Unit.</th>
                    <th className="p-2.5 text-right">Desconto</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(order.items || []).map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="p-2.5">
                        <div className="font-medium text-foreground">{item.productName || 'Produto'}</div>
                        {item.productSku && <span className="text-[10px] text-muted-foreground">SKU: {item.productSku}</span>}
                      </td>
                      <td className="p-2.5 text-center font-medium">{item.quantity}</td>
                      <td className="p-2.5 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-2.5 text-right text-destructive">
                        {item.discountAmount > 0 ? `-${formatCurrency(item.discountAmount)}` : '-'}
                      </td>
                      <td className="p-2.5 text-right font-semibold">{formatCurrency(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totais */}
          <div className="flex flex-col items-end gap-1 pt-2 border-t">
            <div className="flex justify-between w-48 text-xs text-muted-foreground">
              <span>Subtotal:</span>
              <span>{formatCurrency(order.subtotalAmount)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between w-48 text-xs text-destructive">
                <span>Desconto Global:</span>
                <span>-{formatCurrency(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between w-48 text-base font-bold text-primary pt-1 border-t">
              <span>Total Final:</span>
              <span>{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>

          {order.notes && (
            <div className="p-2.5 bg-muted/20 border rounded-md text-xs">
              <span className="font-semibold text-muted-foreground">Observações: </span>
              <span className="text-foreground">{order.notes}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="gap-1.5">
              <Download className="h-4 w-4" />
              Baixar PDF
            </Button>
            <Button size="sm" onClick={handlePrint} className="gap-1.5">
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
