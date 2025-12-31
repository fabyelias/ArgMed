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

    // Get payment details from Mercado Pago
    // We need to find which professional's token to use
    // For now, we'll update based on external_reference (consultation_id)
    // In production, you'd want to store the payment_id with the consultation

    // The payment webhook comes before we can verify it
    // We'll mark it as pending verification and let the success page handle it
    // Or we can fetch payment details from MP API

    // For now, just log and return success
    // The PaymentSuccess page will handle the status update
    console.log('Payment webhook processed for payment:', paymentId);

    return new Response(
      JSON.stringify({ received: true, paymentId }),
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
