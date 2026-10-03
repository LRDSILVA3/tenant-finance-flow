import React, { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Printer, Download, Sparkles, Barcode as BarcodeIcon, Copy, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getColorHex } from '@/utils/colorUtils';

export interface BarcodePrintProduct {
  id?: string;
  name: string;
  sku?: string | null;
  sale_price?: number;
  size_or_variant?: string | null;
  color?: string | null;
  unit?: string | null;
  current_stock?: number;
}

interface BarcodePrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: BarcodePrintProduct | null;
  companyName?: string;
  onSaveSku?: (newSku: string) => Promise<void> | void;
}

export const BarcodePrintDialog: React.FC<BarcodePrintDialogProps> = ({
  open,
  onOpenChange,
  product,
  companyName = 'Finance Flow',
  onSaveSku,
}) => {
  const [skuCode, setSkuCode] = useState('');
  const [copies, setCopies] = useState(1);
  const [labelFormat, setLabelFormat] = useState<'thermal_50x30' | 'thermal_60x40' | 'sheet_a4' | 'receipt_80'>('thermal_50x30');
  
  // Customizações
  const [showPrice, setShowPrice] = useState(true);
  const [showVariants, setShowVariants] = useState(true);
  const [showCompany, setShowCompany] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const previewSvgRef = useRef<SVGSVGElement | null>(null);

  // Inicializa ou gera código ao abrir
  useEffect(() => {
    if (open && product) {
      if (product.sku && product.sku.trim()) {
        setSkuCode(product.sku.trim());
      } else {
        // Gera um código de barras de 13 dígitos simulando padrão interno EAN
        const randomDigits = Math.floor(1000000000 + Math.random() * 9000000000);
        setSkuCode(`789${randomDigits}`);
      }
      setCopies(product.current_stock && product.current_stock > 0 ? Math.min(product.current_stock, 50) : 1);
    }
  }, [open, product]);

  // Renderiza código de barras no preview
  useEffect(() => {
    if (!open || !skuCode.trim() || !previewSvgRef.current) return;

    try {
      const isPureDigits = /^\d+$/.test(skuCode.trim());
      const format = isPureDigits && (skuCode.trim().length === 12 || skuCode.trim().length === 13) ? 'EAN13' : 'CODE128';

      JsBarcode(previewSvgRef.current, skuCode.trim(), {
        format: format,
        lineColor: '#000000',
        width: 1.8,
        height: 38,
        displayValue: true,
        fontSize: 11,
        font: 'monospace',
        margin: 2,
        background: '#ffffff',
      });
    } catch {
      // Fallback para CODE128 genérico em caso de soma de verificação EAN divergente
      try {
        if (previewSvgRef.current) {
          JsBarcode(previewSvgRef.current, skuCode.trim(), {
            format: 'CODE128',
            lineColor: '#000000',
            width: 1.8,
            height: 38,
            displayValue: true,
            fontSize: 11,
            font: 'monospace',
            margin: 2,
            background: '#ffffff',
          });
        }
      } catch (err) {
        console.error('Erro ao renderizar código de barras:', err);
      }
    }
  }, [open, skuCode]);

  const handleGenerateRandomSku = () => {
    const randomDigits = Math.floor(1000000000 + Math.random() * 9000000000);
    const newCode = `789${randomDigits}`;
    setSkuCode(newCode);
    if (onSaveSku) {
      onSaveSku(newCode);
    }
    toast({ title: 'Código de barras gerado!', description: `Atribuído: ${newCode}` });
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Helper para obter imagem do código de barras em base64
  const getBarcodeBase64 = (): string | null => {
    const canvas = document.createElement('canvas');
    try {
      JsBarcode(canvas, skuCode.trim(), {
        format: 'CODE128',
        width: 2.2,
        height: 48,
        displayValue: true,
        fontSize: 12,
        margin: 2,
        background: '#ffffff',
      });
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  };

  // Impressão Direta do Navegador
  const handlePrint = () => {
    const barcodeImg = getBarcodeBase64();
    if (!barcodeImg) {
      toast({ title: 'Erro ao gerar etiqueta', description: 'Código inválido.', variant: 'destructive' });
      return;
    }

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      toast({ title: 'Pop-up bloqueado', description: 'Permita pop-ups para imprimir diretamente.', variant: 'destructive' });
      return;
    }

    const isThermal = labelFormat === 'thermal_50x30' || labelFormat === 'thermal_60x40';
    const widthMm = labelFormat === 'thermal_60x40' ? '60mm' : labelFormat === 'thermal_50x30' ? '50mm' : 'auto';
    const heightMm = labelFormat === 'thermal_60x40' ? '40mm' : labelFormat === 'thermal_50x30' ? '30mm' : 'auto';

    let labelsHtml = '';
    const safeCopies = Math.max(1, Math.min(copies, 200));

    for (let i = 0; i < safeCopies; i++) {
      labelsHtml += `
        <div class="label-item">
          ${showCompany ? `<div class="company-name">${companyName}</div>` : ''}
          <div class="product-name">${product?.name || 'Produto'}</div>
          ${showVariants && (product?.size_or_variant || product?.color) ? `
            <div class="variants">
              ${product?.size_or_variant ? `<span>Tam: <strong>${product.size_or_variant}</strong></span>` : ''}
              ${product?.color ? `<span>Cor: <strong>${product.color}</strong></span>` : ''}
            </div>
          ` : ''}
          <img src="${barcodeImg}" class="barcode-image" alt="Código de Barras" />
          ${showPrice && product?.sale_price ? `
            <div class="price">${formatCurrency(product.sale_price)}</div>
          ` : ''}
        </div>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiquetas - ${product?.name || 'Código de Barras'}</title>
        <style>
          @page {
            size: ${isThermal ? `${widthMm} ${heightMm}` : 'A4 portrait'};
            margin: ${isThermal ? '0mm' : '10mm'};
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }
          body {
            background: #fff;
            color: #000;
          }
          ${isThermal ? `
            .labels-container {
              display: block;
            }
            .label-item {
              width: ${widthMm};
              height: ${heightMm};
              page-break-after: always;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              padding: 2.5mm 2mm;
              overflow: hidden;
            }
          ` : `
            .labels-container {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 3mm;
            }
            .label-item {
              border: 1px dashed #ccc;
              border-radius: 4px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              padding: 3mm 2mm;
              height: 38mm;
              overflow: hidden;
            }
          `}
          .company-name {
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #444;
            max-width: 95%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .product-name {
            font-size: 10px;
            font-weight: 800;
            line-height: 1.15;
            max-height: 2.3em;
            overflow: hidden;
            margin-top: 1px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }
          .variants {
            font-size: 8.5px;
            color: #222;
            margin: 1px 0;
            display: flex;
            gap: 6px;
          }
          .barcode-image {
            width: 88%;
            max-height: 16mm;
            object-fit: contain;
            margin: 1px 0;
          }
          .price {
            font-size: 12.5px;
            font-weight: 900;
            letter-spacing: -0.2px;
          }
        </style>
      </head>
      <body>
        <div class="labels-container">
          ${labelsHtml}
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Gerador de PDF usando jsPDF
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const barcodeImg = getBarcodeBase64();
      if (!barcodeImg) {
        toast({ title: 'Erro ao gerar PDF', description: 'Código inválido.', variant: 'destructive' });
        return;
      }

      const safeCopies = Math.max(1, Math.min(copies, 100));

      if (labelFormat === 'thermal_50x30' || labelFormat === 'thermal_60x40') {
        const w = labelFormat === 'thermal_60x40' ? 60 : 50;
        const h = labelFormat === 'thermal_60x40' ? 40 : 30;

        const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: [w, h],
        });

        for (let i = 0; i < safeCopies; i++) {
          if (i > 0) doc.addPage([w, h], 'landscape');

          let y = 3.5;
          if (showCompany) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.setTextColor(80, 80, 80);
            doc.text(companyName.toUpperCase().substring(0, 30), w / 2, y, { align: 'center' });
            y += 3.2;
          }

          // Nome do produto (cortado para caber)
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(0, 0, 0);
          const splitTitle = doc.splitTextToSize(product?.name || 'Produto', w - 4);
          doc.text(splitTitle.slice(0, 2), w / 2, y, { align: 'center' });
          y += (splitTitle.slice(0, 2).length * 3.2) + 0.5;

          // Variantes
          if (showVariants && (product?.size_or_variant || product?.color)) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            const varParts: string[] = [];
            if (product.size_or_variant) varParts.push(`Tam: ${product.size_or_variant}`);
            if (product.color) varParts.push(`Cor: ${product.color}`);
            doc.text(varParts.join(' | '), w / 2, y, { align: 'center' });
            y += 2.8;
          }

          // Imagem do Código de Barras
          doc.addImage(barcodeImg, 'PNG', 3, y, w - 6, 12);
          y += 12.8;

          // Preço
          if (showPrice && product?.sale_price) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10.5);
            doc.text(formatCurrency(product.sale_price), w / 2, y, { align: 'center' });
          }
        }

        doc.save(`etiquetas-${product?.name ? product.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'produto'}.pdf`);
        toast({ title: 'PDF gerado com sucesso! 📄', description: `${safeCopies} etiqueta(s) térmica(s) gerada(s).` });
      } else {
        // Folha A4 com Grade 3 colunas x 10 linhas (Padrão 30 etiquetas)
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        const marginX = 7;
        const marginY = 12;
        const labelW = 63.5;
        const labelH = 26.5;
        const cols = 3;
        const rows = 10;
        const perPage = cols * rows;

        for (let i = 0; i < safeCopies; i++) {
          const pageIndex = Math.floor(i / perPage);
          const slotIndex = i % perPage;

          if (i > 0 && slotIndex === 0) {
            doc.addPage('a4', 'portrait');
          }

          const col = slotIndex % cols;
          const row = Math.floor(slotIndex / cols);

          const x = marginX + col * (labelW + 2.5);
          const y = marginY + row * (labelH + 1.2);

          // Borda sutil de recorte
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.1);
          doc.rect(x, y, labelW, labelH);

          let curY = y + 3.2;

          if (showCompany) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6);
            doc.setTextColor(90, 90, 90);
            doc.text(companyName.toUpperCase().substring(0, 32), x + labelW / 2, curY, { align: 'center' });
            curY += 2.8;
          }

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(0, 0, 0);
          const splitTitle = doc.splitTextToSize(product?.name || 'Produto', labelW - 4);
          doc.text(splitTitle.slice(0, 1), x + labelW / 2, curY, { align: 'center' });
          curY += 2.8;

          if (showVariants && (product?.size_or_variant || product?.color)) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6);
            const varParts: string[] = [];
            if (product.size_or_variant) varParts.push(`Tam: ${product.size_or_variant}`);
            if (product.color) varParts.push(`Cor: ${product.color}`);
            doc.text(varParts.join(' | '), x + labelW / 2, curY, { align: 'center' });
            curY += 2.2;
          }

          doc.addImage(barcodeImg, 'PNG', x + 4, curY, labelW - 8, 9.5);
          curY += 10.5;

          if (showPrice && product?.sale_price) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(formatCurrency(product.sale_price), x + labelW / 2, curY, { align: 'center' });
          }
        }

        doc.save(`etiquetas-a4-${product?.name ? product.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'produto'}.pdf`);
        toast({ title: 'PDF A4 gerado com sucesso! 📄', description: `${safeCopies} etiqueta(s) em formato folha A4.` });
      }
    } catch (err: any) {
      toast({ title: 'Erro ao gerar PDF', description: err.message, variant: 'destructive' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarcodeIcon className="h-5 w-5 text-primary" />
            Imprimir Código de Barras / Etiquetas
          </DialogTitle>
          <DialogDescription>
            Gere e imprima etiquetas térmicas ou em folha A4 prontas para rotulagem dos produtos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-3">
          {/* Coluna 1: Opções de Configuração */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="barcode-sku" className="text-xs font-semibold">Código / SKU da Etiqueta</Label>
                <button
                  type="button"
                  onClick={handleGenerateRandomSku}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1"
                  title="Gerar novo código de barras interno"
                >
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  Gerar EAN
                </button>
              </div>
              <div className="relative">
                <Input
                  id="barcode-sku"
                  value={skuCode}
                  onChange={(e) => setSkuCode(e.target.value)}
                  placeholder="Ex: 7891234567890 ou CAM-M-01"
                  className="font-mono text-xs h-9 pr-8"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(skuCode);
                    toast({ title: 'Código copiado!' });
                  }}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                  title="Copiar código"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="label-format" className="text-xs font-semibold">Formato do Papel</Label>
                <Select value={labelFormat} onValueChange={(v: any) => setLabelFormat(v)}>
                  <SelectTrigger id="label-format" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thermal_50x30">Térmica 50x30 mm (Padrão)</SelectItem>
                    <SelectItem value="thermal_60x40">Térmica 60x40 mm (Grande)</SelectItem>
                    <SelectItem value="sheet_a4">Folha A4 (Pimaco 3x10)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="label-copies" className="text-xs font-semibold">Quantidade</Label>
                  {product?.current_stock !== undefined && product.current_stock > 0 && (
                    <button
                      type="button"
                      onClick={() => setCopies(product.current_stock || 1)}
                      className="text-[10px] text-muted-foreground hover:text-primary font-medium"
                    >
                      Estoque ({product.current_stock})
                    </button>
                  )}
                </div>
                <Input
                  id="label-copies"
                  type="number"
                  min="1"
                  max="500"
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Alternadores Visuais */}
            <div className="p-3 bg-muted/30 border rounded-lg space-y-2.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Elementos Visíveis na Etiqueta
              </span>
              <div className="flex items-center justify-between">
                <Label htmlFor="toggle-price" className="text-xs font-normal cursor-pointer">Exibir Preço de Venda</Label>
                <Switch id="toggle-price" checked={showPrice} onCheckedChange={setShowPrice} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="toggle-variants" className="text-xs font-normal cursor-pointer">Exibir Tamanho / Cor</Label>
                <Switch id="toggle-variants" checked={showVariants} onCheckedChange={setShowVariants} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="toggle-company" className="text-xs font-normal cursor-pointer">Exibir Nome da Empresa</Label>
                <Switch id="toggle-company" checked={showCompany} onCheckedChange={setShowCompany} />
              </div>
            </div>
          </div>

          {/* Coluna 2: Live Preview da Etiqueta */}
          <div className="flex flex-col items-center justify-center p-4 bg-muted/40 rounded-xl border border-dashed border-border/80">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Pré-Visualização Real
            </span>

            {/* Mock da Etiqueta */}
            <div className="w-[200px] min-h-[125px] bg-white text-black rounded-lg p-2.5 shadow-md border border-neutral-300 flex flex-col items-center justify-between text-center select-none transition-all">
              {showCompany && (
                <span className="text-[8px] font-extrabold uppercase tracking-wide text-neutral-600 truncate max-w-full">
                  {companyName}
                </span>
              )}

              <span className="text-[10.5px] font-extrabold leading-tight line-clamp-2 mt-0.5 text-neutral-900 break-words">
                {product?.name || 'Nome do Produto'}
              </span>

              {showVariants && (product?.size_or_variant || product?.color) && (
                <div className="flex items-center gap-1.5 my-0.5 flex-wrap justify-center">
                  {product?.size_or_variant && (
                    <Badge variant="outline" className="text-[8.5px] px-1 py-0 h-3.5 bg-neutral-100 text-neutral-800 border-neutral-300 font-bold">
                      Tam: {product.size_or_variant}
                    </Badge>
                  )}
                  {product?.color && (
                    <Badge variant="outline" className="text-[8.5px] px-1 py-0 h-3.5 bg-neutral-100 text-neutral-800 border-neutral-300 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full border border-black/30" style={{ backgroundColor: getColorHex(product.color) }} />
                      {product.color}
                    </Badge>
                  )}
                </div>
              )}

              {/* Barcode SVG Container */}
              <div className="w-full flex justify-center my-0.5 overflow-hidden">
                <svg ref={previewSvgRef} className="max-w-full h-auto" />
              </div>

              {showPrice && product?.sale_price !== undefined && (
                <span className="text-xs font-black tracking-tight text-neutral-950 mt-0.5">
                  {formatCurrency(product.sale_price)}
                </span>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground mt-3 text-center">
              Total de etiquetas: <strong>{copies}</strong> ({labelFormat === 'sheet_a4' ? 'Folha A4' : 'Rolo Térmico'})
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || !skuCode.trim()}
              className="gap-1.5"
            >
              {isGeneratingPdf ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Baixar PDF
            </Button>
            <Button
              onClick={handlePrint}
              disabled={!skuCode.trim()}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Printer className="h-4 w-4" />
              Imprimir ({copies})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
