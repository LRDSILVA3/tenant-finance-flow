// Utilitário de Cores para Produtos e Variações
export interface ColorOption {
  name: string;
  hex: string;
  border?: boolean;
}

export const RETAIL_COLORS: ColorOption[] = [
  { name: 'Preto', hex: '#000000' },
  { name: 'Branco', hex: '#FFFFFF', border: true },
  { name: 'Cinza', hex: '#6B7280' },
  { name: 'Azul', hex: '#2563EB' },
  { name: 'Azul Marinho', hex: '#1E3A8A' },
  { name: 'Vermelho', hex: '#DC2626' },
  { name: 'Vinho', hex: '#831843' },
  { name: 'Verde', hex: '#16A34A' },
  { name: 'Verde Militar', hex: '#3F4F34' },
  { name: 'Amarelo', hex: '#EAB308' },
  { name: 'Rosa', hex: '#EC4899' },
  { name: 'Pink', hex: '#DB2777' },
  { name: 'Roxo', hex: '#9333EA' },
  { name: 'Laranja', hex: '#EA580C' },
  { name: 'Bege', hex: '#D4C5B9' },
  { name: 'Marrom', hex: '#78350F' },
  { name: 'Dourado', hex: '#D97706' },
  { name: 'Prata', hex: '#94A3B8' },
];

export const getColorHex = (colorName?: string | null): string => {
  if (!colorName) return '#94A3B8';
  const clean = colorName.trim().toLowerCase();
  
  // Se for código hexadecimal direto
  if (/^#([0-9A-F]{3}){1,2}$/i.test(colorName.trim())) {
    return colorName.trim();
  }

  const match = RETAIL_COLORS.find(c => 
    c.name.toLowerCase() === clean || 
    clean.includes(c.name.toLowerCase()) || 
    c.name.toLowerCase().includes(clean)
  );

  if (match) return match.hex;

  if (clean.includes('preto') || clean.includes('black')) return '#000000';
  if (clean.includes('branco') || clean.includes('white') || clean.includes('off')) return '#FFFFFF';
  if (clean.includes('azul') || clean.includes('blue')) return '#2563EB';
  if (clean.includes('vermelho') || clean.includes('red')) return '#DC2626';
  if (clean.includes('verde') || clean.includes('green')) return '#16A34A';
  if (clean.includes('amarelo') || clean.includes('yellow')) return '#EAB308';
  if (clean.includes('rosa') || clean.includes('pink')) return '#EC4899';
  if (clean.includes('roxo') || clean.includes('purple')) return '#9333EA';
  if (clean.includes('laranja') || clean.includes('orange')) return '#EA580C';
  if (clean.includes('marrom') || clean.includes('brown')) return '#78350F';
  if (clean.includes('cinza') || clean.includes('gray') || clean.includes('grey')) return '#6B7280';
  if (clean.includes('bege') || clean.includes('nude') || clean.includes('creme')) return '#D4C5B9';
  if (clean.includes('dourado') || clean.includes('gold')) return '#D97706';
  if (clean.includes('prata') || clean.includes('silver')) return '#94A3B8';

  return '#94A3B8';
};
