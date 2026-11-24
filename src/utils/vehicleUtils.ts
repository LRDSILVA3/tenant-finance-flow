/**
 * Utilitários e formatações para o módulo de Garagem e Oficinas Mecânicas
 */

export const VEHICLE_BRANDS = [
  'Chevrolet',
  'Fiat',
  'Volkswagen',
  'Toyota',
  'Hyundai',
  'Ford',
  'Honda',
  'Renault',
  'Jeep',
  'Nissan',
  'Peugeot',
  'Citroën',
  'Mitsubishi',
  'BMW',
  'Mercedes-Benz',
  'Audi',
  'Kia',
  'BYD',
  'GWM',
  'Caoa Chery',
  'Volvo',
  'Land Rover',
  'Outra',
] as const;

export const FUEL_TYPES = [
  'Flex',
  'Gasolina',
  'Etanol',
  'Diesel',
  'Híbrido',
  'Elétrico',
  'GNV',
] as const;

export const VEHICLE_COLORS = [
  'Branco',
  'Prata',
  'Preto',
  'Cinza',
  'Vermelho',
  'Azul',
  'Verde',
  'Amarelo',
  'Bordô',
  'Bege',
  'Marrom',
  'Outra',
] as const;

/**
 * Limpa a placa deixando apenas caracteres alfanuméricos em caixa alta
 */
export function cleanPlate(raw: string): string {
  return (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
}

/**
 * Formata a placa veicular brasileira dinamicamente:
 * - Mercosul: ABC1D23 (3 letras, 1 número, 1 letra, 2 números) -> sem hífen
 * - Padrão Cinza Antigo: ABC-1234 (3 letras, hífen, 4 números) -> com hífen
 * - Durante digitação: se digitou mais de 3 letras e números antigos, insere hífen
 */
export function formatVehiclePlate(raw: string): string {
  if (!raw) return '';
  const clean = (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (clean.length === 0) return '';

  // Se tem até 3 caracteres, apenas letras maiúsculas
  if (clean.length <= 3) {
    return clean;
  }

  // A partir do 4º caractere:
  // Se for Mercosul (ex: ABC1D23 - 5º caractere é letra):
  const isMercosul = clean.length >= 5 && isNaN(Number(clean[4]));

  if (isMercosul) {
    // Mercosul nunca leva hífen: ABC1D23
    return clean.slice(0, 7);
  }

  // Padrão antigo: ABC-1234
  // Se o 5º caractere for número ou ainda não foi digitado:
  if (clean.length <= 7) {
    // Insere hífen após as 3 primeiras letras
    return `${clean.slice(0, 3)}-${clean.slice(3, 7)}`;
  }

  return `${clean.slice(0, 3)}-${clean.slice(3, 7)}`;
}

/**
 * Valida se a placa é válida no padrão brasileiro (Mercosul ou Antigo)
 */
export function isValidPlate(plate: string): boolean {
  const clean = cleanPlate(plate);
  if (clean.length !== 7) return false;

  // Padrão Antigo: 3 letras + 4 números (ex: ABC1234)
  const oldRegex = /^[A-Z]{3}[0-9]{4}$/;
  // Padrão Mercosul: 3 letras + 1 número + 1 letra + 2 números (ex: ABC1D23)
  const mercosulRegex = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

  return oldRegex.test(clean) || mercosulRegex.test(clean);
}

