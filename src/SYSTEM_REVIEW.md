# System Architecture & Flow Review

## 1. Consultation Creation Flow
When a doctor accepts a request in `DoctorLayout.jsx` (`handleAcceptRequest`), the following occurs:

### A) Smart Request (Immediate Search)
1. **Validation:** Checks for fees and patient ID.
2. **Creation:** A new record is inserted into the `consultations` table.
   - Status: `accepted`
   - Payment Status: `unpaid`
   - Reason: From request or default text.
3. **Request Update:** The original `consultation_requests` record is updated to `status: 'matched'`, signaling the patient client to stop searching.
4. **Navigation:** Doctor is redirected to the dashboard (or waiting room) to await payment.

### B) Direct Request
1. **Update:** The existing `consultations` record (created when patient clicked "Request") is updated from `pending` to `accepted`.
2. **Navigation:** Doctor is redirected.

## 2. Patient Search & Payment Flow
1. **Search:** In `FindDoctor.jsx`, patient initiates search.
2. **Routing:** Client-side logic (`routeRequestToNextDoctor`) cycles through doctors, setting `current_doctor_id` on the request.
3. **Match:** When doctor accepts, request status becomes `matched`.
4. **Discovery:** Patient client listens for `matched` status, then queries the `consultations` table to find the newly created record by the matched doctor.
5. **Payment:** 
   - Patient is navigated to `ConfirmConsultation`.
   - If unpaid, patient goes to `Payment.jsx`.
   - `Payment.jsx` initiates MercadoPago checkout.
   - Upon return (`PaymentStatus.jsx`), if approved, the consultation status is updated to `paid`.

## 3. Doctor Active Consultations View
In `DoctorHome.jsx`:
1. **Query:** Fetches consultations where `doctor_id` equals current user AND status is one of `['paid', 'in_call', 'active']`.
2. **Realtime:** Subscribes to `consultations` table changes.
3. **Display:** Shows a card for each active consultation with a "Enter Video Room" button.

## 4. Key Supabase Queries

### Consultations