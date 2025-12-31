-- Add validation for consultation_fee to ensure it's between 5000 and 25000 pesos
-- This prevents professionals from setting invalid consultation fees

-- FIRST: Update any existing invalid fees to minimum value
UPDATE public.professionals
SET consultation_fee = 5000
WHERE consultation_fee < 5000 OR consultation_fee > 25000;

UPDATE public.professional_consultation_prices
SET precio_actual = 5000
WHERE precio_actual < 5000 OR precio_actual > 25000;

-- THEN: Add CHECK constraint to professionals table
ALTER TABLE public.professionals
ADD CONSTRAINT consultation_fee_range
CHECK (consultation_fee >= 5000 AND consultation_fee <= 25000);

-- Add CHECK constraint to professional_consultation_prices table
ALTER TABLE public.professional_consultation_prices
ADD CONSTRAINT precio_actual_range
CHECK (precio_actual >= 5000 AND precio_actual <= 25000);
