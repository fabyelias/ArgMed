-- Create medical_records table
CREATE TABLE IF NOT EXISTS public.medical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    diagnosis TEXT,
    doctor_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_medical_records_consultation ON public.medical_records(consultation_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON public.medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_doctor ON public.medical_records(doctor_id);

-- Enable Row Level Security
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for medical_records
-- Doctors can insert records for their own consultations
CREATE POLICY "Doctors can insert medical records for their consultations"
ON public.medical_records
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.consultations
        WHERE consultations.id = medical_records.consultation_id
        AND consultations.doctor_id = auth.uid()
    )
);

-- Doctors can view medical records for their consultations
CREATE POLICY "Doctors can view their medical records"
ON public.medical_records
FOR SELECT
TO authenticated
USING (
    doctor_id = auth.uid()
    OR
    patient_id = auth.uid()
);

-- Doctors can update their own medical records
CREATE POLICY "Doctors can update their medical records"
ON public.medical_records
FOR UPDATE
TO authenticated
USING (doctor_id = auth.uid())
WITH CHECK (doctor_id = auth.uid());

-- Doctors can delete their own medical records
CREATE POLICY "Doctors can delete their medical records"
ON public.medical_records
FOR DELETE
TO authenticated
USING (doctor_id = auth.uid());

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_medical_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_medical_records_updated_at
BEFORE UPDATE ON public.medical_records
FOR EACH ROW
EXECUTE FUNCTION update_medical_records_updated_at();
