-- ArgMed - Initial Database Schema
-- Created: 2024-12-25
-- Description: Complete database schema for ArgMed telemedicine platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE (Base user profile for all roles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('patient', 'professional', 'admin', 'legal_admin')),
    full_name TEXT,
    photo_url TEXT,
    phone TEXT,
    terms_accepted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- USERS TABLE (Patient-specific data)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    dni TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    birth_date DATE,
    address TEXT,
    city TEXT,
    province TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PROFESSIONALS TABLE (Doctor/Professional data)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.professionals (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    specialization TEXT NOT NULL,
    license_number TEXT UNIQUE NOT NULL,
    consultation_fee DECIMAL(10, 2) DEFAULT 0,
    payment_alias TEXT, -- MercadoPago alias
    is_active BOOLEAN DEFAULT TRUE,
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    bio TEXT,
    education TEXT,
    experience_years INTEGER,
    languages TEXT[],
    office_address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PROFESSIONAL_DOCUMENTS TABLE (Verification documents)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.professional_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('title_document', 'dni_front', 'dni_back', 'other')),
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CONSULTATIONS TABLE (Main consultation records)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.consultations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
    consultation_fee DECIMAL(10, 2) NOT NULL,
    platform_fee DECIMAL(10, 2),
    doctor_fee DECIMAL(10, 2),
    reason TEXT,
    notes TEXT,
    diagnosis TEXT,
    prescription TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CONSULTATION_REQUESTS TABLE (Smart routing system)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.consultation_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    current_doctor_id UUID REFERENCES public.professionals(id),
    specialty TEXT NOT NULL,
    status TEXT DEFAULT 'searching' CHECK (status IN ('searching', 'matched', 'expired', 'cancelled')),
    reason TEXT,
    preferred_language TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 minutes')
);

-- ============================================================================
-- PAYMENTS TABLE (Payment transactions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.users(id),
    professional_id UUID NOT NULL REFERENCES public.professionals(id),
    total_amount DECIMAL(10, 2) NOT NULL,
    platform_fee DECIMAL(10, 2) NOT NULL,
    doctor_fee DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    mercadopago_payment_id TEXT,
    mercadopago_status TEXT,
    payment_method TEXT,
    transfers_completed BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TRANSFERS TABLE (Fund distribution to professionals)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID NOT NULL REFERENCES public.consultations(id),
    payment_id UUID NOT NULL REFERENCES public.payments(id),
    professional_id UUID NOT NULL REFERENCES public.professionals(id),
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    mercadopago_transfer_id TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- CHAT_MESSAGES TABLE (Real-time messaging during consultations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id),
    message TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    file_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- NOTIFICATIONS TABLE (User notifications)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    related_consultation_id UUID REFERENCES public.consultations(id),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- LEGAL_TEAM TABLE (Legal admin users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.legal_team (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    permissions TEXT[] DEFAULT ARRAY['view_consultations', 'view_users', 'view_reports'],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Users
CREATE INDEX IF NOT EXISTS idx_users_dni ON public.users(dni);

-- Professionals
CREATE INDEX IF NOT EXISTS idx_professionals_specialization ON public.professionals(specialization);
CREATE INDEX IF NOT EXISTS idx_professionals_verification_status ON public.professionals(verification_status);
CREATE INDEX IF NOT EXISTS idx_professionals_is_active ON public.professionals(is_active);
CREATE INDEX IF NOT EXISTS idx_professionals_location ON public.professionals(latitude, longitude);

-- Consultations
CREATE INDEX IF NOT EXISTS idx_consultations_patient_id ON public.consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor_id ON public.consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON public.consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultations_created_at ON public.consultations(created_at DESC);

-- Consultation Requests
CREATE INDEX IF NOT EXISTS idx_consultation_requests_patient_id ON public.consultation_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultation_requests_status ON public.consultation_requests(status);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_consultation_id ON public.payments(consultation_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- Chat Messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_consultation_id ON public.chat_messages(consultation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_team ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- USERS POLICIES
CREATE POLICY "Patients can view own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Patients can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- PROFESSIONALS POLICIES
CREATE POLICY "Everyone can view active approved professionals" ON public.professionals
    FOR SELECT USING (is_active = true AND verification_status = 'approved');

CREATE POLICY "Professionals can view own data" ON public.professionals
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Professionals can update own data" ON public.professionals
    FOR UPDATE USING (auth.uid() = id);

-- CONSULTATIONS POLICIES
CREATE POLICY "Users can view own consultations" ON public.consultations
    FOR SELECT USING (
        auth.uid() = patient_id OR auth.uid() = doctor_id
    );

CREATE POLICY "Doctors can update consultations" ON public.consultations
    FOR UPDATE USING (auth.uid() = doctor_id);

-- CHAT_MESSAGES POLICIES
CREATE POLICY "Users can view messages from own consultations" ON public.chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.consultations
            WHERE consultations.id = chat_messages.consultation_id
            AND (consultations.patient_id = auth.uid() OR consultations.doctor_id = auth.uid())
        )
    );

CREATE POLICY "Users can insert messages in own consultations" ON public.chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.consultations
            WHERE consultations.id = consultation_id
            AND (consultations.patient_id = auth.uid() OR consultations.doctor_id = auth.uid())
        )
    );

-- NOTIFICATIONS POLICIES
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_professionals_updated_at BEFORE UPDATE ON public.professionals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_professional_documents_updated_at BEFORE UPDATE ON public.professional_documents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON public.consultations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_consultation_requests_updated_at BEFORE UPDATE ON public.consultation_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create buckets for file storage
INSERT INTO storage.buckets (id, name, public) VALUES
    ('avatars', 'avatars', true),
    ('professional_documents', 'professional_documents', false),
    ('chat_files', 'chat_files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for professional documents
CREATE POLICY "Professionals can upload own documents"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'professional_documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Professionals and admins can view documents"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'professional_documents');

-- ============================================================================
-- INITIAL DATA (Optional)
-- ============================================================================

-- You can add initial data here if needed
-- For example, default admin user, etc.

COMMENT ON TABLE public.profiles IS 'Base user profile table for all user types';
COMMENT ON TABLE public.users IS 'Patient-specific information';
COMMENT ON TABLE public.professionals IS 'Medical professional information';
COMMENT ON TABLE public.consultations IS 'Medical consultation records';
COMMENT ON TABLE public.payments IS 'Payment transaction records';
