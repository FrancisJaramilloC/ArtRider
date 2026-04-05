# ArtRider Architecture Overview

## Identity & Roles Data Flow
ArtRider operates on a decoupled identity architecture ensuring explicit separation of concerns and maximum scalability:

1. **Supabase Auth (`auth.users`)**: Acts as the immutable identity provider. Purely handles token generation, secrets, and raw email linkages natively. Never directly queried by the application frontend.
2. **`profiles` (Human Identity)**: The absolute baseline representation of every user mapping 1:1 against `auth.users.id`. Stores basic contact constraints (Name, Phone). Explicitly excludes PII credentials (passwords, emails). Inserted **only** upon initial registration by the backend Admin context bypassing standard RLS checks structurally.
3. **`providers` (Business Execution)**: A strictly optional relational wrapper bounding against `profiles.id` determining if the core user actively executes as a marketplace Owner rendering inventory openly.
4. **`identity_verifications` (Global KYC)**: The universal trust ledger strictly controlled by Edge webhooks natively locking identity execution pipelines unconditionally mapping permissions dynamically upon completion.

## RLS Security Strategy
We enforce strict least-privilege principles directly inside the PostgreSQL layer guaranteeing data integrity even if the client application is compromised.

- **`profiles` & `providers`**: Client mutation is exclusively restricted via `auth.uid() = id`. Generic browser queries can selectively parse public metadata safely natively restricting writes specifically.
- **Service Hooks**: Sensitive tables particularly `identity_verifications` operate under a full **default-deny** mutate constraint. No browser JWT token structure can physically elevate verification statuses natively, securing operations exclusively forcing webhook interactions natively bound to `createSupabaseAdminClient()`.
