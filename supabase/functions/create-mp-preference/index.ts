// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface RequestPayload {
  consultationId: string;
  title: string;
  price: number;
  quantity: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.info('create-mp-preference function started');

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { consultationId, title, price, quantity }: RequestPayload = await req.json();

    // Use service role key to bypass RLS - we validate consultation exists
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get consultation details
    const { data: consultation, error: consultationError } = await supabaseClient
      .from('consultations')
      .select('doctor_id, patient_id, consultation_fee')
      .eq('id', consultationId)
      .single();

    if (consultationError || !consultation) {
      throw new Error('Consultation not found');
    }

    // Get professional's Mercado Pago credentials
    const { data: mpAccount, error: mpError } = await supabaseClient
      .from('mp_professional_accounts')
      .select('access_token, public_key')
      .eq('professional_id', consultation.doctor_id)
      .eq('is_active', true)
      .single();

    if (mpError || !mpAccount || !mpAccount.access_token) {
      throw new Error('Professional does not have Mercado Pago connected');
    }

    // Calculate 10% platform fee
    const platformFeeAmount = Math.round(price * 0.10 * 100) / 100;

    // Create payment preference using PROFESSIONAL's credentials
    // Patient pays to professional, Mercado Pago automatically sends 10% to platform
    const preferenceData = {
      items: [
        {
          title: title,
          quantity: quantity,
          unit_price: price,
          currency_id: 'ARS',
        },
      ],
      marketplace_fee: platformFeeAmount,
      back_urls: {
        success: `${Deno.env.get('FRONTEND_URL') || 'https://argmed.online'}/user/payment-success?consultation_id=${consultationId}`,
        failure: `${Deno.env.get('FRONTEND_URL') || 'https://argmed.online'}/user/payment?consultation_id=${consultationId}`,
        pending: `${Deno.env.get('FRONTEND_URL') || 'https://argmed.online'}/user/payment-status?consultation_id=${consultationId}`,
      },
      auto_return: 'approved',
      external_reference: consultationId,
      notification_url: 'https://msnppinpethxfxskfgsv.supabase.co/functions/v1/mp-webhook',
      metadata: {
        consultation_id: consultationId,
      },
    };

    console.log('Creating MP preference with token:', mpAccount.access_token?.substring(0, 20) + '...');
    console.log('Preference data:', JSON.stringify(preferenceData, null, 2));

    let mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccount.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferenceData),
    });

    console.log('MP Response status:', mpResponse.status);

    // If token is invalid/expired, try to refresh it
    if (mpResponse.status === 401 || mpResponse.status === 404) {
      console.log('Token may be expired, attempting to refresh...');

      if (mpAccount.refresh_token) {
        try {
          const refreshResponse = await fetch('https://api.mercadopago.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: Deno.env.get('MP_CLIENT_ID') || Deno.env.get('MERCADO_PAGO_CLIENT_ID') || '',
              client_secret: Deno.env.get('MP_CLIENT_SECRET') || Deno.env.get('MERCADO_PAGO_CLIENT_SECRET') || '',
              grant_type: 'refresh_token',
              refresh_token: mpAccount.refresh_token,
            }),
          });

          if (refreshResponse.ok) {
            const newTokenData = await refreshResponse.json();

            // Update token in database
            await supabaseClient
              .from('mp_professional_accounts')
              .update({
                access_token: newTokenData.access_token,
                refresh_token: newTokenData.refresh_token,
                last_refreshed_at: new Date().toISOString(),
              })
              .eq('professional_id', consultation.doctor_id);

            console.log('Token refreshed successfully');

            // Retry the preference creation with new token
            mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${newTokenData.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(preferenceData),
            });
          } else {
            console.error('Failed to refresh token:', await refreshResponse.text());
          }
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError);
        }
      }
    }

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error('MP Preference Creation Error:', errorText);
      console.error('MP Response status:', mpResponse.status);

      // Try to parse error response
      let errorMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorText;
      } catch (e) {
        // Keep original error text
      }

      throw new Error(`MercadoPago API Error (${mpResponse.status}): ${errorMessage}`);
    }

    const preference = await mpResponse.json();

    return new Response(
      JSON.stringify({
        preferenceId: preference.id,
        publicKey: mpAccount.public_key,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Function Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
