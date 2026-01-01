// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.info('mp-webhook function started');

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Webhook received:', body);

    // Mercado Pago sends notifications with this structure
    const { type, data } = body;

    // Only process payment notifications
    if (type !== 'payment') {
      console.log('Ignoring non-payment notification:', type);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const paymentId = data?.id;
    if (!paymentId) {
      throw new Error('No payment ID in webhook');
    }

    console.log('Processing payment:', paymentId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get payment details from Mercado Pago API
    // We need to use the collector's access token (the professional who received the payment)
    // First, we'll get basic payment info to find the consultation
    const mpPublicResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}`,
      },
    });

    if (!mpPublicResponse.ok) {
      console.error('Failed to fetch payment from MP');
      throw new Error('Could not fetch payment details');
    }

    const paymentData = await mpPublicResponse.json();
    console.log('Payment data:', JSON.stringify(paymentData));

    const consultationId = paymentData.external_reference || paymentData.metadata?.consultation_id;

    if (!consultationId) {
      console.error('No consultation ID in payment data');
      throw new Error('No consultation reference found');
    }

    // Get consultation details
    const { data: consultation, error: consultationError } = await supabaseClient
      .from('consultations')
      .select('id, doctor_id, patient_id, consultation_fee')
      .eq('id', consultationId)
      .single();

    if (consultationError || !consultation) {
      console.error('Consultation not found:', consultationId);
      throw new Error('Consultation not found');
    }

    // Calculate fees (10% platform, 90% professional)
    const totalAmount = paymentData.transaction_amount || consultation.consultation_fee;
    const platformFee = totalAmount * 0.10;
    const professionalFee = totalAmount * 0.90;

    // Only process approved payments
    if (paymentData.status === 'approved') {
      console.log(`Payment approved for consultation ${consultationId}: $${totalAmount}`);

      // Update consultation status
      await supabaseClient
        .from('consultations')
        .update({
          payment_status: 'paid',
          status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', consultationId);

      // Insert payment record
      await supabaseClient
        .from('payments')
        .insert({
          consultation_id: consultationId,
          total_amount: totalAmount,
          platform_fee: platformFee,
          doctor_fee: professionalFee,
          status: 'paid',
          payment_method: paymentData.payment_method_id || 'mercadopago',
          transaction_id: `MP-${paymentId}`,
          transfers_completed: false,
        });

      console.log(`Payment recorded: Platform $${platformFee.toFixed(2)}, Professional $${professionalFee.toFixed(2)}`);
    } else {
      console.log(`Payment status: ${paymentData.status} - not approved yet`);
    }

    return new Response(
      JSON.stringify({
        received: true,
        paymentId,
        status: paymentData.status,
        consultationId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Webhook Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
