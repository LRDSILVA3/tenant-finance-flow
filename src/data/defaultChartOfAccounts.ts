// Default Chart of Accounts - Professional Financial Categories

import { Language, TransactionType } from '@/types/finance';

interface DefaultCategory {
  code: string;
  type: TransactionType;
  parentCode: string | null;
  names: Record<Language, string>;
}

export const defaultChartOfAccounts: DefaultCategory[] = [
  // INCOME CATEGORIES
  { code: '1', type: 'income', parentCode: null, names: { pt: 'Receitas Operacionais', en: 'Operating Revenue', es: 'Ingresos Operacionales' } },
  { code: '1.1', type: 'income', parentCode: '1', names: { pt: 'Vendas de Produtos', en: 'Product Sales', es: 'Ventas de Productos' } },
  { code: '1.2', type: 'income', parentCode: '1', names: { pt: 'Prestação de Serviços', en: 'Service Revenue', es: 'Servicios Prestados' } },
  { code: '1.3', type: 'income', parentCode: '1', names: { pt: 'Comissões Recebidas', en: 'Commissions Received', es: 'Comisiones Recibidas' } },

  { code: '2', type: 'income', parentCode: null, names: { pt: 'Receitas Financeiras', en: 'Financial Income', es: 'Ingresos Financieros' } },
  { code: '2.1', type: 'income', parentCode: '2', names: { pt: 'Juros Recebidos', en: 'Interest Received', es: 'Intereses Recibidos' } },
  { code: '2.2', type: 'income', parentCode: '2', names: { pt: 'Rendimentos de Aplicações', en: 'Investment Returns', es: 'Rendimientos de Inversiones' } },
  { code: '2.3', type: 'income', parentCode: '2', names: { pt: 'Descontos Obtidos', en: 'Discounts Obtained', es: 'Descuentos Obtenidos' } },

  { code: '3', type: 'income', parentCode: null, names: { pt: 'Outras Receitas', en: 'Other Income', es: 'Otros Ingresos' } },
  { code: '3.1', type: 'income', parentCode: '3', names: { pt: 'Venda de Ativos', en: 'Asset Sales', es: 'Venta de Activos' } },
  { code: '3.2', type: 'income', parentCode: '3', names: { pt: 'Receitas Eventuais', en: 'Occasional Income', es: 'Ingresos Eventuales' } },

  // EXPENSE CATEGORIES
  { code: '4', type: 'expense', parentCode: null, names: { pt: 'Custos de Pessoal', en: 'Personnel Costs', es: 'Costos de Personal' } },
  { code: '4.1', type: 'expense', parentCode: '4', names: { pt: 'Salários e Ordenados', en: 'Salaries and Wages', es: 'Salarios y Sueldos' } },
  { code: '4.2', type: 'expense', parentCode: '4', names: { pt: 'Encargos Sociais', en: 'Social Charges', es: 'Cargas Sociales' } },
  { code: '4.3', type: 'expense', parentCode: '4', names: { pt: 'Benefícios', en: 'Benefits', es: 'Beneficios' } },
  { code: '4.4', type: 'expense', parentCode: '4', names: { pt: 'Treinamentos', en: 'Training', es: 'Capacitación' } },

  { code: '5', type: 'expense', parentCode: null, names: { pt: 'Despesas Administrativas', en: 'Administrative Expenses', es: 'Gastos Administrativos' } },
  { code: '5.1', type: 'expense', parentCode: '5', names: { pt: 'Aluguel', en: 'Rent', es: 'Alquiler' } },
  { code: '5.2', type: 'expense', parentCode: '5', names: { pt: 'Água e Energia', en: 'Utilities', es: 'Agua y Energía' } },
  { code: '5.3', type: 'expense', parentCode: '5', names: { pt: 'Telefone e Internet', en: 'Phone and Internet', es: 'Teléfono e Internet' } },
  { code: '5.4', type: 'expense', parentCode: '5', names: { pt: 'Material de Escritório', en: 'Office Supplies', es: 'Material de Oficina' } },
  { code: '5.5', type: 'expense', parentCode: '5', names: { pt: 'Seguros', en: 'Insurance', es: 'Seguros' } },

  { code: '6', type: 'expense', parentCode: null, names: { pt: 'Despesas Comerciais', en: 'Commercial Expenses', es: 'Gastos Comerciales' } },
  { code: '6.1', type: 'expense', parentCode: '6', names: { pt: 'Marketing e Publicidade', en: 'Marketing and Advertising', es: 'Marketing y Publicidad' } },
  { code: '6.2', type: 'expense', parentCode: '6', names: { pt: 'Comissões Pagas', en: 'Commissions Paid', es: 'Comisiones Pagadas' } },
  { code: '6.3', type: 'expense', parentCode: '6', names: { pt: 'Viagens e Representação', en: 'Travel and Entertainment', es: 'Viajes y Representación' } },

  { code: '7', type: 'expense', parentCode: null, names: { pt: 'Despesas Financeiras', en: 'Financial Expenses', es: 'Gastos Financieros' } },
  { code: '7.1', type: 'expense', parentCode: '7', names: { pt: 'Juros Pagos', en: 'Interest Paid', es: 'Intereses Pagados' } },
  { code: '7.2', type: 'expense', parentCode: '7', names: { pt: 'Tarifas Bancárias', en: 'Bank Fees', es: 'Tarifas Bancarias' } },
  { code: '7.3', type: 'expense', parentCode: '7', names: { pt: 'IOF e Taxas', en: 'Taxes and Fees', es: 'Impuestos y Tasas' } },

  { code: '8', type: 'expense', parentCode: null, names: { pt: 'Impostos e Tributos', en: 'Taxes', es: 'Impuestos' } },
  { code: '8.1', type: 'expense', parentCode: '8', names: { pt: 'Impostos Federais', en: 'Federal Taxes', es: 'Impuestos Federales' } },
  { code: '8.2', type: 'expense', parentCode: '8', names: { pt: 'Impostos Estaduais', en: 'State Taxes', es: 'Impuestos Estatales' } },
  { code: '8.3', type: 'expense', parentCode: '8', names: { pt: 'Impostos Municipais', en: 'Municipal Taxes', es: 'Impuestos Municipales' } },

  { code: '9', type: 'expense', parentCode: null, names: { pt: 'Outras Despesas', en: 'Other Expenses', es: 'Otros Gastos' } },
  { code: '9.1', type: 'expense', parentCode: '9', names: { pt: 'Manutenção e Reparos', en: 'Maintenance and Repairs', es: 'Mantenimiento y Reparaciones' } },
  { code: '9.2', type: 'expense', parentCode: '9', names: { pt: 'Despesas Diversas', en: 'Miscellaneous Expenses', es: 'Gastos Diversos' } },
];

export const getDefaultCategoriesForLanguage = (language: Language) => {
  return defaultChartOfAccounts.map(cat => ({
    code: cat.code,
    type: cat.type,
    parentCode: cat.parentCode,
    name: cat.names[language],
  }));
};
