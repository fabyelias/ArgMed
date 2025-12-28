// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface RequestPayload {
  action: string;
  professional_id?: string;
  doctor_id?: string;
  redirect_uri?: string;
  code?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.info('mp-connect function started');

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, professional_id, doctor_id, redirect_uri, code }: RequestPayload = await req.json();
    const userId = professional_id || doctor_id; // Support both parameter names

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const MP_CLIENT_ID = Deno.env.get('MP_CLIENT_ID') || Deno.env.get('MERCADO_PAGO_CLIENT_ID');
    const MP_CLIENT_SECRET = Deno.env.get('MP_CLIENT_SECRET') || Deno.env.get('MERCADO_PAGO_CLIENT_SECRET');

    if (!MP_CLIENT_ID || !MP_CLIENT_SECRET) {
      throw new Error('Mercado Pago credentials not configured');
    }

    // ACTION: Get Authorization URL
    if (action === 'get_auth_url') {
      const authUrl = `https://auth.mercadopago.com.ar/authorization?client_id=${MP_CLIENT_ID}&response_type=code&platform_id=mp&state=${userId}&redirect_uri=${encodeURIComponent(redirect_uri!)}`;

      return new Response(
        JSON.stringify({ url: authUrl }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Connection': 'keep-alive' },
          status: 200,
        },
      );
    }

    // ACTION: Exchange Code for Token (supports both 'exchange_code' and 'exchange_token')
    if (action === 'exchange_code' || action === 'exchange_token') {
      const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: MP_CLIENT_ID,
          client_secret: MP_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code: code!,
          redirect_uri: redirect_uri!,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('MP Token Exchange Error:', error);
        throw new Error(`Failed to exchange code: ${error}`);
      }

      const tokenData = await tokenResponse.json();

      // Save to database
      const { error: dbError } = await supabaseClient
        .from('mp_professional_accounts')
        .upsert({
          professional_id: userId,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          user_id_mp: tokenData.user_id,
          public_key: tokenData.public_key,
          connected_at: new Date().toISOString(),
          is_active: true,
        });

      if (dbError) {
        console.error('Database Error:', dbError);
        throw new Error(`Database error: ${dbError.message}`);
      }

      return new Response(
        JSON.stringify({ success: true, user_id: tokenData.user_id }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Connection': 'keep-alive' },
          status: 200,
        },
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Function Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Connection': 'keep-alive' },
        status: 400,
      },
    );
  }
});
