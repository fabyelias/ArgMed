-- ============================================
-- ARGMED - Corrección de Políticas y Permisos
-- Fecha: 2026-01-02
-- ============================================

-- 1. STORAGE: Políticas para bucket 'avatars'
-- ============================================

-- Eliminar políticas anteriores si existen
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Crear políticas correctas para avatars
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- 2. CONSULTATIONS: Políticas para crear y ver consultas
-- ============================================

-- Eliminar políticas anteriores si existen
DROP POLICY IF EXISTS "Authenticated users can create consultations" ON consultations;
DROP POLICY IF EXISTS "Patients can create consultations" ON consultations;
DROP POLICY IF EXISTS "Users can view their consultations" ON consultations;
DROP POLICY IF EXISTS "Doctors can update their consultations" ON consultations;

-- Crear políticas correctas
CREATE POLICY "Authenticated users can create consultations"
ON consultations FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can view their consultations"
ON consultations FOR SELECT
TO authenticated
USING (patient_id = auth.uid() OR doctor_id = auth.uid());

CREATE POLICY "Users can update their consultations"
ON consultations FOR UPDATE
TO authenticated
USING (patient_id = auth.uid() OR doctor_id = auth.uid());

-- 3. NOTIFICATIONS: Políticas para notificaciones
-- ============================================

-- Eliminar políticas anteriores si existen
DROP POLICY IF EXISTS "Users can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;

-- Crear políticas correctas
CREATE POLICY "Anyone can create notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can view their notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- 4. CONSULTATION_REQUESTS: Políticas para solicitudes
-- ============================================

-- Eliminar políticas anteriores si existen
DROP POLICY IF EXISTS "Users can create consultation requests" ON consultation_requests;
DROP POLICY IF EXISTS "Users can view consultation requests" ON consultation_requests;
DROP POLICY IF EXISTS "Users can update consultation requests" ON consultation_requests;

-- Crear políticas correctas
CREATE POLICY "Users can create consultation requests"
ON consultation_requests FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can view consultation requests"
ON consultation_requests FOR SELECT
TO authenticated
USING (patient_id = auth.uid() OR current_doctor_id = auth.uid());

CREATE POLICY "Users can update consultation requests"
ON consultation_requests FOR UPDATE
TO authenticated
USING (patient_id = auth.uid() OR current_doctor_id = auth.uid());

-- ============================================
-- FIN DE LAS POLÍTICAS
-- ============================================
