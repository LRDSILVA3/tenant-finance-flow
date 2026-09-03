// pdfCustomization.ts - Utilitário e armazenamento das configurações de personalização de PDFs

export interface PdfCustomizationSettings {
  headerColor: string;
  accentColor: string;
  tableHeaderColor: string;
  companyName: string;
  documentNumber: string;
  phone: string;
  email: string;
  address: string;
  showSignatures: boolean;
  showSku: boolean;
  orderTerms: string;
  serviceOrderTerms: string;
  footerText: string;
}

export const defaultPdfSettings: PdfCustomizationSettings = {
  headerColor: '#0f172a', // Slate-900
  accentColor: '#10b981', // Emerald-500
  tableHeaderColor: '#1e293b', // Slate-800
  companyName: 'Previna Gestão',
  documentNumber: '',
  phone: '',
  email: '',
  address: '',
  showSignatures: true,
  showSku: true,
  orderTerms: 'Declaro que conferi e recebi os produtos constantes neste pedido em perfeito estado.',
  serviceOrderTerms: '90 dias de garantia legal contra defeitos de serviços prestados e peças aplicadas.',
  footerText: 'via Previna Gestão Financeira.',
};

export const pdfThemePresets = [
  {
    name: 'Slate & Esmeralda (Padrão)',
    headerColor: '#0f172a',
    accentColor: '#10b981',
    tableHeaderColor: '#1e293b',
  },
  {
    name: 'Azul Real & Índigo',
    headerColor: '#0f172a',
    accentColor: '#6366f1',
    tableHeaderColor: '#1e3a8a',
  },
  {
    name: 'Verde Petróleo Executivo',
    headerColor: '#064e3b',
    accentColor: '#059669',
    tableHeaderColor: '#047857',
  },
  {
    name: 'Dourado & Âmbar Premium',
    headerColor: '#1c1917',
    accentColor: '#f59e0b',
    tableHeaderColor: '#292524',
  },
  {
    name: 'Borgonha / Rubi Sofisticado',
    headerColor: '#450a0a',
    accentColor: '#e11d48',
    tableHeaderColor: '#881337',
  },
  {
    name: 'Preto Grafite Minimalista',
    headerColor: '#18181b',
    accentColor: '#71717a',
    tableHeaderColor: '#27272a',
  },
];

export const getPdfSettings = (clientId?: string): PdfCustomizationSettings => {
  try {
    const key = `pdf_settings_${clientId || 'default'}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return { ...defaultPdfSettings, ...JSON.parse(stored) };
    }
  } catch (err) {
    console.error('Erro ao ler configurações de PDF:', err);
  }
  return defaultPdfSettings;
};

export const savePdfSettings = (
  settings: Partial<PdfCustomizationSettings>,
  clientId?: string
): PdfCustomizationSettings => {
  try {
    const key = `pdf_settings_${clientId || 'default'}`;
    const current = getPdfSettings(clientId);
    const updated = { ...current, ...settings };
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Erro ao salvar configurações de PDF:', err);
    return defaultPdfSettings;
  }
};

export const hexToRgb = (hex: string): [number, number, number] => {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) {
    return [15, 23, 42]; // Fallback slate-900
  }
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};
