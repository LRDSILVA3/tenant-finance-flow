/**
 * Utilitários do Programa "Indique e Ganhe" (Member-Get-Member)
 * Gerencia persistência de códigos, montagem de links e mensagens do WhatsApp.
 */

export const REFERRAL_STORAGE_KEY = 'previna_referral_code';
export const EXTENDED_REFERRAL_TRIAL_DAYS = 22;
export const STANDARD_TRIAL_DAYS = 7;

/**
 * Gera um código de indicação exclusivo e limpo de 6 caracteres alfanuméricos (ex: 'K7M29B').
 * Apenas o código, SEM qualquer prefixo de empresa ou de sistema, e sem caracteres ambíguos (0, O, 1, I).
 */
export function generateReferralCode(length = 6): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Sanitiza e valida o formato de um código de indicação, garantindo que seja apenas o código.
 * Se o código informado contiver prefixos ou hífens (ex: 'EMPRESA-K7M29B'), remove o prefixo e extrai apenas o código.
 */
export function cleanReferralCode(code: string | null | undefined): string | null {
  if (!code) return null;
  let raw = code.trim().toUpperCase();
  if (raw.includes('-')) {
    const parts = raw.split('-');
    raw = parts[parts.length - 1];
  }
  const cleaned = raw.replace(/[^A-Z0-9]/g, '');
  return cleaned.length >= 4 ? cleaned : null;
}

/**
 * Obtém o código de indicação armazenado no navegador (localStorage + fallback em cookie).
 */
export function getStoredReferralCode(): string | null {
  try {
    if (typeof window === 'undefined') return null;

    // 1. Verificar localStorage
    const stored = localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (stored) {
      const clean = cleanReferralCode(stored);
      if (clean) return clean;
    }

    // 2. Fallback de verificação em cookie
    if (typeof document !== 'undefined' && document.cookie) {
      const match = document.cookie.match(new RegExp(`(^|;\\s*)${REFERRAL_STORAGE_KEY}=([^;]+)`));
      if (match && match[2]) {
        return cleanReferralCode(decodeURIComponent(match[2]));
      }
    }
  } catch {
    // Fail-safe silencioso
  }
  return null;
}

/**
 * Salva o código de indicação no localStorage e em cookie com validade de 30 dias.
 */
export function setStoredReferralCode(code: string | null | undefined): void {
  try {
    const clean = cleanReferralCode(code);
    if (!clean || typeof window === 'undefined') return;

    localStorage.setItem(REFERRAL_STORAGE_KEY, clean);

    // Gravar cookie com 30 dias de expiração
    if (typeof document !== 'undefined') {
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);
      document.cookie = `${REFERRAL_STORAGE_KEY}=${encodeURIComponent(clean)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
    }
  } catch {
    // Fail-safe
  }
}

/**
 * Remove o código de indicação do storage local.
 */
export function clearStoredReferralCode(): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
    if (typeof document !== 'undefined') {
      document.cookie = `${REFERRAL_STORAGE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
    }
  } catch {
    // Fail-safe
  }
}

/**
 * Monta o link absoluto de indicação para o onboarding.
 */
export function getReferralLink(code: string): string {
  const clean = cleanReferralCode(code) || 'CONVITE';
  const origin = typeof window !== 'undefined' && window.location.origin 
    ? window.location.origin 
    : 'https://gestaoprevina.com.br';
  return `${origin}/onboarding?ref=${encodeURIComponent(clean)}`;
}

/**
 * Mensagem convincente e amigável pronta para envio pelo WhatsApp.
 */
export function getReferralWhatsAppMessage(code: string, companyName?: string): string {
  const link = getReferralLink(code);
  const senderIntro = companyName ? `Eu aqui da ${companyName}` : 'Estou';

  return `Olá! ${senderIntro} usando o Previna Gestão para organizar as finanças, fluxo de caixa e vendas e tem sido excelente no dia a dia.

Consegui um link exclusivo para você testar gratuitamente com *22 dias de acesso liberado* (sem compromisso e com 15 dias extras de bônus):

👉 ${link}`;
}

/**
 * Retorna a URL direta para abrir o compartilhamento no WhatsApp Web ou App móvel.
 */
export function getWhatsAppShareUrl(code: string, companyName?: string): string {
  const message = getReferralWhatsAppMessage(code, companyName);
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

/**
 * Retorna a quantidade de dias de trial baseando-se na presença de indicação.
 */
export function calculateTrialDays(hasReferral: boolean, basePlanTrialDays = STANDARD_TRIAL_DAYS): number {
  if (basePlanTrialDays <= 0) return 0; // planos sem trial continuam sem trial
  return hasReferral ? EXTENDED_REFERRAL_TRIAL_DAYS : basePlanTrialDays;
}
