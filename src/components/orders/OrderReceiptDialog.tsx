// OrderReceiptDialog / OrderDialog — Modal Completo e Premium de Pedido de Venda
// Não-genérico: Abas ricas, métricas, dados do cliente/vendedor, itens detalhados, espelho fiscal/térmico e ações rápidas

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Order } from '@/types/finance';
import { formatCurrency, formatDate } from '@/lib/utils';
import { generateOrderPdf } from './OrderPdf';
import { toast } from '@/hooks/use-toast';
import {
  ShoppingBag,
  Package,
  User,
  CreditCard,
  Printer,
  Download,
  Copy,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  DollarSign,
  Building2,
  Tag,
  Receipt,
  Smartphone,
  Banknote,
  Percent,
} from 'lucide-react';

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
  companyName = 'Previna Gestão',
}) => {
  const [activeTab, setActiveTab] = useState<'items' | 'customer' | 'payment' | 'preview'>('items');

  if (!order) return null;

  const totalQuantity = (order.items || []).reduce((sum, item) => sum + item.quantity, 0);
  const itemsDiscountSum = (order.items || []).reduce((sum, item) => sum + (item.discountAmount || 0), 0);
  const totalDiscount = (order.discountAmount || 0) + itemsDiscountSum;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    generateOrderPdf(order, companyName);
    toast({
      title: 'PDF Baixado com Sucesso',
      description: `O arquivo comercial do pedido #${order.orderNumber} foi gerado.`,
    });
  };

  const handleCopyOrderSummary = () => {
    const itemsText = (order.items || [])
      .map(
        (it) =>
          `• ${it.quantity}x ${it.productName || 'Item'} - ${formatCurrency(it.totalPrice)}`
      )
      .join('\n');

    const summary = `🧾 *PEDIDO #${order.orderNumber}* - ${companyName}\n` +
      `📅 *Data:* ${formatDate(new Date(order.createdAt))}\n` +
      `👤 *Cliente:* ${order.customer?.name || 'Cliente Balcão'}\n` +
      `💳 *Pagamento:* ${(order.paymentMethod || 'Dinheiro').toUpperCase()} (${order.paymentStatus === 'paid' ? 'Pago' : 'Pendente'})\n\n` +
      `*Itens do Pedido:*\n${itemsText}\n\n` +
      `💰 *Total Geral:* ${formatCurrency(order.totalAmount)}`;

    navigator.clipboard.writeText(summary);
    toast({
      title: 'Resumo Copiado',
      description: 'As informações do pedido foram copiadas para a área de transferência.',
    });
  };

  const getPaymentIcon = (method?: string) => {
    const m = (method || '').toLowerCase();
    if (m === 'pix') return <Smartphone className="h-4 w-4 text-purple-500" />;
    if (m.includes('cart') || m.includes('card') || m.includes('crédito') || m.includes('débito'))
      return <CreditCard className="h-4 w-4 text-blue-500" />;
    if (m === 'boleto') return <FileText className="h-4 w-4 text-cyan-500" />;
    return <Banknote className="h-4 w-4 text-emerald-500" />;
  };

  const getStatusBadge = () => {
    switch (order.status) {
      case 'completed':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 font-medium">
            <CheckCircle2 className="h-3 w-3" />
            Concluído
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 font-medium">
            <Clock className="h-3 w-3" />
            Pendente
          </Badge>
        );
      case 'draft':
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 gap-1 font-medium">
            <Tag className="h-3 w-3" />
            Orçamento / Rascunho
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1 font-medium">
            <AlertTriangle className="h-3 w-3" />
            Cancelado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1 font-medium">
            {order.status}
          </Badge>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-[100dvh] max-h-[100dvh] max-w-none !top-0 !left-0 !right-0 !bottom-0 !translate-x-0 !translate-y-0 sm:!left-[50%] sm:!top-[50%] sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:w-full sm:max-w-4xl sm:h-[90vh] sm:max-h-[90vh] sm:rounded-xl rounded-none !flex !flex-col !p-0 !gap-0 overflow-hidden bg-background">
        
        {/* Header Premium */}
        <DialogHeader className="p-4 sm:p-6 pb-4 border-b bg-muted/20 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-sm">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight">
                    Pedido #{order.orderNumber}
                  </DialogTitle>
                  {getStatusBadge()}
                </div>
                <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span>{companyName}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(new Date(order.createdAt))}
                  </span>
                </DialogDescription>
              </div>
            </div>

            {/* Ações no Header */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={handleCopyOrderSummary}
                title="Copiar Resumo"
              >
                <Copy className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Copiar</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={handleDownloadPdf}
                title="Baixar PDF Comercial"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={handlePrint}
                title="Imprimir Cupom"
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Imprimir</span>
              </Button>
            </div>
          </div>

          {/* Cards de Métricas Rápidas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t">
            <div className="bg-card border rounded-lg p-2.5 shadow-sm">
              <span className="text-[11px] font-medium text-muted-foreground block">Total Líquido</span>
              <span className="text-base sm:text-lg font-bold text-primary block truncate">
                {formatCurrency(order.totalAmount)}
              </span>
            </div>

            <div className="bg-card border rounded-lg p-2.5 shadow-sm">
              <span className="text-[11px] font-medium text-muted-foreground block">Qtd. de Itens</span>
              <span className="text-base sm:text-lg font-semibold text-foreground block">
                {order.items?.length || 0} prod. ({totalQuantity} un)
              </span>
            </div>

            <div className="bg-card border rounded-lg p-2.5 shadow-sm">
              <span className="text-[11px] font-medium text-muted-foreground block">Pagamento</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {getPaymentIcon(order.paymentMethod)}
                <span className="text-xs sm:text-sm font-semibold capitalize truncate">
                  {order.paymentMethod || 'Dinheiro'}
                </span>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-2.5 shadow-sm">
              <span className="text-[11px] font-medium text-muted-foreground block">Status Financeiro</span>
              <span
                className={`text-xs sm:text-sm font-semibold inline-flex items-center gap-1 mt-0.5 ${
                  order.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {order.paymentStatus === 'paid' ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Pago
                  </>
                ) : (
                  <>
                    <Clock className="h-3.5 w-3.5" />
                    Pendente
                  </>
                )}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Abas e Conteúdo */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <Tabs
            value={activeTab}
            onValueChange={(val: any) => setActiveTab(val)}
            className="w-full flex flex-col"
          >
            <TabsList className="grid grid-cols-4 w-full max-w-md mx-auto mb-4 h-9">
              <TabsTrigger value="items" className="text-xs gap-1.5">
                <Package className="h-3.5 w-3.5" />
                <span>Itens</span>
              </TabsTrigger>
              <TabsTrigger value="customer" className="text-xs gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span>Cliente</span>
              </TabsTrigger>
              <TabsTrigger value="payment" className="text-xs gap-1.5">
                <CreditCard className="h-3.5 w-3.5" />
                <span>Financeiro</span>
              </TabsTrigger>
              <TabsTrigger value="preview" className="text-xs gap-1.5">
                <Receipt className="h-3.5 w-3.5" />
                <span>Cupom</span>
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: ITENS DO PEDIDO */}
            <TabsContent value="items" className="space-y-4 m-0 focus-visible:outline-none">
              <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
                <div className="bg-muted/40 px-4 py-2.5 border-b flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-primary" />
                    Produtos & Serviços Incluídos
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {order.items?.length || 0} itens cadastrados
                  </Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-muted/30 text-muted-foreground border-b text-[11px]">
                      <tr>
                        <th className="p-3">Produto / Serviço</th>
                        <th className="p-3 text-center">Qtd</th>
                        <th className="p-3 text-right">Preço Unit.</th>
                        <th className="p-3 text-right">Desconto</th>
                        <th className="p-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(order.items || []).map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3">
                            <div className="font-semibold text-foreground">
                              {item.productName || 'Produto / Item'}
                            </div>
                            {item.productSku && (
                              <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                SKU: {item.productSku}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-xs">
                              {item.quantity} un
                            </span>
                          </td>
                          <td className="p-3 text-right text-muted-foreground">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="p-3 text-right">
                            {item.discountAmount > 0 ? (
                              <span className="text-destructive font-medium">
                                -{formatCurrency(item.discountAmount)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">-</span>
                            )}
                          </td>
                          <td className="p-3 text-right font-bold text-foreground">
                            {formatCurrency(item.totalPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Card de Totais e Descontos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {order.notes ? (
                  <div className="border rounded-xl p-4 bg-muted/20 space-y-1.5">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      Observações do Pedido
                    </span>
                    <p className="text-xs sm:text-sm text-foreground whitespace-pre-line leading-relaxed">
                      {order.notes}
                    </p>
                  </div>
                ) : (
                  <div className="border border-dashed rounded-xl p-4 flex items-center justify-center text-xs text-muted-foreground bg-muted/10">
                    Nenhuma observação informada para este pedido.
                  </div>
                )}

                <div className="border rounded-xl p-4 bg-card shadow-sm space-y-2.5">
                  <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
                    <span>Subtotal Bruto:</span>
                    <span className="font-medium text-foreground">{formatCurrency(order.subtotalAmount)}</span>
                  </div>

                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-xs sm:text-sm text-destructive">
                      <span className="flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        Desconto Total Aplicado:
                      </span>
                      <span className="font-semibold">-{formatCurrency(totalDiscount)}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t flex justify-between items-baseline">
                    <span className="text-sm font-bold text-foreground">Valor Total do Pedido:</span>
                    <span className="text-lg sm:text-xl font-extrabold text-primary">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ABA 2: CLIENTE & VENDEDOR */}
            <TabsContent value="customer" className="space-y-4 m-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card do Cliente */}
                <Card className="shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 border-b pb-2">
                      <User className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold text-sm">Dados do Cliente</h4>
                    </div>

                    <div className="space-y-2 text-xs sm:text-sm">
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Nome / Razão Social</span>
                        <span className="font-bold text-foreground">
                          {order.customer?.name || 'Cliente Balcão (Não Identificado)'}
                        </span>
                      </div>

                      {order.customer?.document && (
                        <div>
                          <span className="text-[11px] text-muted-foreground block">CPF / CNPJ</span>
                          <span className="font-mono text-foreground">{order.customer.document}</span>
                        </div>
                      )}

                      {order.customer?.phone && (
                        <div>
                          <span className="text-[11px] text-muted-foreground block">Telefone</span>
                          <span className="text-foreground">{order.customer.phone}</span>
                        </div>
                      )}

                      {order.customer?.email && (
                        <div>
                          <span className="text-[11px] text-muted-foreground block">E-mail</span>
                          <span className="text-foreground">{order.customer.email}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Card do Vendedor / Colaborador */}
                <Card className="shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 border-b pb-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold text-sm">Vendedor & Atendimento</h4>
                    </div>

                    <div className="space-y-2 text-xs sm:text-sm">
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Vendedor Responsável</span>
                        <span className="font-semibold text-foreground">
                          {order.collaborator?.name || 'Venda Direta / Balcão'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] text-muted-foreground block">Empresa / Estabelecimento</span>
                        <span className="font-medium text-foreground">{companyName}</span>
                      </div>

                      <div>
                        <span className="text-[11px] text-muted-foreground block">Data de Criação</span>
                        <span className="text-foreground">{formatDate(new Date(order.createdAt))}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ABA 3: FINANCEIRO & PAGAMENTO */}
            <TabsContent value="payment" className="space-y-4 m-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 border-b pb-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold text-sm">Condição de Pagamento</h4>
                    </div>

                    <div className="space-y-3 text-xs sm:text-sm">
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border">
                        <span className="text-muted-foreground">Método:</span>
                        <div className="flex items-center gap-1.5 font-bold uppercase">
                          {getPaymentIcon(order.paymentMethod)}
                          <span>{order.paymentMethod || 'Dinheiro'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border">
                        <span className="text-muted-foreground">Status do Pagamento:</span>
                        <Badge
                          variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}
                          className="font-medium"
                        >
                          {order.paymentStatus === 'paid' ? 'Pago' : 'Pendente / A Prazo'}
                        </Badge>
                      </div>

                      {order.transactionId && (
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border">
                          <span className="text-muted-foreground">ID do Lançamento:</span>
                          <span className="font-mono text-xs truncate max-w-[160px] text-foreground">
                            {order.transactionId}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 border-b pb-2">
                      <Receipt className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold text-sm">Resumo da Cobrança</h4>
                    </div>

                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(order.subtotalAmount)}</span>
                      </div>
                      <div className="flex justify-between text-destructive">
                        <span>Descontos:</span>
                        <span>-{formatCurrency(totalDiscount)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-foreground text-sm pt-2 border-t">
                        <span>Valor Final Cobrado:</span>
                        <span className="text-primary">{formatCurrency(order.totalAmount)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ABA 4: ESPELHO / CUPOM DE IMPRESSÃO */}
            <TabsContent value="preview" className="space-y-4 m-0 focus-visible:outline-none">
              <div className="max-w-md mx-auto bg-white text-slate-900 border shadow-md rounded-lg p-5 font-mono text-xs space-y-3">
                {/* Topo do Cupom */}
                <div className="text-center border-b border-dashed pb-3 space-y-1">
                  <h3 className="font-bold text-sm tracking-wider uppercase">{companyName}</h3>
                  <p className="text-[11px] text-slate-500">COMPROVANTE DE VENDA NÃO FISCAL</p>
                  <p className="text-[10px] text-slate-400">PEDIDO #{order.orderNumber}</p>
                  <p className="text-[10px] text-slate-400">{formatDate(new Date(order.createdAt))}</p>
                </div>

                {/* Cliente */}
                <div className="border-b border-dashed pb-2 text-[11px] space-y-0.5">
                  <p>
                    <span className="font-semibold">Cliente:</span>{' '}
                    {order.customer?.name || 'Consumidor Final'}
                  </p>
                  {order.customer?.document && (
                    <p>
                      <span className="font-semibold">CPF/CNPJ:</span> {order.customer.document}
                    </p>
                  )}
                  {order.collaborator?.name && (
                    <p>
                      <span className="font-semibold">Vendedor:</span> {order.collaborator.name}
                    </p>
                  )}
                </div>

                {/* Itens Zebrados */}
                <div className="border-b border-dashed pb-2 space-y-1 text-[11px]">
                  <div className="flex justify-between font-bold pb-1 text-[10px] text-slate-500 uppercase">
                    <span>QTD x ITEM</span>
                    <span>TOTAL</span>
                  </div>
                  {(order.items || []).map((item, i) => (
                    <div key={i} className="flex justify-between leading-tight">
                      <span className="truncate pr-2">
                        {item.quantity}x {item.productName || 'Item'}
                      </span>
                      <span className="font-bold shrink-0">{formatCurrency(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>

                {/* Totais do Cupom */}
                <div className="space-y-1 text-[11px] pt-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(order.subtotalAmount)}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Desconto:</span>
                      <span>-{formatCurrency(totalDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-extrabold pt-1 border-t border-slate-900">
                    <span>TOTAL PAGO:</span>
                    <span>{formatCurrency(order.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                    <span>Forma de Pagto:</span>
                    <span className="uppercase font-semibold">{order.paymentMethod || 'Dinheiro'}</span>
                  </div>
                </div>

                {/* Rodapé do Cupom */}
                <div className="text-center pt-3 border-t border-dashed text-[10px] text-slate-500 space-y-0.5">
                  <p>Obrigado pela preferência!</p>
                  <p>Volte sempre.</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t bg-muted/20 shrink-0 flex-row justify-between items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={handleDownloadPdf}
            >
              <Download className="h-4 w-4" />
              Baixar PDF
            </Button>
            <Button size="sm" className="text-xs gap-1.5" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const OrderDialog = OrderReceiptDialog;
