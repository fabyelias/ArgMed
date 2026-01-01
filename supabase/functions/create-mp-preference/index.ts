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

    // Get professional's Mercado Pago user_id for receiving the 90%
    const { data: mpAccount, error: mpError } = await supabaseClient
      .from('mp_professional_accounts')
      .select('user_id_mp')
      .eq('professional_id', consultation.doctor_id)
      .eq('is_active', true)
      .single();

    if (mpError || !mpAccount || !mpAccount.user_id_mp) {
      throw new Error('Professional does not have Mercado Pago connected');
    }

    // Calculate fees: 90% to professional, 10% to platform
    const professionalAmount = Math.round(price * 0.90 * 100) / 100;
    const platformFee = Math.round(price * 0.10 * 100) / 100;

    // Create payment preference using PLATFORM credentials
    // Money goes to platform, then Mercado Pago splits to professional
    const preferenceData = {
      items: [
        {
          title: title,
          quantity: quantity,
          unit_price: price,
          currency_id: 'ARS',
        },
      ],
      disbursements: [
        {
          amount: professionalAmount,
          external_reference: `prof-${consultationId}`,
          collector_id: parseInt(mpAccount.user_id_mp),
          application_fee: platformFee,
        }
      ],
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

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PLATFORM_MP_ACCESS_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferenceData),
    });

    if (!mpResponse.ok) {
      const error = await mpResponse.text();
      console.error('MP Preference Creation Error:', error);
      throw new Error(`Failed to create preference: ${error}`);
    }

    const preference = await mpResponse.json();

    return new Response(
      JSON.stringify({
        preferenceId: preference.id,
        publicKey: Deno.env.get('PLATFORM_MP_PUBLIC_KEY'),
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
