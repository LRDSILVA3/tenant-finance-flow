// Reports Component - Contains custom financial reports: DRE, Collaborator Commissions, Distribution Charts, Projection, Break-Even, Payables, and Margin Analysis

import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart3, 
  CalendarIcon, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Lock, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  PieChart as PieIcon,
  DollarSign,
  Briefcase,
  LineChart as LineChartIcon,
  Percent,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  Package,
  AlertTriangle,
  Truck
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
};

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  client_id: string;
  supplier_id: string | null;
  name: string;
  sku: string | null;
  cost_price: number;
  sale_price: number;
  current_stock: number;
  min_stock: number;
}

type PeriodType = 'month' | 'quarter' | 'semester' | 'year' | 'custom';

export const Reports: React.FC = () => {
  const {
    t,
    currentClient,
    transactions,
    categories,
    collaborators,
    getCategoryById,
    getCollaboratorById,
    userSettings,
  } = useFinance();

  const { hasFeature } = useFeatureAccess();
  const isAdvancedReportsLocked = !hasFeature('advanced_reports');

  // Filters State
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const now = new Date();
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(now));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(now));
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');

  // internal tabs state
  const [activeReportTab, setActiveReportTab] = useState<string>('dre');

  // Inventory State
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);

  useEffect(() => {
    const fetchInventoryData = async () => {
      if (!currentClient) return;
      setLoadingInventory(true);
      try {
        const { data: suppliersData } = await supabase
          .from('suppliers')
          .select('id, name')
          .eq('client_id', currentClient.id);
        
        const { data: productsData } = await supabase
          .from('products')
          .select('*')
          .eq('client_id', currentClient.id);
        
        if (suppliersData) setSuppliers(suppliersData as Supplier[]);
        if (productsData) setProducts(productsData as Product[]);
      } catch (err) {
        console.error('Erro ao buscar dados de estoque:', err);
      } finally {
        setLoadingInventory(false);
      }
    };

    fetchInventoryData();
  }, [currentClient, activeReportTab]); // Refresh when tab changes or client changes

  const inventoryReportData = useMemo(() => {
    let totalItems = 0;
    let totalCostValuation = 0;
    let totalSaleValuation = 0;
    const criticalItems: Product[] = [];
    const supplierTotals: Record<string, { name: string; itemsCount: number; costValuation: number; saleValuation: number }> = {};

    // Initialize suppliers
    suppliers.forEach(s => {
      supplierTotals[s.id] = { name: s.name, itemsCount: 0, costValuation: 0, saleValuation: 0 };
    });
    // Add fallback for null supplier
    supplierTotals['none'] = { name: 'Sem Fornecedor', itemsCount: 0, costValuation: 0, saleValuation: 0 };

    products.forEach(p => {
      totalItems += p.current_stock;
      const costVal = p.current_stock * Number(p.cost_price);
      const saleVal = p.current_stock * Number(p.sale_price);
      totalCostValuation += costVal;
      totalSaleValuation += saleVal;

      if (p.current_stock <= p.min_stock) {
        criticalItems.push(p);
      }

      const supplierId = p.supplier_id || 'none';
      if (!supplierTotals[supplierId]) {
        supplierTotals[supplierId] = { 
          name: suppliers.find(s => s.id === supplierId)?.name || 'Desconhecido', 
          itemsCount: 0, 
          costValuation: 0, 
          saleValuation: 0 
        };
      }
      supplierTotals[supplierId].itemsCount += p.current_stock;
      supplierTotals[supplierId].costValuation += costVal;
      supplierTotals[supplierId].saleValuation += saleVal;
    });

    const supplierSummaries = Object.values(supplierTotals)
      .filter(s => s.itemsCount > 0 || s.costValuation > 0)
      .sort((a, b) => b.costValuation - a.costValuation);

    return {
      totalItems,
      totalCostValuation,
      totalSaleValuation,
      totalMarkup: totalSaleValuation - totalCostValuation,
      criticalItems: criticalItems.sort((a, b) => a.current_stock - b.current_stock),
      supplierSummaries
    };
  }, [products, suppliers]);

  // Date period helper
  const handlePeriodTypeChange = (type: PeriodType) => {
    setPeriodType(type);
    const today = new Date();
    
    switch (type) {
      case 'month':
        setStartDate(startOfMonth(today));
        setEndDate(endOfMonth(today));
        break;
      case 'quarter':
        setStartDate(startOfMonth(subMonths(today, 2)));
        setEndDate(endOfMonth(today));
        break;
      case 'semester':
        setStartDate(startOfMonth(subMonths(today, 5)));
        setEndDate(endOfMonth(today));
        break;
      case 'year':
        setStartDate(startOfYear(today));
        setEndDate(endOfYear(today));
        break;
      case 'custom':
        // Keep current dates
        break;
    }
  };

  // Filtered transactions for the selected range
  const filteredTransactions = useMemo(() => {
    return transactions.filter(txn => {
      const txnDate = new Date(txn.date);
      if (startDate && txnDate < startDate) return false;
      if (endDate && txnDate > endDate) return false;
      if (paymentMethodFilter !== 'all' && txn.paymentMethod !== paymentMethodFilter) return false;
      return true;
    });
  }, [transactions, startDate, endDate, paymentMethodFilter]);

  // 1. DRE Calculation
  const dreData = useMemo(() => {
    let incomeTotal = 0;
    let expenseTotal = 0;
    const categoryTotals: Record<string, { name: string; amount: number; code: string }> = {};

    filteredTransactions.forEach(txn => {
      if (txn.type === 'income') {
        incomeTotal += txn.amount;
      } else {
        expenseTotal += txn.amount;
        const cat = getCategoryById(txn.categoryId);
        if (cat) {
          let rootCat = cat;
          if (cat.parentId) {
            const parent = categories.find(c => c.id === cat.parentId);
            if (parent) rootCat = parent;
          }
          
          if (!categoryTotals[rootCat.id]) {
            categoryTotals[rootCat.id] = { name: rootCat.name, amount: 0, code: rootCat.code };
          }
          categoryTotals[rootCat.id].amount += txn.amount;
        }
      }
    });

    const operatingExpensesList = Object.values(categoryTotals).sort((a, b) => b.amount - a.amount);
    const netProfit = incomeTotal - expenseTotal;
    const grossMarginPercent = incomeTotal > 0 ? (netProfit / incomeTotal) * 100 : 0;

    return {
      grossRevenue: incomeTotal,
      totalExpenses: expenseTotal,
      operatingExpenses: operatingExpensesList,
      netResult: netProfit,
      marginPercent: grossMarginPercent
    };
  }, [filteredTransactions, categories, getCategoryById]);

  // 2. Collaborator Commissions Calculation
  const collaboratorReport = useMemo(() => {
    const report: Record<string, { name: string; totalSales: number; totalCommissions: number; txCount: number }> = {};
    
    collaborators.forEach(col => {
      report[col.id] = { name: col.name, totalSales: 0, totalCommissions: 0, txCount: 0 };
    });

    filteredTransactions.forEach(txn => {
      if (txn.type === 'income') {
        const commissionsList = txn.commissions || [];
        if (commissionsList.length > 0) {
          commissionsList.forEach(comm => {
            const collabId = comm.collaboratorId;
            if (!report[collabId]) {
              const col = getCollaboratorById(collabId);
              report[collabId] = { 
                name: col?.name || 'Desconhecido', 
                totalSales: 0, 
                totalCommissions: 0, 
                txCount: 0 
              };
            }
            report[collabId].totalSales += txn.amount;
            report[collabId].totalCommissions += comm.commissionAmount;
            report[collabId].txCount += 1;
          });
        } else if (txn.collaboratorId) {
          const collabId = txn.collaboratorId;
          if (!report[collabId]) {
            const col = getCollaboratorById(collabId);
            report[collabId] = { 
              name: col?.name || 'Desconhecido', 
              totalSales: 0, 
              totalCommissions: 0, 
              txCount: 0 
            };
          }
          report[collabId].totalSales += txn.amount;
          report[collabId].totalCommissions += txn.commissionAmount || 0;
          report[collabId].txCount += 1;
        }
      }
    });

    return Object.values(report).sort((a, b) => b.totalSales - a.totalSales);
  }, [filteredTransactions, collaborators, getCollaboratorById]);

  // 3. Distribution Chart Data
  const categoryDistributionData = useMemo(() => {
    const incomeCats: Record<string, number> = {};
    const expenseCats: Record<string, number> = {};

    filteredTransactions.forEach(txn => {
      const cat = getCategoryById(txn.categoryId);
      if (!cat) return;

      if (txn.type === 'income') {
        incomeCats[cat.name] = (incomeCats[cat.name] || 0) + txn.amount;
      } else {
        expenseCats[cat.name] = (expenseCats[cat.name] || 0) + txn.amount;
      }
    });

    const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#64748B'];

    const income = Object.entries(incomeCats).map(([name, value], i) => ({
      name,
      value,
      color: COLORS[i % COLORS.length]
    })).sort((a, b) => b.value - a.value);

    const expense = Object.entries(expenseCats).map(([name, value], i) => ({
      name,
      value,
      color: COLORS[i % COLORS.length]
    })).sort((a, b) => b.value - a.value);

    return { income, expense };
  }, [filteredTransactions, getCategoryById]);

  // 4. Projected Cash Flow
  const projectionData = useMemo(() => {
    // Current actual balance
    const currentBalance = transactions
      .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);

    const monthsData = [];
    let runningBalance = currentBalance;

    // Monthly average (based on historical transactions)
    const historicalIncomes = transactions.filter(t => t.type === 'income');
    const historicalExpenses = transactions.filter(t => t.type === 'expense');

    const totalIncomeHist = historicalIncomes.reduce((s, t) => s + t.amount, 0);
    const totalExpenseHist = historicalExpenses.reduce((s, t) => s + t.amount, 0);

    // Calculate dynamic average per month (rough fallback)
    const avgMonthlyIncome = transactions.length > 0 ? (totalIncomeHist / 4) : 10000;
    const avgMonthlyExpense = transactions.length > 0 ? (totalExpenseHist / 4) : 8000;

    for (let i = 1; i <= 3; i++) {
      const nextMonthDate = addMonths(new Date(), i);
      const monthLabel = format(nextMonthDate, 'MMMM/yy', { locale: ptBR });
      
      // Calculate future scheduled transactions for this month if any
      const scheduledIncomes = transactions
        .filter(t => t.type === 'income' && new Date(t.date).getMonth() === nextMonthDate.getMonth() && new Date(t.date).getFullYear() === nextMonthDate.getFullYear())
        .reduce((s, t) => s + t.amount, 0);

      const scheduledExpenses = transactions
        .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === nextMonthDate.getMonth() && new Date(t.date).getFullYear() === nextMonthDate.getFullYear())
        .reduce((s, t) => s + t.amount, 0);

      // Use either scheduled transactions or the historical average
      const projectedIncome = scheduledIncomes > 0 ? scheduledIncomes : avgMonthlyIncome * (1 + (i * 0.05)); // 5% growth projection
      const projectedExpense = scheduledExpenses > 0 ? scheduledExpenses : avgMonthlyExpense;
      runningBalance = runningBalance + projectedIncome - projectedExpense;

      monthsData.push({
        month: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
        Receitas: Math.round(projectedIncome),
        Despesas: Math.round(projectedExpense),
        SaldoProjetado: Math.round(runningBalance)
      });
    }

    return { currentBalance, monthsData };
  }, [transactions]);

  // 5. Break-Even Point Calculations
  const breakEvenData = useMemo(() => {
    let fixedCosts = 0;
    let variableCosts = 0;
    const totalRevenue = dreData.grossRevenue || 1;

    filteredTransactions.forEach(txn => {
      if (txn.type === 'expense') {
        const cat = getCategoryById(txn.categoryId);
        if (cat) {
          // Fixed vs Variable Classification
          // 'Aluguel', 'Salários', 'Secretária' are treated as Fixed
          const nameLower = cat.name.toLowerCase();
          if (nameLower.includes('aluguel') || nameLower.includes('salário') || nameLower.includes('secretária') || nameLower.includes('recepção')) {
            fixedCosts += txn.amount;
          } else {
            variableCosts += txn.amount;
          }
        }
      }
    });

    // Add collaborator commissions to variable costs
    collaboratorReport.forEach(col => {
      variableCosts += col.totalCommissions;
    });

    const variableCostsPercent = totalRevenue > 0 ? variableCosts / totalRevenue : 0;
    const contributionMarginRatio = 1 - variableCostsPercent;

    const breakEvenPoint = contributionMarginRatio > 0.1 
      ? fixedCosts / contributionMarginRatio 
      : fixedCosts * 1.5; // fallback if margin ratio is zero or negative

    const currentRevenue = dreData.grossRevenue;
    const breakEvenProgress = breakEvenPoint > 0 ? Math.min((currentRevenue / breakEvenPoint) * 100, 100) : 0;

    return {
      fixedCosts,
      variableCosts,
      contributionMarginRatio,
      breakEvenPoint,
      currentRevenue,
      breakEvenProgress
    };
  }, [filteredTransactions, dreData.grossRevenue, getCategoryById, collaboratorReport]);

  // 6. Accounts Payable vs. Accounts Receivable
  const payablesData = useMemo(() => {
    let accountsReceivable = 0;
    let accountsPayable = 0;
    let confirmedIncome = 0;
    let confirmedExpense = 0;

    filteredTransactions.forEach(txn => {
      if (txn.type === 'income') {
        if (txn.paymentMethod === 'pending' || !txn.paymentMethod) {
          accountsReceivable += txn.amount;
        } else {
          confirmedIncome += txn.amount;
        }
      } else {
        if (txn.paymentMethod === 'pending' || !txn.paymentMethod) {
          accountsPayable += txn.amount;
        } else {
          confirmedExpense += txn.amount;
        }
      }
    });

    return {
      accountsReceivable,
      accountsPayable,
      confirmedIncome,
      confirmedExpense,
      netPending: accountsReceivable - accountsPayable
    };
  }, [filteredTransactions]);

  // 7. Margin Analysis by Category
  const marginsByCategory = useMemo(() => {
    const report: Record<string, { name: string; revenue: number; commissions: number; code: string }> = {};

    // Get root income categories
    categories.filter(c => c.parentId === null && c.type === 'income').forEach(rootCat => {
      report[rootCat.id] = { name: rootCat.name, revenue: 0, commissions: 0, code: rootCat.code };
    });

    filteredTransactions.forEach(txn => {
      if (txn.type === 'income') {
        const cat = getCategoryById(txn.categoryId);
        if (cat) {
          let rootCat = cat;
          if (cat.parentId) {
            const parent = categories.find(c => c.id === cat.parentId);
            if (parent) rootCat = parent;
          }
          if (report[rootCat.id]) {
            report[rootCat.id].revenue += txn.amount;
            report[rootCat.id].commissions += txn.commissionAmount || 0;
          }
        }
      }
    });

    return Object.values(report)
      .map(item => {
        const netMargin = item.revenue - item.commissions;
        const marginPercent = item.revenue > 0 ? (netMargin / item.revenue) * 100 : 0;
        return {
          ...item,
          netMargin,
          marginPercent
        };
      })
      .filter(item => item.revenue > 0)
      .sort((a, b) => b.netMargin - a.netMargin);
  }, [filteredTransactions, categories, getCategoryById]);

  // Export report to PDF
  const handleExportPdf = () => {
    if (!currentClient) return;

    const doc = new jsPDF({ orientation: 'portrait' });
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title & Header info
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    
    let reportTitle = '';
    if (activeReportTab === 'dre') {
      reportTitle = 'Demonstracao do Resultado do Exercito (DRE)';
    } else if (activeReportTab === 'commissions') {
      reportTitle = 'Relatorio de Comissoes por Colaborador';
    } else if (activeReportTab === 'projection') {
      reportTitle = 'Projecao de Fluxo de Caixa';
    } else if (activeReportTab === 'breakeven') {
      reportTitle = 'Analise do Ponto de Equilibrio (Break-Even)';
    } else if (activeReportTab === 'payables') {
      reportTitle = 'Contas a Pagar e a Receber (Provisoes)';
    } else if (activeReportTab === 'margins') {
      reportTitle = 'Analise de Margem por Categoria';
    } else if (activeReportTab === 'inventory') {
      reportTitle = 'Relatorio de Estoque e Inventario';
    } else {
      reportTitle = 'Distribuicao de Receitas e Despesas por Categoria';
    }

    doc.text(reportTitle, pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(currentClient.name, pageWidth / 2, 27, { align: 'center' });

    const periodStr = `Periodo: ${startDate ? format(startDate, 'dd/MM/yyyy') : 'Inicio'} ate ${endDate ? format(endDate, 'dd/MM/yyyy') : 'Fim'}`;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(periodStr, pageWidth / 2, 33, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    const yPos = 42;

    if (activeReportTab === 'dre') {
      const tableRows: string[][] = [];
      tableRows.push(['1. RECEITA OPERACIONAL BRUTA', formatCurrency(dreData.grossRevenue), '100.0%']);

      categories.filter(c => c.parentId === null && c.type === 'income').forEach(rootCat => {
        const amount = filteredTransactions
          .filter(t => {
            const cat = getCategoryById(t.categoryId);
            return cat && (cat.id === rootCat.id || cat.parentId === rootCat.id);
          })
          .reduce((s, t) => s + t.amount, 0);

        if (amount > 0) {
          tableRows.push([
            `   1.1. ${rootCat.name}`,
            formatCurrency(amount),
            `${dreData.grossRevenue > 0 ? ((amount / dreData.grossRevenue) * 100).toFixed(1) : 0}%`
          ]);
        }
      });

      tableRows.push(['2. (-) DESPESAS OPERACIONAIS', `(${formatCurrency(dreData.totalExpenses)})`, `${dreData.grossRevenue > 0 ? ((-dreData.totalExpenses / dreData.grossRevenue) * 100).toFixed(1) : 0}%`]);

      dreData.operatingExpenses.forEach((exp, idx) => {
        tableRows.push([
          `   2.${idx+1}. ${exp.name}`,
          `(${formatCurrency(exp.amount)})`,
          `${dreData.grossRevenue > 0 ? ((-exp.amount / dreData.grossRevenue) * 100).toFixed(1) : 0}%`
        ]);
      });

      tableRows.push(['RESULTADO LIQUIDO DO EXERCICIO', formatCurrency(dreData.netResult), `${dreData.marginPercent.toFixed(1)}%`]);

      autoTable(doc, {
        startY: yPos,
        head: [['Conta Contabil / Descricao', 'Valor', '% Receita']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 50, halign: 'right' },
          2: { cellWidth: 30, halign: 'right' }
        },
        didParseCell: (data) => {
          const rowText = String(data.cell.raw);
          if (rowText.startsWith('1.') || rowText.startsWith('2.') || rowText.startsWith('RESULTADO')) {
            data.cell.styles.fontStyle = 'bold';
            if (rowText.startsWith('1.')) data.cell.styles.textColor = [16, 185, 129];
            if (rowText.startsWith('2.')) data.cell.styles.textColor = [239, 68, 68];
          }
        }
      });
    } else if (activeReportTab === 'commissions') {
      const tableRows = collaboratorReport.map(col => {
        const avgSale = col.txCount > 0 ? col.totalSales / col.txCount : 0;
        return [
          col.name,
          formatCurrency(col.totalSales),
          formatCurrency(avgSale),
          String(col.txCount),
          formatCurrency(col.totalCommissions)
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Colaborador', 'Servicos/Vendas Totais', 'Media p/ Lancamento', 'Lancamentos', 'Comissao Gerada']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 40, halign: 'right' },
          2: { cellWidth: 35, halign: 'right' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 30, halign: 'right' }
        }
      });
    } else if (activeReportTab === 'projection') {
      const tableRows = projectionData.monthsData.map(m => [
        m.month,
        formatCurrency(m.Receitas),
        formatCurrency(m.Despesas),
        formatCurrency(m.SaldoProjetado)
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Mes Projetado', 'Receitas Previstas', 'Despesas Previstas', 'Saldo Final Projetado']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 }
      });
    } else if (activeReportTab === 'breakeven') {
      const tableRows = [
        ['Custos Fixos Totais', formatCurrency(breakEvenData.fixedCosts)],
        ['Custos Variaveis Totais', formatCurrency(breakEvenData.variableCosts)],
        ['Margem de Contribuicao (%)', `${(breakEvenData.contributionMarginRatio * 100).toFixed(1)}%`],
        ['Ponto de Equilibrio (Valor Necessario)', formatCurrency(breakEvenData.breakEvenPoint)],
        ['Faturamento no Periodo', formatCurrency(breakEvenData.currentRevenue)],
        ['Status da Meta', breakEvenData.currentRevenue >= breakEvenData.breakEvenPoint ? 'Lucro' : 'Abaixo do Break-Even']
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Metrica Financeira', 'Resultado']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' }
      });
    } else if (activeReportTab === 'payables') {
      const tableRows = [
        ['Contas a Receber (Provedores/Pendentes)', formatCurrency(payablesData.accountsReceivable)],
        ['Contas a Pagar (Despesas/Pendentes)', formatCurrency(payablesData.accountsPayable)],
        ['Faturamento Recebido (Confirmado)', formatCurrency(payablesData.confirmedIncome)],
        ['Faturamento Pago (Confirmado)', formatCurrency(payablesData.confirmedExpense)],
        ['Saldo Liquido Pendente', formatCurrency(payablesData.netPending)]
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Tipo de Provisao', 'Valor Acumulado']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' }
      });
    } else if (activeReportTab === 'margins') {
      const tableRows = marginsByCategory.map(m => [
        m.name,
        formatCurrency(m.revenue),
        formatCurrency(m.commissions),
        formatCurrency(m.netMargin),
        `${m.marginPercent.toFixed(1)}%`
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Categoria de Receita', 'Receita Bruta', 'Comissoes', 'Margem Liquida', 'Margem (%)']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' }
      });
    } else if (activeReportTab === 'inventory') {
      const summaryRows = [
        ['Itens Totais em Estoque', String(inventoryReportData.totalItems)],
        ['Valoracao (Custo/Pago)', formatCurrency(inventoryReportData.totalCostValuation)],
        ['Valoracao (Preco de Venda)', formatCurrency(inventoryReportData.totalSaleValuation)],
        ['Lucro Estimado / Markup', formatCurrency(inventoryReportData.totalMarkup)]
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Resumo do Inventario', 'Valor']],
        body: summaryRows,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' }
      });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      const nextY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
      doc.text('Lista de Produtos em Estoque', 14, nextY);

      const productRows = products.map(p => {
        const supplierName = suppliers.find(s => s.id === p.supplier_id)?.name || 'Sem Fornecedor';
        return [
          p.sku || '-',
          p.name,
          supplierName,
          formatCurrency(Number(p.cost_price)),
          formatCurrency(Number(p.sale_price)),
          String(p.current_stock),
          formatCurrency(p.current_stock * Number(p.cost_price))
        ];
      });

      autoTable(doc, {
        startY: nextY + 4,
        head: [['SKU', 'Produto', 'Fornecedor', 'Custo', 'Venda', 'Estoque', 'Total (Custo)']],
        body: productRows,
        theme: 'striped',
        headStyles: { fillColor: [75, 85, 99], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 }
      });
    } else {
      const tableRows: string[][] = [];
      tableRows.push(['RECEITAS', '', '']);
      categoryDistributionData.income.forEach(item => {
        tableRows.push([`  ${item.name}`, formatCurrency(item.value), '']);
      });

      tableRows.push(['DESPESAS', '', '']);
      categoryDistributionData.expense.forEach(item => {
        tableRows.push([`  ${item.name}`, formatCurrency(item.value), '']);
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Categoria', 'Total', '']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 50, halign: 'right' },
          2: { cellWidth: 30 }
        },
        didParseCell: (data) => {
          const rowText = String(data.cell.raw);
          if (rowText === 'RECEITAS' || rowText === 'DESPESAS') {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
            if (rowText === 'RECEITAS') data.cell.styles.textColor = [16, 185, 129];
            if (rowText === 'DESPESAS') data.cell.styles.textColor = [239, 68, 68];
          }
        }
      });
    }

    // Save
    const fileName = `relatorio_${activeReportTab}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`;
    doc.save(fileName);
    toast({ title: 'Relatório exportado!', description: 'O download do PDF iniciará automaticamente.' });
  };

  const handlePrint = () => {
    window.print();
  };

  if (!currentClient) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Por favor, selecione um cliente para visualizar os relatórios.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in print:p-0 print:space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div className="page-header mb-0">
          <h2 className="page-title">Relatórios Personalizados</h2>
          <p className="page-subtitle">Análises contábeis e de comissão para a tomada de decisão.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportPdf} className="gap-2 mr-2">
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <FileText className="h-4 w-4" />
            Imprimir Relatório
          </Button>
        </div>
      </div>

      {/* Filters Box */}
      <div className="finance-card p-4 print:border-none print:shadow-none print:p-0">
        <div className="flex flex-wrap items-end gap-4 print:hidden">
          {/* Period Selection */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Período de Análise</Label>
            <Select value={periodType} onValueChange={(v) => handlePeriodTypeChange(v as PeriodType)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Mês Atual</SelectItem>
                <SelectItem value="quarter">Últimos 3 Meses</SelectItem>
                <SelectItem value="semester">Últimos 6 Meses</SelectItem>
                <SelectItem value="year">Ano Atual</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date range picker if custom */}
          {periodType === 'custom' && (
            <div className="flex items-center gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">De</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 w-[140px] justify-start">
                      <CalendarIcon className="h-4 w-4" />
                      {startDate ? format(startDate, 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Até</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 w-[140px] justify-start">
                      <CalendarIcon className="h-4 w-4" />
                      {endDate ? format(endDate, 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Payment Method filter */}
          {userSettings.enablePaymentMethods && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Forma de Recebimento</Label>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as formas</SelectItem>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                  <SelectItem value="card">Cartão</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="pending">A Receber</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Print Only Header showing active filters */}
        <div className="hidden print:block border-b pb-4 mb-4">
          <h1 className="text-2xl font-bold">{currentClient.name}</h1>
          <p className="text-sm text-muted-foreground">
            Período: {startDate ? formatDate(startDate) : 'Início'} até {endDate ? formatDate(endDate) : 'Fim'}
          </p>
          {paymentMethodFilter !== 'all' && (
            <p className="text-xs text-muted-foreground">Filtro de pagamento: {paymentMethodFilter.toUpperCase()}</p>
          )}
        </div>
      </div>

      {isAdvancedReportsLocked ? (
        <Card className="relative overflow-hidden border-amber-100 bg-amber-50/10 py-12">
          <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
            <div className="p-4 rounded-full bg-amber-100 text-amber-600 mb-4 shadow-sm">
              <Lock className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Relatórios Avançados Bloqueados</h3>
            <p className="text-sm text-muted-foreground mb-6">
              A Demonstração do Resultado do Exercício (DRE), relatórios de comissão detalhados e gráficos de distribuição estão disponíveis apenas nos planos Intermediário e Avançado.
            </p>
            <Button size="default" onClick={() => {
              const settingsTab = document.querySelector('[data-value="settings"]') as HTMLElement;
              if (settingsTab) settingsTab.click();
            }}>
              Ver Assinaturas e Planos
            </Button>
          </div>
        </Card>
      ) : (
        <Tabs defaultValue="dre" className="w-full print:space-y-4" value={activeReportTab} onValueChange={setActiveReportTab}>
          <TabsList className="mb-4 flex-wrap print:hidden h-auto gap-1 bg-transparent border-b rounded-none p-0">
            <TabsTrigger value="dre" className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
              <FileSpreadsheet className="h-4 w-4" />
              DRE Simplificado
            </TabsTrigger>
            {userSettings.enableCommission && (
              <TabsTrigger value="commissions" className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
                <Users className="h-4 w-4" />
                Comissões
              </TabsTrigger>
            )}
            <TabsTrigger value="distribution" className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
              <PieIcon className="h-4 w-4" />
              Distribuição
            </TabsTrigger>
            <TabsTrigger value="projection" className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
              <LineChartIcon className="h-4 w-4" />
              Fluxo Projetado
            </TabsTrigger>
            <TabsTrigger value="breakeven" className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
              <Calculator className="h-4 w-4" />
              Ponto de Equilíbrio
            </TabsTrigger>
            <TabsTrigger value="payables" className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
              <Layers className="h-4 w-4" />
              Contas Pagar/Receber
            </TabsTrigger>
            <TabsTrigger value="margins" className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
              <Percent className="h-4 w-4" />
              Análise de Margem
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
              <Package className="h-4 w-4" />
              Estoque e Inventário
            </TabsTrigger>
          </TabsList>

          {/* DRE Tab */}
          <TabsContent value="dre" className="space-y-4 print:block">
            <Card className="border shadow-md">
              <CardHeader className="print:pb-2">
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  Demonstração do Resultado do Exercício (DRE)
                </CardTitle>
                <CardDescription className="print:hidden">
                  Exibição estruturada do desempenho financeiro no período selecionado.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="overflow-hidden border rounded-lg">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-semibold text-foreground">Conta Contábil / Descrição</TableHead>
                        <TableHead className="text-right font-semibold text-foreground w-[150px]">Valor</TableHead>
                        <TableHead className="text-right font-semibold text-foreground w-[100px]">% Receita</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Receita Bruta */}
                      <TableRow className="font-semibold hover:bg-transparent">
                        <TableCell className="text-base text-income flex items-center gap-1.5">
                          <TrendingUp className="h-4 w-4" />
                          1. RECEITA OPERACIONAL BRUTA
                        </TableCell>
                        <TableCell className="text-right text-base text-income font-mono">
                          {formatCurrency(dreData.grossRevenue)}
                        </TableCell>
                        <TableCell className="text-right text-base font-mono">100%</TableCell>
                      </TableRow>

                      {/* Detail Income categories if they have values */}
                      {categories.filter(c => c.parentId === null && c.type === 'income').map(rootCat => {
                        const amount = filteredTransactions
                          .filter(t => {
                            const cat = getCategoryById(t.categoryId);
                            return cat && (cat.id === rootCat.id || cat.parentId === rootCat.id);
                          })
                          .reduce((s, t) => s + t.amount, 0);

                        if (amount === 0) return null;
                        return (
                          <TableRow key={rootCat.id} className="hover:bg-transparent text-sm text-muted-foreground pl-4">
                            <TableCell className="pl-8">1.1. {rootCat.name}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(amount)}</TableCell>
                            <TableCell className="text-right font-mono">
                              {dreData.grossRevenue > 0 ? ((amount / dreData.grossRevenue) * 100).toFixed(1) : 0}%
                            </TableCell>
                          </TableRow>
                        );
                      })}

                      {/* Despesas Operacionais */}
                      <TableRow className="font-semibold hover:bg-transparent border-t">
                        <TableCell className="text-base text-expense flex items-center gap-1.5">
                          <TrendingDown className="h-4 w-4" />
                          2. (-) DESPESAS OPERACIONAIS
                        </TableCell>
                        <TableCell className="text-right text-base text-expense font-mono">
                          {formatCurrency(-dreData.totalExpenses)}
                        </TableCell>
                        <TableCell className="text-right text-base font-mono">
                          {dreData.grossRevenue > 0 ? ((-dreData.totalExpenses / dreData.grossRevenue) * 100).toFixed(1) : 0}%
                        </TableCell>
                      </TableRow>

                      {/* Detail Expense categories */}
                      {dreData.operatingExpenses.map((exp, idx) => {
                        return (
                          <TableRow key={idx} className="hover:bg-transparent text-sm text-muted-foreground">
                            <TableCell className="pl-8">2.{idx+1}. {exp.name}</TableCell>
                            <TableCell className="text-right font-mono text-expense">({formatCurrency(exp.amount)})</TableCell>
                            <TableCell className="text-right font-mono">
                              {dreData.grossRevenue > 0 ? ((exp.amount / dreData.grossRevenue) * 100).toFixed(1) : 0}%
                            </TableCell>
                          </TableRow>
                        );
                      })}

                      {/* Net Result */}
                      <TableRow className={cn(
                        "font-bold hover:bg-transparent border-t-2 text-lg",
                        dreData.netResult >= 0 ? "bg-income-muted/10" : "bg-expense-muted/10"
                      )}>
                        <TableCell className="flex items-center gap-1.5">
                          <DollarSign className="h-5 w-5" />
                          RESULTADO LÍQUIDO DO EXERCÍCIO
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-mono text-lg",
                          dreData.netResult >= 0 ? "text-income" : "text-expense"
                        )}>
                          {formatCurrency(dreData.netResult)}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-mono text-lg",
                          dreData.netResult >= 0 ? "text-income" : "text-expense"
                        )}>
                          {dreData.marginPercent.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Commissions Tab */}
          {userSettings.enableCommission && (
            <TabsContent value="commissions" className="space-y-4 print:block">
              <Card className="border shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Relatório de Comissões por Colaborador
                  </CardTitle>
                  <CardDescription className="print:hidden">
                    Visão detalhada das vendas efetuadas e comissões associadas a cada colaborador.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden border rounded-lg">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="font-semibold text-foreground">Colaborador</TableHead>
                          <TableHead className="text-right font-semibold text-foreground">Serviços/Vendas Totais</TableHead>
                          <TableHead className="text-right font-semibold text-foreground">Média p/ Lançamento</TableHead>
                          <TableHead className="text-right font-semibold text-foreground">Lançamentos</TableHead>
                          <TableHead className="text-right font-semibold text-foreground">Comissão Gerada</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {collaboratorReport.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                              Nenhuma venda com comissão encontrada no período.
                            </TableCell>
                          </TableRow>
                        ) : (
                          collaboratorReport.map((col, idx) => {
                            const avgSale = col.txCount > 0 ? col.totalSales / col.txCount : 0;
                            return (
                              <TableRow key={idx} className="hover:bg-muted/30">
                                <TableCell className="font-medium text-foreground flex items-center gap-2">
                                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                                  {col.name}
                                </TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(col.totalSales)}</TableCell>
                                <TableCell className="text-right font-mono text-muted-foreground">{formatCurrency(avgSale)}</TableCell>
                                <TableCell className="text-right font-mono text-muted-foreground">{col.txCount}</TableCell>
                                <TableCell className="text-right font-semibold font-mono text-income">{formatCurrency(col.totalCommissions)}</TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Distribution Tab */}
          <TabsContent value="distribution" className="space-y-6 print:block">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1 print:gap-4">
              {/* Income Distribution */}
              <Card className="border shadow-md">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Origem das Receitas (por Categoria)</CardTitle>
                </CardHeader>
                <CardContent className="h-80 flex flex-col justify-between">
                  {categoryDistributionData.income.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Nenhuma receita registrada no período.
                    </div>
                  ) : (
                    <div className="flex h-full items-center">
                      <div className="w-1/2 h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryDistributionData.income}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {categoryDistributionData.income.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-1/2 space-y-2 max-h-full overflow-y-auto pl-4">
                        {categoryDistributionData.income.slice(0, 5).map((entry, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                            <span className="truncate flex-grow font-medium text-foreground">{entry.name}</span>
                            <span className="font-mono text-muted-foreground">{formatCurrency(entry.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Expense Distribution */}
              <Card className="border shadow-md">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Gargalo de Despesas (por Categoria)</CardTitle>
                </CardHeader>
                <CardContent className="h-80 flex flex-col justify-between">
                  {categoryDistributionData.expense.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Nenhuma despesa registrada no período.
                    </div>
                  ) : (
                    <div className="flex h-full items-center">
                      <div className="w-1/2 h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryDistributionData.expense}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {categoryDistributionData.expense.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-1/2 space-y-2 max-h-full overflow-y-auto pl-4">
                        {categoryDistributionData.expense.slice(0, 5).map((entry, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                            <span className="truncate flex-grow font-medium text-foreground">{entry.name}</span>
                            <span className="font-mono text-muted-foreground">{formatCurrency(entry.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Fluxo Projetado Tab */}
          <TabsContent value="projection" className="space-y-4 print:block">
            <Card className="border shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChartIcon className="h-5 w-5 text-primary" />
                  Fluxo de Caixa Projetado (Próximos 90 Dias)
                </CardTitle>
                <CardDescription>
                  Estimativas e projeções de faturamento e saldo acumulado futuro.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/40 border">
                    <p className="text-xs text-muted-foreground">Saldo Real Atual</p>
                    <p className={cn("text-xl font-bold font-mono", projectionData.currentBalance >= 0 ? "text-income" : "text-expense")}>
                      {formatCurrency(projectionData.currentBalance)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/40 border">
                    <p className="text-xs text-muted-foreground">Receitas Previstas (3 meses)</p>
                    <p className="text-xl font-bold font-mono text-income">
                      {formatCurrency(projectionData.monthsData.reduce((s, m) => s + m.Receitas, 0))}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/40 border">
                    <p className="text-xs text-muted-foreground font-semibold">Projeção Final de Saldo</p>
                    <p className={cn("text-xl font-bold font-mono", projectionData.monthsData[2]?.SaldoProjetado >= 0 ? "text-income" : "text-expense")}>
                      {formatCurrency(projectionData.monthsData[2]?.SaldoProjetado || 0)}
                    </p>
                  </div>
                </div>

                <div className="h-72 w-full print:hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectionData.monthsData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="Receitas" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-hidden border rounded-lg">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Mês Projetado</TableHead>
                        <TableHead className="text-right">Receitas Previstas</TableHead>
                        <TableHead className="text-right">Despesas Previstas</TableHead>
                        <TableHead className="text-right">Saldo Final Projetado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectionData.monthsData.map((m, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-semibold">{m.month}</TableCell>
                          <TableCell className="text-right text-income font-mono font-medium">{formatCurrency(m.Receitas)}</TableCell>
                          <TableCell className="text-right text-expense font-mono font-medium">({formatCurrency(m.Despesas)})</TableCell>
                          <TableCell className={cn("text-right font-mono font-bold", m.SaldoProjetado >= 0 ? "text-income" : "text-expense")}>
                            {formatCurrency(m.SaldoProjetado)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Break-Even Tab */}
          <TabsContent value="breakeven" className="space-y-4 print:block">
            <Card className="border shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  Ponto de Equilíbrio (Break-Even Point)
                </CardTitle>
                <CardDescription>
                  Identifique a receita mínima necessária no período para cobrir seus custos fixos e variáveis.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-muted/40 border">
                    <p className="text-xs text-muted-foreground">Custos Fixos</p>
                    <p className="text-lg font-bold font-mono text-expense">{formatCurrency(breakEvenData.fixedCosts)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/40 border">
                    <p className="text-xs text-muted-foreground">Custos Variáveis</p>
                    <p className="text-lg font-bold font-mono text-amber-600">{formatCurrency(breakEvenData.variableCosts)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/40 border">
                    <p className="text-xs text-muted-foreground">Margem de Contribuição</p>
                    <p className="text-lg font-bold font-mono text-primary">{(breakEvenData.contributionMarginRatio * 100).toFixed(1)}%</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/40 border">
                    <p className="text-xs text-muted-foreground">Ponto de Equilíbrio</p>
                    <p className="text-lg font-bold font-mono text-foreground">{formatCurrency(breakEvenData.breakEvenPoint)}</p>
                  </div>
                </div>

                <div className="space-y-2 border p-4 rounded-lg bg-muted/10">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Faturamento Atual ({formatCurrency(breakEvenData.currentRevenue)})</span>
                    <span>Meta Break-Even ({formatCurrency(breakEvenData.breakEvenPoint)})</span>
                  </div>
                  <Progress value={breakEvenData.breakEvenProgress} className="h-3 bg-muted" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {breakEvenData.currentRevenue >= breakEvenData.breakEvenPoint 
                      ? "Parabéns! Sua empresa atingiu o ponto de equilíbrio e já está gerando lucro no período selecionado."
                      : `Ainda faltam ${formatCurrency(breakEvenData.breakEvenPoint - breakEvenData.currentRevenue)} em receita para cobrir os custos do período.`}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Accounts Payable vs Receivable Tab */}
          <TabsContent value="payables" className="space-y-4 print:block">
            <Card className="border shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Contas a Pagar e a Receber (Provisões)
                </CardTitle>
                <CardDescription>
                  Balanço comparativo entre receitas confirmadas e pendências de faturamento.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border bg-income-muted/5">
                    <p className="text-xs text-muted-foreground text-income font-medium flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" /> Contas a Receber
                    </p>
                    <p className="text-xl font-bold font-mono text-income mt-1">{formatCurrency(payablesData.accountsReceivable)}</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-expense-muted/5">
                    <p className="text-xs text-muted-foreground text-expense font-medium flex items-center gap-1">
                      <ArrowDownRight className="h-3 w-3" /> Contas a Pagar
                    </p>
                    <p className="text-xl font-bold font-mono text-expense mt-1">({formatCurrency(payablesData.accountsPayable)})</p>
                  </div>
                  <div className={cn("p-4 rounded-lg border", payablesData.netPending >= 0 ? "bg-income-muted/5" : "bg-expense-muted/5")}>
                    <p className="text-xs text-muted-foreground font-medium">Balanço Pendente Líquido</p>
                    <p className={cn("text-xl font-bold font-mono mt-1", payablesData.netPending >= 0 ? "text-income" : "text-expense")}>
                      {formatCurrency(payablesData.netPending)}
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden border rounded-lg">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Fluxo de Caixa</TableHead>
                        <TableHead className="text-right">Confirmado (Pago/Recebido)</TableHead>
                        <TableHead className="text-right">Pendente (A Pagar/Receber)</TableHead>
                        <TableHead className="text-right">Total Consolidado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-semibold text-income">Entradas / Receitas</TableCell>
                        <TableCell className="text-right font-mono text-income">{formatCurrency(payablesData.confirmedIncome)}</TableCell>
                        <TableCell className="text-right font-mono text-income">{formatCurrency(payablesData.accountsReceivable)}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-income">{formatCurrency(payablesData.confirmedIncome + payablesData.accountsReceivable)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-semibold text-expense">Saídas / Despesas</TableCell>
                        <TableCell className="text-right font-mono text-expense">({formatCurrency(payablesData.confirmedExpense)})</TableCell>
                        <TableCell className="text-right font-mono text-expense">({formatCurrency(payablesData.accountsPayable)})</TableCell>
                        <TableCell className="text-right font-mono font-bold text-expense">({formatCurrency(payablesData.confirmedExpense + payablesData.accountsPayable)})</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Margins Tab */}
          <TabsContent value="margins" className="space-y-4 print:block">
            <Card className="border shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5 text-primary" />
                  Análise de Margem por Categoria de Serviço
                </CardTitle>
                <CardDescription>
                  Rentabilidade líquida de cada linha de receita descontando as comissões pagas aos colaboradores.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="overflow-hidden border rounded-lg">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Categoria de Receita</TableHead>
                        <TableHead className="text-right">Receita Bruta</TableHead>
                        <TableHead className="text-right">Comissões Deduzidas</TableHead>
                        <TableHead className="text-right">Margem Líquida</TableHead>
                        <TableHead className="text-right">Margem (%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {marginsByCategory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                            Nenhum faturamento registrado no período para análise de margem.
                          </TableCell>
                        </TableRow>
                      ) : (
                        marginsByCategory.map((m, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-semibold">{m.code} - {m.name}</TableCell>
                            <TableCell className="text-right font-mono text-income">{formatCurrency(m.revenue)}</TableCell>
                            <TableCell className="text-right font-mono text-expense">({formatCurrency(m.commissions)})</TableCell>
                            <TableCell className="text-right font-mono font-semibold text-income">{formatCurrency(m.netMargin)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span className="font-bold text-sm font-mono">{m.marginPercent.toFixed(1)}%</span>
                                <Progress value={m.marginPercent} className="w-16 h-2 bg-muted" />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Report Tab */}
          <TabsContent value="inventory" className="space-y-6 print:block">
            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border shadow-sm bg-muted/20">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Itens Totais em Estoque</p>
                      <p className="text-2xl font-bold font-mono mt-1 text-foreground">{inventoryReportData.totalItems}</p>
                    </div>
                    <div className="p-2 bg-primary/10 text-primary rounded-lg">
                      <Package className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-sm bg-muted/20">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Valoração (Custo/Pago)</p>
                      <p className="text-2xl font-bold font-mono mt-1 text-expense">{formatCurrency(inventoryReportData.totalCostValuation)}</p>
                    </div>
                    <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                      <TrendingDown className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-sm bg-muted/20">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Valoração (Preço de Venda)</p>
                      <p className="text-2xl font-bold font-mono mt-1 text-income">{formatCurrency(inventoryReportData.totalSaleValuation)}</p>
                    </div>
                    <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-sm bg-muted/20">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider font-semibold">Lucro Estimado / Markup</p>
                      <p className={cn("text-2xl font-bold font-mono mt-1", inventoryReportData.totalMarkup >= 0 ? "text-income" : "text-expense")}>
                        {formatCurrency(inventoryReportData.totalMarkup)}
                      </p>
                    </div>
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <DollarSign className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1">
              {/* Critical stock items */}
              <Card className="border shadow-md">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    Produtos com Estoque Crítico (Reposição Necessária)
                  </CardTitle>
                  <CardDescription>
                    Produtos cuja quantidade atual está abaixo ou igual ao estoque mínimo.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {inventoryReportData.criticalItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                        <Package className="h-5 w-5" />
                      </div>
                      Nenhum produto em nível crítico de estoque.
                    </div>
                  ) : (
                    <div className="overflow-hidden border rounded-lg max-h-[300px] overflow-y-auto">
                      <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                          <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead className="text-center">Estoque Mínimo</TableHead>
                            <TableHead className="text-center">Estoque Atual</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inventoryReportData.criticalItems.map((p) => (
                            <TableRow key={p.id} className="hover:bg-red-50/10">
                              <TableCell className="font-semibold text-sm">
                                <div>{p.name}</div>
                                <div className="text-xs text-muted-foreground font-mono">{p.sku || 'Sem SKU'}</div>
                              </TableCell>
                              <TableCell className="text-center font-mono text-sm text-muted-foreground">{p.min_stock}</TableCell>
                              <TableCell className="text-center">
                                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold font-mono bg-red-100 text-red-800">
                                  {p.current_stock}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    // Trigger tab switch to main inventory view if possible
                                    const mainInventoryTab = document.querySelector('[data-value="inventory"]') as HTMLElement;
                                    if (mainInventoryTab) mainInventoryTab.click();
                                  }}
                                  className="h-7 text-xs"
                                >
                                  Repor
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Grouped by Supplier */}
              <Card className="border shadow-md">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    Valor de Estoque por Fornecedor
                  </CardTitle>
                  <CardDescription>
                    Distribuição da quantidade de itens e valor investido por fornecedor.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {inventoryReportData.supplierSummaries.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Nenhum dado de estoque por fornecedor disponível.
                    </div>
                  ) : (
                    <div className="overflow-hidden border rounded-lg max-h-[300px] overflow-y-auto">
                      <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                          <TableRow>
                            <TableHead>Fornecedor</TableHead>
                            <TableHead className="text-center">Itens</TableHead>
                            <TableHead className="text-right">Custo Total</TableHead>
                            <TableHead className="text-right">Venda Projetada</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inventoryReportData.supplierSummaries.map((s, idx) => (
                            <TableRow key={idx} className="hover:bg-muted/30">
                              <TableCell className="font-semibold text-sm">{s.name}</TableCell>
                              <TableCell className="text-center font-mono text-sm">{s.itemsCount}</TableCell>
                              <TableCell className="text-right font-mono text-sm text-expense">{formatCurrency(s.costValuation)}</TableCell>
                              <TableCell className="text-right font-mono text-sm text-income">{formatCurrency(s.saleValuation)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
