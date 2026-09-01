import { serve } from "https://deno.land/std@0.178.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Evolution API typically sends webhooks in a specific format. 
// We will anticipate the basic structure here.
interface EvolutionWebhookPayload {
  event: string; // e.g., "messages.upsert"
  data: {
    key: {
      remoteJid: string; // "5511999999999@s.whatsapp.net"
      fromMe: boolean;
      id: string;
    };
    pushName: string;
    messageType: string; // "conversation", "imageMessage", "audioMessage"
    message: {
      conversation?: string; // Text message
      extendedTextMessage?: { text: string }; // Text message with link/reply
      imageMessage?: { 
        caption?: string; 
        url?: string; 
        mimetype?: string;
        // Evolution API usually allows downloading the media via a specific endpoint
        base64?: string; // Sometimes configured to send base64 directly
      }; 
    };
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    
    // Check if it's a message event and not from the bot itself
    if (payload.event !== "messages.upsert" || !payload.data || payload.data.key.fromMe) {
      return new Response(JSON.stringify({ status: "ignored" }), { headers: corsHeaders });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
    
    const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);

    // 1. Extract phone number
    const remoteJid = payload.data.key.remoteJid;
    // remoteJid format: 5511999999999@s.whatsapp.net
    const phoneNumber = remoteJid.split('@')[0];

    // 2. Identify the user in the database
    // We check if any profile has this exact whatsapp_number
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('whatsapp_number', phoneNumber)
      .maybeSingle();

    if (!profile) {
      console.log(`Unregistered number: ${phoneNumber}`);
      // Return a message that the Evolution API should send back (if configured to reply via webhook response, or we could trigger a POST to Evolution API here)
      return new Response(JSON.stringify({ 
        reply: "Olá! Não encontrei nenhuma conta do Previna vinculada a este número. Por favor, adicione este número no seu painel." 
      }), { headers: corsHeaders });
    }

    // 3. Find the client associated with this user
    // For simplicity, we get the first client they own/collaborate on
    const { data: clientMember } = await supabase
      .from('client_members')
      .select('client_id')
      .eq('user_id', profile.id)
      .limit(1)
      .single();

    if (!clientMember) {
      return new Response(JSON.stringify({ reply: "Você não possui nenhuma empresa configurada no Previna." }), { headers: corsHeaders });
    }

    const clientId = clientMember.client_id;

    // 4. Check plan permissions
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, plans(features)')
      .eq('client_id', clientId)
      .maybeSingle();

    const isIAPlan = subscription?.plans?.features?.whatsapp_ia === true;
    const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';

    if (!isIAPlan && !profile.is_admin) {
      return new Response(JSON.stringify({ reply: "A funcionalidade de IA via WhatsApp requer o Plano Avançado. Faça um upgrade no seu painel para começar a usar!" }), { headers: corsHeaders });
    }

    if (!isActive && !profile.is_admin) {
      return new Response(JSON.stringify({ reply: "Sua assinatura está inativa. Por favor, regularize seu pagamento para usar a IA via WhatsApp." }), { headers: corsHeaders });
    }

    // 5. Extract content
    let textContent = "";
    let base64Image = "";
    let mimeType = "";

    const msg = payload.data.message;
    if (msg.conversation) {
      textContent = msg.conversation;
    } else if (msg.extendedTextMessage?.text) {
      textContent = msg.extendedTextMessage.text;
    } else if (msg.imageMessage) {
      textContent = msg.imageMessage.caption || "Extraia os dados deste comprovante.";
      base64Image = msg.imageMessage.base64 || ""; // Assumes Evolution is configured to send base64
      mimeType = msg.imageMessage.mimetype || "image/jpeg";
    }

    if (!textContent && !base64Image) {
      return new Response(JSON.stringify({ reply: "Por favor, envie um texto ou a foto de um comprovante." }), { headers: corsHeaders });
    }

    // 6. Fetch categories for this client
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, type')
      .eq('client_id', clientId);

    const categoriesList = categories?.map(c => `- ${c.name} (ID: ${c.id}, Tipo: ${c.type})`).join('\n') || "Nenhuma categoria encontrada.";

    // 7. Call Gemini API
    const systemPrompt = `
      Você é um assistente financeiro inteligente para o sistema "Previna". 
      Sua tarefa é analisar o texto ou a imagem de um recibo/nota fiscal e extrair os dados financeiros, mapeando-os para as categorias do usuário.
      
      Categorias disponíveis:
      ${categoriesList}

      Regras estritas:
      - Responda APENAS com um objeto JSON válido, sem markdown, sem formatação, sem texto extra.
      - O JSON deve ter exatamente estas chaves:
        - "amount": Número (float). O valor total gasto ou recebido.
        - "description": String. Resumo do que foi comprado ou nome do fornecedor (ex: "Posto Ipiranga", "Uber", "Conta de Luz").
        - "date": String no formato "YYYY-MM-DD". Tente extrair a data do recibo. Se não houver data explícita ou o usuário falar "hoje", use a data de hoje.
        - "type": String. Deve ser estritamente "expense" (se for um gasto/pagamento) ou "income" (se for um recebimento).
        - "category_id": String (UUID). O ID da categoria que melhor se encaixa. Escolha uma categoria que tenha o "type" correspondente. Se nenhuma se encaixar perfeitamente, escolha a mais genérica do tipo correto.
      
      Se o usuário não especificar a data, assuma a data atual.
    `;

    const geminiPayload: any = {
      contents: [{
        role: "user",
        parts: [
          { text: systemPrompt },
          { text: `Análise esta requisição: ${textContent}` }
        ]
      }]
    };

    if (base64Image) {
      // If there's an image, we use the gemini-1.5-flash or gemini-1.5-pro model
      geminiPayload.contents[0].parts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Image
        }
      });
    }

    // Call Gemini API
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload)
    });

    if (!geminiResponse.ok) {
      const err = await geminiResponse.text();
      console.error("Gemini API Error:", err);
      return new Response(JSON.stringify({ reply: "Desculpe, tive um problema ao analisar seu envio." }), { headers: corsHeaders });
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData.candidates[0].content.parts[0].text;
    
    // Clean up potential markdown formatting around JSON (e.g. ```json ... ```)
    const jsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let transactionData;
    try {
      transactionData = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse Gemini output:", rawText);
      return new Response(JSON.stringify({ reply: "Não consegui entender os dados do recibo. Tente novamente de forma mais clara." }), { headers: corsHeaders });
    }

    // 8. Default to today if date parsing failed
    const txDate = transactionData.date && transactionData.date.match(/^\d{4}-\d{2}-\d{2}$/) 
      ? transactionData.date 
      : new Date().toISOString().split('T')[0];

    // 9. Save to Database
    const { error: insertError } = await supabase
      .from('transactions')
      .insert({
        user_id: profile.id,
        client_id: clientId,
        category_id: transactionData.category_id,
        description: transactionData.description || 'Lançamento via WhatsApp',
        amount: transactionData.amount || 0,
        type: transactionData.type || 'expense',
        date: txDate,
        payment_method: null,
        status: 'pending',
        is_recurring: false
      });

    if (insertError) {
      console.error("Database Insert Error:", insertError);
      return new Response(JSON.stringify({ reply: "Entendi os dados, mas houve um erro ao salvar no sistema. Verifique se as categorias estão configuradas corretamente." }), { headers: corsHeaders });
    }

    // 10. Reply success
    const typeLabel = transactionData.type === 'expense' ? 'Despesa' : 'Receita';
    const categoryName = categories?.find(c => c.id === transactionData.category_id)?.name || 'N/A';
    const replyMessage = `✅ Lançamento registrado com sucesso!\n\n*${typeLabel}:* ${transactionData.description}\n*Valor:* R$ ${Number(transactionData.amount).toFixed(2)}\n*Data:* ${txDate}\n*Categoria:* ${categoryName}`;

    return new Response(JSON.stringify({ reply: replyMessage }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });

  } catch (error) {
    console.error("Webhook Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { headers: corsHeaders, status: 400 });
  }
});
