import { serve } from "https://deno.land/std@0.178.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { 
      targetUserId, 
      email, 
      password, 
      whatsappNumber, 
      companyName, 
      clientId 
    } = await req.json();

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error("Supabase env vars are not set");
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // --- JWT VERIFICATION ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace(/^Bearer /i, '');
    const { data: { user: requester }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !requester) {
      console.error("Auth Error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 },
      );
    }

    // Get requester profile
    const { data: requesterProfile, error: profileErr } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', requester.id)
      .single();

    if (profileErr || !requesterProfile) {
      console.error("Requester profile error:", profileErr);
      throw new Error("Could not verify requester profile");
    }

    const isAdmin = requesterProfile.is_admin;

    // Guard: requester must either be admin OR be updating themselves
    if (!isAdmin && requester.id !== targetUserId) {
      return new Response(
        JSON.stringify({ error: "Forbidden: You cannot modify other users' credentials" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 },
      );
    }

    // Guard: if modifying companyName, must own the client (if not admin)
    if (!isAdmin && companyName && clientId) {
      const { data: client, error: clientErr } = await supabase
        .from('clients')
        .select('user_id')
        .eq('id', clientId)
        .single();

      if (clientErr || !client) {
        throw new Error("Client not found");
      }

      if (client.user_id !== requester.id) {
        return new Response(
          JSON.stringify({ error: "Forbidden: You do not own this client/company" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 },
        );
      }
    }

    // 1. Handle Email Update & check uniqueness
    if (email) {
      const normalizedEmail = email.trim().toLowerCase();

      // Check if email is in use by another user in public.profiles
      const { data: existingUser, error: dupError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', normalizedEmail)
        .neq('id', targetUserId)
        .maybeSingle();

      if (dupError) {
        console.error("Error checking duplicate email:", dupError);
        throw dupError;
      }

      if (existingUser) {
        return new Response(
          JSON.stringify({ error: "Este e-mail já está sendo utilizado por outro usuário." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
        );
      }

      // Update auth.users email
      const { error: updateAuthErr } = await supabase.auth.admin.updateUserById(
        targetUserId,
        { email: normalizedEmail, email_confirm: true }
      );

      if (updateAuthErr) {
        console.error("Error updating auth.users email:", updateAuthErr);
        throw new Error(`Erro ao atualizar e-mail: ${updateAuthErr.message}`);
      }

      // Update email in public.profiles
      const { error: updateProfileErr } = await supabase
        .from('profiles')
        .update({ email: normalizedEmail })
        .eq('id', targetUserId);

      if (updateProfileErr) {
        console.error("Error updating profiles email:", updateProfileErr);
        throw new Error(`Erro ao atualizar e-mail no perfil: ${updateProfileErr.message}`);
      }
    }

    // 2. Handle Password Update
    if (password) {
      const { error: updatePassErr } = await supabase.auth.admin.updateUserById(
        targetUserId,
        { password: password }
      );

      if (updatePassErr) {
        console.error("Error updating auth.users password:", updatePassErr);
        throw new Error(`Erro ao atualizar senha: ${updatePassErr.message}`);
      }
    }

    // 3. Handle WhatsApp Update
    if (whatsappNumber !== undefined) {
      const { error: updateWhatsappErr } = await supabase
        .from('profiles')
        .update({ whatsapp_number: whatsappNumber })
        .eq('id', targetUserId);

      if (updateWhatsappErr) {
        console.error("Error updating whatsapp:", updateWhatsappErr);
        throw new Error(`Erro ao atualizar WhatsApp: ${updateWhatsappErr.message}`);
      }
    }

    // 4. Handle Company Name Update
    if (companyName && clientId) {
      const { error: updateCompanyErr } = await supabase
        .from('clients')
        .update({ name: companyName.trim() })
        .eq('id', clientId);

      if (updateCompanyErr) {
        console.error("Error updating company name:", updateCompanyErr);
        throw new Error(`Erro ao atualizar nome da empresa: ${updateCompanyErr.message}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Acessos atualizados com sucesso." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Error in manage-user-auth:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
