-- ============================================
-- ARGMED - Crear índices para rendimiento (FINAL)
-- ============================================

-- Índices para consultations
CREATE INDEX IF NOT EXISTS idx_consultations_patient_id
ON consultations(patient_id);

CREATE INDEX IF NOT EXISTS idx_consultations_doctor_id
ON consultations(doctor_id);

-- Índices para medical_records
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id
ON medical_records(patient_id);

CREATE INDEX IF NOT EXISTS idx_medical_records_doctor_id
ON medical_records(doctor_id);

-- Índices para consultation_requests
CREATE INDEX IF NOT EXISTS idx_consultation_requests_patient_id
ON consultation_requests(patient_id);

CREATE INDEX IF NOT EXISTS idx_consultation_requests_current_doctor
ON consultation_requests(current_doctor_id);

-- Índice para notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
ON notifications(user_id);
