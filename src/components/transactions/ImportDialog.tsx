import React, { useState, useMemo, useCallback } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { TransactionType, PaymentMethod, Category } from '@/types/finance';
import { parseOFX, parseCSV, ParsedTransaction } from '@/utils/statementParsers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
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
import { 
  Upload, 
  FileText, 
  Check, 
  AlertTriangle, 
  Loader2, 
  Info,
  Calendar,
  DollarSign
} from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

interface MappingRow {
  parsedTx: ParsedTransaction;
  selected: boolean;
  categoryId: string;
  paymentMethod: PaymentMethod;
  isDuplicate: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const autoMatchCategory = (description: string, type: TransactionType, categories: Category[]): string => {
  const descLower = description.toLowerCase();
  const subcats = categories.filter(c => c.parentId !== null && c.type === type);
  
  for (const cat of subcats) {
    const catNameLower = cat.name.toLowerCase();
    // Only match if the description actually contains the category name (or specific keywords)
    if (descLower.includes(catNameLower)) {
      return cat.id;
    }
    // Keyword matching
    if (catNameLower.includes('aluguel') && (descLower.includes('aluguel') || descLower.includes('locac'))) return cat.id;
    if (catNameLower.includes('venda') && (descLower.includes('venda') || descLower.includes('compra') || descLower.includes('frente') || descLower.includes('receb'))) return cat.id;
    if (catNameLower.includes('salário') && (descLower.includes('salario') || descLower.includes('folha') || descLower.includes('pagamento') || descLower.includes('staff') || descLower.includes('pro-labore'))) return cat.id;
    if (catNameLower.includes('imposto') && (descLower.includes('imposto') || descLower.includes('simples') || descLower.includes('darf') || descLower.includes('tributo') || descLower.includes('das '))) return cat.id;
    if (catNameLower.includes('marketing') && (descLower.includes('marketing') || descLower.includes('ads') || descLower.includes('anuncio') || descLower.includes('propaganda') || descLower.includes('google') || descLower.includes('meta'))) return cat.id;
    if (catNameLower.includes('material') && (descLower.includes('material') || descLower.includes('dental') || descLower.includes('insumo') || descLower.includes('papelaria'))) return cat.id;
    if (catNameLower.includes('fornecedor') && (descLower.includes('fornecedor') || descLower.includes('distribuidora') || descLower.includes('mercadoria') || descLower.includes('compra'))) return cat.id;
  }
  
  // Do NOT fall back to Aluguel; return empty string to show placeholder
  return '';
};

const autoMatchPaymentMethod = (description: string): PaymentMethod => {
  const descLower = description.toLowerCase();
  if (descLower.includes('pix') || descLower.includes('ted') || descLower.includes('doc') || descLower.includes('transf')) {
    return 'pix';
  }
  if (descLower.includes('cartao') || descLower.includes('visa') || descLower.includes('master') || descLower.includes('elo') || descLower.includes('cred') || descLower.includes('deb')) {
    return 'card';
  }
  if (descLower.includes('dinheiro') || descLower.includes('espécie') || descLower.includes('saque')) {
    return 'cash';
  }
  return 'pending';
};

export const ImportDialog: React.FC<ImportDialogProps> = ({ isOpen, onClose, onImportSuccess }) => {
  const { currentClient, categories, transactions } = useFinance();
  const [step, setStep] = useState<1 | 2>(1);
  const [fileName, setFileName] = useState('');
  const [mappingRows, setMappingRows] = useState<MappingRow[]>([]);
  const [saving, setSaving] = useState(false);

  // Group categories by type for selectors
  const subcategoriesByType = useMemo(() => {
    return {
      income: categories.filter(c => c.parentId !== null && c.type === 'income'),
      expense: categories.filter(c => c.parentId !== null && c.type === 'expense')
    };
  }, [categories]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = async (event) => {
      const text = event.target?.result as string;
      let parsedTxs: ParsedTransaction[] = [];

      if (file.name.toLowerCase().endsWith('.ofx')) {
        parsedTxs = parseOFX(text);
      } else if (file.name.toLowerCase().endsWith('.csv')) {
        parsedTxs = parseCSV(text);
      } else {
        toast({ title: 'Formato inválido', description: 'Por favor, envie um arquivo .ofx ou .csv', variant: 'destructive' });
        return;
      }

      if (parsedTxs.length === 0) {
        toast({ title: 'Nenhuma transação encontrada', description: 'Verifique se o arquivo está no formato correto.', variant: 'destructive' });
        return;
      }

      // Check duplicates and prepare rows
      const rows: MappingRow[] = parsedTxs.map(pt => {
        // Duplicate check
        const isDuplicate = transactions.some(t => {
          // If OFX fitid is available and matches reference
          if (pt.fitid && t.reference === pt.fitid) return true;
          // Fallback comparison
          const matchDate = isSameDay(new Date(t.date), pt.date);
          const matchAmount = Number(t.amount) === pt.amount;
          const matchDesc = t.description.toLowerCase().trim() === pt.description.toLowerCase().trim();
          return matchDate && matchAmount && matchDesc;
        });

        const categoryId = autoMatchCategory(pt.description, pt.type, categories);
        const paymentMethod = autoMatchPaymentMethod(pt.description);

        return {
          parsedTx: pt,
          selected: !isDuplicate, // Deselect duplicates by default
          categoryId,
          paymentMethod,
          isDuplicate
        };
      });

      setMappingRows(rows);
      setStep(2);
    };

    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!currentClient) return;
    const selectedRows = mappingRows.filter(r => r.selected);
    if (selectedRows.length === 0) {
      toast({ title: 'Aviso', description: 'Selecione pelo menos uma transação para importar.' });
      return;
    }

    // Check if any selected transaction has no category assigned
    const missingCategory = selectedRows.some(r => !r.categoryId);
    if (missingCategory) {
      toast({
        title: 'Categoria obrigatória',
        description: 'Selecione uma categoria válida para todas as transações marcadas.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const transactionsToInsert = selectedRows.map(r => ({
        client_id: currentClient.id,
        user_id: user.id,
        category_id: r.categoryId,
        type: r.parsedTx.type,
        amount: r.parsedTx.amount,
        description: r.parsedTx.description,
        date: format(r.parsedTx.date, 'yyyy-MM-dd'),
        reference: r.parsedTx.fitid || null,
        payment_method: r.paymentMethod || null,
      }));

      const { error } = await supabase.from('transactions').insert(transactionsToInsert);
      if (error) throw error;

      toast({ 
        title: 'Importação concluída!', 
        description: `${transactionsToInsert.length} lançamentos foram importados com sucesso.` 
      });
      onImportSuccess();
      onClose();
      // Reset state
      setStep(1);
      setFileName('');
      setMappingRows([]);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao importar', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleRowCheckboxChange = (index: number, checked: boolean) => {
    setMappingRows(prev => prev.map((row, idx) => idx === index ? { ...row, selected: checked } : row));
  };

  const handleRowCategoryChange = (index: number, categoryId: string) => {
    setMappingRows(prev => prev.map((row, idx) => idx === index ? { ...row, categoryId } : row));
  };

  const handleRowPaymentChange = (index: number, paymentMethod: PaymentMethod) => {
    setMappingRows(prev => prev.map((row, idx) => idx === index ? { ...row, paymentMethod } : row));
  };

  const handleSelectAll = (checked: boolean) => {
    // Select all non-duplicate items, or all items
    setMappingRows(prev => prev.map(row => ({ ...row, selected: checked })));
  };

  const selectedCount = mappingRows.filter(r => r.selected).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Importar Extrato Bancário
          </DialogTitle>
          <DialogDescription>
            Envie arquivos nos formatos .OFX ou .CSV obtidos diretamente no painel do seu banco.
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 space-y-4 hover:bg-muted/30 transition-colors relative cursor-pointer group">
            <input
              type="file"
              accept=".ofx,.csv"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="p-4 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
              <Upload className="h-8 w-8" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">Clique ou arraste seu arquivo aqui</p>
              <p className="text-xs text-muted-foreground mt-1">Formatos suportados: .OFX ou .CSV</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            <div className="flex items-center justify-between bg-muted/40 p-3 rounded-lg text-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium truncate max-w-xs">{fileName}</span>
                <span className="text-xs text-muted-foreground font-mono">({mappingRows.length} lançamentos encontrados)</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                Alterar arquivo
              </Button>
            </div>

            <div className="flex-1 overflow-auto border rounded-lg">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-[50px] text-center">
                      <Checkbox
                        checked={mappingRows.length > 0 && selectedCount === mappingRows.length}
                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      />
                    </TableHead>
                    <TableHead className="w-[100px]">Data</TableHead>
                    <TableHead className="max-w-[200px]">Descrição</TableHead>
                    <TableHead className="text-right w-[110px]">Valor</TableHead>
                    <TableHead className="w-[200px]">Categoria *</TableHead>
                    <TableHead className="w-[150px]">Forma de Pagto</TableHead>
                    <TableHead className="w-[100px] text-center">Conciliação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappingRows.map((row, idx) => {
                    const isExpense = row.parsedTx.type === 'expense';
                    const availableCats = subcategoriesByType[row.parsedTx.type];

                    return (
                      <TableRow key={idx} className={cn(row.isDuplicate && "bg-amber-50/20 text-muted-foreground")}>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={row.selected}
                            onCheckedChange={(checked) => handleRowCheckboxChange(idx, !!checked)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {format(row.parsedTx.date, 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="font-medium text-xs max-w-[200px] truncate" title={row.parsedTx.description}>
                          {row.parsedTx.description}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-mono text-xs font-semibold",
                          isExpense ? "text-expense" : "text-income"
                        )}>
                          {isExpense ? '-' : ''}{formatCurrency(row.parsedTx.amount)}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.categoryId}
                            onValueChange={(val) => handleRowCategoryChange(idx, val)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {availableCats.map(cat => (
                                <SelectItem key={cat.id} value={cat.id} className="text-xs">
                                  {cat.code} - {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.paymentMethod}
                            onValueChange={(val) => handleRowPaymentChange(idx, val as PaymentMethod)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pix" className="text-xs">PIX</SelectItem>
                              <SelectItem value="card" className="text-xs">Cartão</SelectItem>
                              <SelectItem value="cash" className="text-xs">Dinheiro</SelectItem>
                              <SelectItem value="pending" className="text-xs">A Receber/Pagar</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">
                          {row.isDuplicate ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                              <AlertTriangle className="h-3 w-3" /> Duplicado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-100 text-green-800 text-[10px] font-semibold">
                              <Check className="h-3 w-3" /> Novo
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4 flex sm:justify-between items-center w-full gap-2">
          {step === 2 && (
            <p className="text-xs text-muted-foreground mr-auto">
              Importando <strong>{selectedCount}</strong> de <strong>{mappingRows.length}</strong> lançamentos selecionados.
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            {step === 2 && (
              <Button onClick={handleImport} disabled={saving} className="gap-2">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Confirmar Importação
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
