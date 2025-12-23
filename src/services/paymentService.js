import { supabase } from '@/lib/customSupabaseClient';

export const processConsultationPayment = async (consultation, professional, paymentMethod) => {
  return new Promise(async (resolve, reject) => {
    console.log(`[PAYMENT_INIT] Starting payment processing for Consultation ID: ${consultation.id}`);
    
    try {
      const totalAmount = parseFloat(consultation.consultation_fee || 0);
      const platformFee = totalAmount * 0.10;
      const professionalFee = totalAmount * 0.90;
      
      setTimeout(async () => {
        
        const { data: paymentRecord, error: paymentError } = await supabase
          .from('payments')
          .insert([{
            consultation_id: consultation.id,
            total_amount: totalAmount,
            platform_fee: platformFee,
            doctor_fee: professionalFee, // Legacy column name in `payments` table
            status: 'paid',
            payment_method: paymentMethod,
            transaction_id: `TX-${Date.now()}`,
            transfers_completed: false
          }])
          .select()
          .single();

        if (paymentError) {
          console.error("DB Payment Insert Error", paymentError);
          reject(new Error('Error registrando el pago en el sistema.'));
          return;
        }

        await supabase
          .from('consultations')
          .update({ 
            payment_status: 'paid', 
            status: 'paid', 
            updated_at: new Date().toISOString()
          })
          .eq('id', consultation.id);

        await distributeFunds(consultation.id, professional, professionalFee);

        resolve(paymentRecord);
        
      }, 2000); 

    } catch (error) {
      reject(error);
    }
  });
};

export const distributeFunds = async (consultationId, professional, amount) => {
    console.log(`[TRANSFER_INIT] Distributing $${amount} to professional ${professional.id}`);
    
    try {
        const isVerified = professional.alias_verified;
        const alias = professional.payment_alias;
        const aliasType = professional.alias_type || 'unknown';
        
        let transferStatus = 'pending';
        let errorMessage = null;
        let completedAt = null;

        if (isVerified && alias) {
            transferStatus = 'completed';
            completedAt = new Date().toISOString();
            console.log(`[TRANSFER_SUCCESS] Transferred to ${alias} (${aliasType})`);
        } else {
            transferStatus = 'failed';
            errorMessage = !alias ? "No alias configured" : "Alias not verified";
            console.warn(`[TRANSFER_HELD] Funds held: ${errorMessage}`);
        }

        await supabase.from('transfers').insert({
            consultation_id: consultationId,
            professional_id: professional.id, // Updated column
            amount: amount,
            recipient_alias: alias,
            recipient_type: aliasType,
            status: transferStatus,
            completed_at: completedAt,
            error_message: errorMessage
        });

        if (transferStatus === 'completed') {
            await supabase.from('payments')
                .update({ transfers_completed: true })
                .eq('consultation_id', consultationId);
        }

        return { success: true, status: transferStatus };

    } catch (error) {
        console.error("Error distributing funds:", error);
        return { success: false, error };
    }
};

export const getPaymentStatus = async (consultationId) => {
  const { data } = await supabase
    .from('payments')
    .select('status, transfers_completed')
    .eq('consultation_id', consultationId)
    .single();
  
  return data || { status: 'unpaid', transfers_completed: false };
};