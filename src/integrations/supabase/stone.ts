import { supabase } from "./client";

interface CreateStoneSubscriptionPayload {
  name: string;
  planId: string;
  paymentMethodToken: string; // This would typically come from a Stone tokenizer
}

interface CreateStoneSubscriptionResponse {
  message: string;
  stoneSubscriptionId: string;
  status: string;
}

export async function createStoneSubscription(
  payload: CreateStoneSubscriptionPayload,
): Promise<CreateStoneSubscriptionResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-stone-subscription`, {
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
    console.error("Error invoking create-stone-subscription Edge Function:", response.status, errorData);
    throw new Error(errorData.error || `Erro na chamada da função: ${response.status}`);
  }

  return await response.json();
}
