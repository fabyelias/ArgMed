-- Add validation for consultation_fee to ensure it's between 5000 and 25000 pesos
-- This prevents professionals from setting invalid consultation fees

-- FIRST: Update any existing invalid fees to minimum value
UPDATE public.professionals
SET consultation_fee = 5000
WHERE consultation_fee < 5000 OR consultation_fee > 25000;

-- THEN: Add CHECK constraint to professionals table
ALTER TABLE public.professionals
ADD CONSTRAINT consultation_fee_range
CHECK (consultation_fee >= 5000 AND consultation_fee <= 25000);
