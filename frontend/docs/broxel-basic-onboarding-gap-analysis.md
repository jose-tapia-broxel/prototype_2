# Broxel Basic Onboarding: current coverage and required adaptations

## What is already possible with current app

The current frontend can already execute a **screen-by-screen onboarding sequence** using `WorkflowDefinition.steps` with `navigation.nextStep`.

Implemented sequence now mirrors the expected enrollment journey:
1. Email registration
2. OTP validation
3. Identity data
4. Address
5. Biometrics (ID front/back + selfie)
6. Legal terms (`legales`)
7. Confirmation

This is available in:
- Dashboard sample generator (`generateSample`)
- In-memory mock workflow (`mock-backend.interceptor.ts`)

## What still differs from the real Broxel assets flow

### Frontend gaps

1. **OTP is static**
   - Current OTP step is form-only and does not trigger a real send/verify lifecycle.
   - Needed: API-driven OTP send/resend/verify states and countdown UX.

2. **No document/face validation pipeline**
   - `imageDropzone` uploads files but does not run OCR, liveness, or anti-fraud checks.
   - Needed: async status indicators and error remediation screens.

3. **No legal document versioning UI**
   - Legal step is checkbox-based only.
   - Needed: display legal document IDs/versions and acceptance timestamp evidence.

4. **No conditional branching by risk result**
   - Flow is linear today.
   - Needed: branch to manual review, retry capture, or rejection outcomes based on backend decision.

### Backend gaps

1. **No dedicated onboarding domain model**
   - Mock data returns generic workflow instances.
   - Needed: `onboarding_application`, `onboarding_case`, `onboarding_event`, and evidence entities.

2. **Missing KYC integrations**
   - Needed endpoints/services for:
     - OTP provider
     - Government ID validation
     - Face match / liveness
     - Watchlist / AML checks

3. **No enrollment state machine**
   - Needed canonical statuses (e.g. `draft`, `otp_verified`, `kyc_in_review`, `approved`, `rejected`) to prevent invalid transitions.

4. **No legal audit trail**
   - Needed immutable acceptance records (document version, locale, timestamp, IP/device metadata).

## Recommended next increment

1. Add backend endpoints for OTP send/verify + basic onboarding status transitions.
2. Wire OTP step in renderer to real endpoint calls.
3. Add server-side case state machine and map it to runtime instance status.
4. Add legal acceptance evidence table and include it in completion payload.
