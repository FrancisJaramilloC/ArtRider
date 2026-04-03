# High-Level Architecture
ArtRider is a modern rental marketplace built on Next.js App Router and Supabase. The system leverages Next.js for server-side rendering (SSR), edge routing, and React 19 UI, while Supabase provides the managed PostgreSQL database, authentication (GoTrue), and Row Level Security (RLS) policies.

## Data Flow (Auth → DB → UI)
1. **Auth Trigger**: The client interacts with the UI in the `/app` directory, triggering a Next.js Server Action in the `/services/authService.ts`.
2. **Gateway**: The Server Action invokes the Supabase Next.js SSR Client (`@supabase/ssr`) ensuring authentication happens securely in the Node/Edge environment rather than exposing logic directly to the browser.
3. **Database Transaction**: Supabase Auth securely mints a JWT session. Upon successful signup, the `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS constraints enforcing strict data integrity by atomic insertion of the custom user entity mapping into the `public.users` schema.
4. **UI Response**: Session cookies are inherently mapped through the generic request pipeline back into the client browser, redirecting the authenticated user immediately into the Protected Route via Next.js routers.

## Supabase Integration (Textual Diagram)
```text
[ Browser / React 19 ]
       | (Server Actions & Cookies)
       v
[ Next.js Server Environment ]
       ├── /lib/supabaseClient.ts (Restricted UI generic actions)
       ├── /lib/supabaseServer.ts (Authenticated SSR context wrapper)
       └── /lib/supabaseAdmin.ts  (Service Role: RLS Bypass - USED SPARINGLY)
       |
[ Supabase ]
       ├── Auth (GoTrue - Token Management)
       ├── PostgREST (Database API Router)
       └── PostgreSQL
             ├── public.users (Protected tables)
             └── RLS Policies (Row level gating evaluated by Auth JWT scope)
```

## Explanation of SSR vs Client Usage
- **SSR (Server-Side Rendering)**: Prioritized for dynamic initial page loads (e.g., retrieving listings on the catalog), and securely storing tokens. Handled largely inside Next.js Page components utilizing `generateMetadata()` or server-executed fetch queries. Supabase strictly enforces `RLS` securely against the server requests directly via `createSupabaseServerClient`.
- **Client (CSR / Client Components)**: Marked via `"use client"`. Used purely for user interactivity (Form bindings, `useActionState` handlers, click events, states like calendar switching). They invoke Server Actions natively instead of raw uncontrolled API route endpoints.
