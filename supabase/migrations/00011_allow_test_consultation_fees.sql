-- Temporarily allow test consultation fees for testing payment flow
-- This removes the minimum fee constraint to allow 2 peso test consultations

-- Drop the existing constraint
ALTER TABLE public.professionals
DROP CONSTRAINT IF EXISTS consultation_fee_range;

-- Add new constraint with lower minimum (2 pesos for testing)
ALTER TABLE public.professionals
ADD CONSTRAINT consultation_fee_range
CHECK (consultation_fee >= 2 AND consultation_fee <= 25000);
