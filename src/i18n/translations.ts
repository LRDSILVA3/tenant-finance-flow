// Internationalization - Translations

import { Language } from '@/types/finance';

export interface Translations {
  // Header
  appName: string;
  selectClient: string;
  selectLanguage: string;

  // Navigation
  dashboard: string;
  chartOfAccounts: string;
  transactions: string;
  settings: string;

  // Dashboard
  dailyView: string;
  monthlyView: string;
  dailyOverview: string;

  // Dashboard
  financialOverview: string;
  monthlyOverview: string;
  balance: string;
  income: string;
  incomes: string;
  expenses: string;
  monthlyFlow: string;
  recentTransactions: string;
  transactionsByPeriod: string;
  to: string;
  noTransactions: string;
  viewAll: string;

  // Chart of Accounts
  chartOfAccountsTitle: string;
  chartOfAccountsSubtitle: string;
  categories: string;
  subcategories: string;
  addCategory: string;
  addSubcategory: string;
  editCategory: string;
  deleteCategory: string;
  categoryName: string;
  categoryType: string;
  categoryCode: string;
  parentCategory: string;
  noCategories: string;
  incomeCategories: string;
  expenseCategories: string;

  // Transactions
  transactionsTitle: string;
  transactionsSubtitle: string;
  addTransaction: string;
  editTransaction: string;
  deleteTransaction: string;
  amount: string;
  description: string;
  date: string;
  category: string;
  type: string;
  reference: string;
  notes: string;
  noData: string;
  filters: string;
  clearFilters: string;
  listView: string;
  calendarView: string;
  allCategories: string;
  allTypes: string;
  from: string;
  paymentMethod: string;
  cash: string;
  card: string;
  pix: string;
  pending: string;

  // Settings
  settingsSubtitle: string;
  enablePaymentMethods: string;
  enablePaymentMethodsDescription: string;
  paymentMethodBreakdown: string;

  // Subscription
  subscription: string;
  currentPlan: string;
  planDetails: string;
  choosePlan: string;
  trialPeriod: string;
  trialMonths: string;
  activeUntil: string;
  features: string;
  paymentMethodsFeature: string;
  commissionsFeature: string;
  advancedReportsFeature: string;
  startTrial: string;
  upgradePlan: string;

  // Forms
  save: string;
  cancel: string;
  delete: string;
  confirm: string;
  required: string;
  
  // Messages
  saved: string;
  deleted: string;
  error: string;
  confirmDelete: string;

  // Months
  jan: string;
  feb: string;
  mar: string;
  apr: string;
  may: string;
  jun: string;
  jul: string;
  aug: string;
  sep: string;
  oct: string;
  nov: string;
  dec: string;
}

export const translations: Record<Language, Translations> = {
  pt: {
    appName: 'Previna',
    selectClient: 'Selecionar Empresa',
    selectLanguage: 'Idioma',

    dashboard: 'Painel',
    chartOfAccounts: 'Plano de Contas',
    transactions: 'Lançamentos',
    settings: 'Configurações',

    financialOverview: 'Visão Financeira',
    monthlyOverview: 'Visão do mês atual',
    dailyView: 'Diário',
    monthlyView: 'Mensal',
    dailyOverview: 'Visão do dia atual',
    balance: 'Saldo',
    income: 'Entrada',
    incomes: 'Entradas',
    expenses: 'Saídas',
    monthlyFlow: 'Fluxo Mensal',
    recentTransactions: 'Lançamentos Recentes',
    transactionsByPeriod: 'Lançamentos por Período',
    to: 'até',
    noTransactions: 'Nenhum lançamento encontrado',
    viewAll: 'Ver Todos',
    expensesByCategory: 'Saídas por Categoria',
    incomesByCategory: 'Entradas por Categoria',

    chartOfAccountsTitle: 'Plano de Contas',
    chartOfAccountsSubtitle: 'Gerencie suas categorias e subcategorias',
    categories: 'Categorias',
    subcategories: 'Subcategorias',
    addCategory: 'Adicionar Categoria',
    addSubcategory: 'Adicionar Subcategoria',
    editCategory: 'Editar Categoria',
    deleteCategory: 'Excluir Categoria',
    categoryName: 'Nome da Categoria',
    categoryType: 'Tipo',
    categoryCode: 'Código',
    parentCategory: 'Categoria Pai',
    noCategories: 'Nenhuma categoria cadastrada',
    incomeCategories: 'Categorias de Entrada',
    expenseCategories: 'Categorias de Saída',

    transactionsTitle: 'Lançamentos',
    transactionsSubtitle: 'Registre e gerencie suas transações financeiras',
    addTransaction: 'Novo Lançamento',
    editTransaction: 'Editar Lançamento',
    deleteTransaction: 'Excluir Lançamento',
    amount: 'Valor',
    description: 'Descrição',
    date: 'Data',
    category: 'Categoria',
    type: 'Tipo',
    reference: 'Referência',
    notes: 'Observações',
    noData: 'Sem dados',
    filters: 'Filtros',
    clearFilters: 'Limpar Filtros',
    listView: 'Lista',
    calendarView: 'Calendário',
    allCategories: 'Todas as Categorias',
    allTypes: 'Todos os Tipos',
    from: 'De',
    paymentMethod: 'Forma de Recebimento',
    cash: 'Dinheiro',
    card: 'Cartão',
    pix: 'PIX',
    pending: 'Pendente',

    settingsSubtitle: 'Gerencie as configurações do sistema',
    enablePaymentMethods: 'Habilitar Formas de Recebimento',
    enablePaymentMethodsDescription: 'Permite informar como a receita foi recebida (Dinheiro, Cartão, PIX ou Pendente)',
    paymentMethodBreakdown: 'Por Forma de Recebimento',

    subscription: 'Assinatura',
    currentPlan: 'Plano Atual',
    planDetails: 'Detalhes do Plano',
    choosePlan: 'Escolha seu Plano',
    trialPeriod: 'Período de Degustação',
    trialMonths: 'meses grátis',
    activeUntil: 'Ativo até',
    features: 'Funcionalidades',
    paymentMethodsFeature: 'Formas de Recebimento',
    commissionsFeature: 'Controle de Comissões',
    advancedReportsFeature: 'Relatórios Avançados',
    startTrial: 'Iniciar Teste Grátis',
    upgradePlan: 'Alterar Plano',

    save: 'Salvar',
    cancel: 'Cancelar',
    delete: 'Excluir',
    confirm: 'Confirmar',
    required: 'Campo obrigatório',

    saved: 'Salvo com sucesso',
    deleted: 'Excluído com sucesso',
    error: 'Ocorreu um erro',
    confirmDelete: 'Tem certeza que deseja excluir?',

    jan: 'Jan', feb: 'Fev', mar: 'Mar', apr: 'Abr',
    may: 'Mai', jun: 'Jun', jul: 'Jul', aug: 'Ago',
    sep: 'Set', oct: 'Out', nov: 'Nov', dec: 'Dez',
  },
  en: {
    appName: 'Previna',
    selectClient: 'Select Company',
    selectLanguage: 'Language',

    dashboard: 'Dashboard',
    chartOfAccounts: 'Chart of Accounts',
    transactions: 'Transactions',
    settings: 'Settings',

    financialOverview: 'Financial Overview',
    monthlyOverview: 'Current month overview',
    dailyView: 'Daily',
    monthlyView: 'Monthly',
    dailyOverview: 'Current day overview',
    balance: 'Balance',
    income: 'Income',
    incomes: 'Incomes',
    expenses: 'Expenses',
    monthlyFlow: 'Monthly Flow',
    recentTransactions: 'Recent Transactions',
    transactionsByPeriod: 'Transactions by Period',
    to: 'to',
    noTransactions: 'No transactions found',
    viewAll: 'View All',

    chartOfAccountsTitle: 'Chart of Accounts',
    chartOfAccountsSubtitle: 'Manage your categories and subcategories',
    categories: 'Categories',
    subcategories: 'Subcategories',
    addCategory: 'Add Category',
    addSubcategory: 'Add Subcategory',
    editCategory: 'Edit Category',
    deleteCategory: 'Delete Category',
    categoryName: 'Category Name',
    categoryType: 'Type',
    categoryCode: 'Code',
    parentCategory: 'Parent Category',
    noCategories: 'No categories registered',
    incomeCategories: 'Income Categories',
    expenseCategories: 'Expense Categories',

    transactionsTitle: 'Transactions',
    transactionsSubtitle: 'Record and manage your financial transactions',
    addTransaction: 'New Transaction',
    editTransaction: 'Edit Transaction',
    deleteTransaction: 'Delete Transaction',
    amount: 'Amount',
    description: 'Description',
    date: 'Date',
    category: 'Category',
    type: 'Type',
    reference: 'Reference',
    notes: 'Notes',
    noData: 'No data',
    filters: 'Filters',
    clearFilters: 'Clear Filters',
    listView: 'List',
    calendarView: 'Calendar',
    allCategories: 'All Categories',
    allTypes: 'All Types',
    from: 'From',
    paymentMethod: 'Payment Method',
    cash: 'Cash',
    card: 'Card',
    pix: 'PIX',
    pending: 'Pending',

    settingsSubtitle: 'Manage system settings',
    enablePaymentMethods: 'Enable Payment Methods',
    enablePaymentMethodsDescription: 'Allows specifying how income was received (Cash, Card, PIX or Pending)',
    paymentMethodBreakdown: 'By Payment Method',

    subscription: 'Subscription',
    currentPlan: 'Current Plan',
    planDetails: 'Plan Details',
    choosePlan: 'Choose Plan',
    trialPeriod: 'Trial Period',
    trialMonths: 'free months',
    activeUntil: 'Active until',
    features: 'Features',
    paymentMethodsFeature: 'Payment Methods',
    commissionsFeature: 'Commission Control',
    advancedReportsFeature: 'Advanced Reports',
    startTrial: 'Start Free Trial',
    upgradePlan: 'Change Plan',

    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    confirm: 'Confirm',
    required: 'Required field',

    saved: 'Saved successfully',
    deleted: 'Deleted successfully',
    error: 'An error occurred',
    confirmDelete: 'Are you sure you want to delete?',

    jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr',
    may: 'May', jun: 'Jun', jul: 'Jul', aug: 'Aug',
    sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dec',
  },
  es: {
    appName: 'Gestión Financiera',
    selectClient: 'Seleccionar Empresa',
    selectLanguage: 'Idioma',

    dashboard: 'Panel',
    chartOfAccounts: 'Plan de Cuentas',
    transactions: 'Transacciones',
    settings: 'Configuración',

    financialOverview: 'Visión Financiera',
    monthlyOverview: 'Visión del mes actual',
    dailyView: 'Diario',
    monthlyView: 'Mensual',
    dailyOverview: 'Visión del día actual',
    balance: 'Saldo',
    income: 'Ingreso',
    incomes: 'Ingresos',
    expenses: 'Gastos',
    monthlyFlow: 'Flujo Mensual',
    recentTransactions: 'Transacciones Recientes',
    transactionsByPeriod: 'Transacciones por Período',
    to: 'hasta',
    noTransactions: 'No se encontraron transacciones',
    viewAll: 'Ver Todo',

    chartOfAccountsTitle: 'Plan de Cuentas',
    chartOfAccountsSubtitle: 'Administre sus categorías y subcategorías',
    categories: 'Categorías',
    subcategories: 'Subcategorías',
    addCategory: 'Agregar Categoría',
    addSubcategory: 'Agregar Subcategoría',
    editCategory: 'Editar Categoría',
    deleteCategory: 'Eliminar Categoría',
    categoryName: 'Nombre de Categoría',
    categoryType: 'Tipo',
    categoryCode: 'Código',
    parentCategory: 'Categoría Padre',
    noCategories: 'No hay categorías registradas',
    incomeCategories: 'Categorías de Ingresos',
    expenseCategories: 'Categorías de Gastos',

    transactionsTitle: 'Transacciones',
    transactionsSubtitle: 'Registre y administre sus transacciones financieras',
    addTransaction: 'Nueva Transacción',
    editTransaction: 'Editar Transacción',
    deleteTransaction: 'Eliminar Transacción',
    amount: 'Monto',
    description: 'Descripción',
    date: 'Fecha',
    category: 'Categoría',
    type: 'Tipo',
    reference: 'Referencia',
    notes: 'Notas',
    noData: 'Sin datos',
    filters: 'Filtros',
    clearFilters: 'Limpiar Filtros',
    listView: 'Lista',
    calendarView: 'Calendario',
    allCategories: 'Todas las Categorías',
    allTypes: 'Todos los Tipos',
    from: 'Desde',
    paymentMethod: 'Forma de Pago',
    cash: 'Efectivo',
    card: 'Tarjeta',
    pix: 'PIX',
    pending: 'Pendiente',

    settingsSubtitle: 'Administrar configuración del sistema',
    enablePaymentMethods: 'Habilitar Formas de Pago',
    enablePaymentMethodsDescription: 'Permite especificar cómo se recibió el ingreso (Efectivo, Tarjeta, PIX o Pendiente)',
    paymentMethodBreakdown: 'Por Forma de Pago',

    subscription: 'Suscripción',
    currentPlan: 'Plan Actual',
    planDetails: 'Detalles del Plan',
    choosePlan: 'Elige tu Plan',
    trialPeriod: 'Período de Prueba',
    trialMonths: 'meses gratis',
    activeUntil: 'Activo hasta',
    features: 'Funcionalidades',
    paymentMethodsFeature: 'Formas de Pago',
    commissionsFeature: 'Control de Comisiones',
    advancedReportsFeature: 'Informes Avanzados',
    startTrial: 'Iniciar Prueba Gratis',
    upgradePlan: 'Cambiar Plan',

    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    confirm: 'Confirmar',
    required: 'Campo obligatorio',

    saved: 'Guardado exitosamente',
    deleted: 'Eliminado exitosamente',
    error: 'Ocurrió un error',
    confirmDelete: '¿Está seguro de que desea eliminar?',

    jan: 'Ene', feb: 'Feb', mar: 'Mar', apr: 'Abr',
    may: 'May', jun: 'Jun', jul: 'Jul', aug: 'Ago',
    sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dic',
  },
};
