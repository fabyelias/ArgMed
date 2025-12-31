-- Fix consultations UPDATE policy to allow both doctors and patients to update
-- This is needed for call termination to work properly

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Doctors can update consultations" ON public.consultations;

-- Create new policy that allows both doctor (via professionals table) and patient to update
CREATE POLICY "Doctors and patients can update their consultations"
ON public.consultations
FOR UPDATE
USING (
    -- Patient can update their own consultations
    auth.uid() = patient_id
    OR
    -- Doctor can update consultations where they are the doctor
    auth.uid() IN (SELECT user_id FROM public.professionals WHERE id = consultations.doctor_id)
)
WITH CHECK (
    -- Patient can update their own consultations
    auth.uid() = patient_id
    OR
    -- Doctor can update consultations where they are the doctor
    auth.uid() IN (SELECT user_id FROM public.professionals WHERE id = consultations.doctor_id)
);

-- Enable Realtime for consultations table
ALTER PUBLICATION supabase_realtime ADD TABLE consultations;
