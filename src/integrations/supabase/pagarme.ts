import { supabase } from "./client";

interface PagarmeSubscriptionPayload {
  clientId: string;
  planId: string;
  planName: string;
  amount: number; // in cents
  cardToken?: string;
  paymentMethod?: 'credit_card' | 'pix';
  customer: {
    name: string;
    email: string;
    document: string;
    phone: string; // Added phone
    address: {
      zipCode: string;
      street: string;
      number: string;
      complement?: string;
      neighborhood?: string;
      city: string;
      state: string;
    }
  };
}

interface PagarmeSubscriptionResponse {
  success: boolean;
  pagarmeSubscriptionId: string;
  status: string;
  qrCode?: string;
  qrCodeUrl?: string;
  error?: string;
}

export async function createPagarmeSubscription(
  payload: PagarmeSubscriptionPayload,
): Promise<PagarmeSubscriptionResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-pagarme-subscription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Error invoking create-pagarme-subscription Edge Function:", response.status, errorData);
    throw new Error(errorData.error || `Erro na chamada da função: ${response.status}`);
  }

  return await response.json();
}

export async function cancelPagarmeSubscription(subscriptionId: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-pagarme-subscription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({ subscriptionId })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Error invoking cancel-pagarme-subscription Edge Function:", response.status, errorData);
    throw new Error(errorData.error || `Erro na chamada da função: ${response.status}`);
  }

  return await response.json();
}
