# Frontend Translations: WordPress to Next.js

ArtRider effectively translates complex legacy behavior existing historically within a WordPress prototype framework mapping seamlessly into strict modern conventions governed entirely under Next.js React topologies. 

## WordPress Context Integration
**Warning:** The WordPress footprint serves exclusively as a visual **UI/UX Reference Prototype**. Zero legacy logic, plugin dependencies, relational models, or database schemas translate directly backwards. All dynamic functionalities must strictly reimplement cleanly through React abstractions, adhering explicitly to our native `authService`, `listingService`, etc. The logic translates directly into standard explicit API queries natively executed inside the database utilizing Server Actions decoupled from monolithic legacy assumptions.

## Route Translations

- **`/` (Home)**
  - *Context:* Public entry gate indexing search inputs and broad category indexing.
  - *Next.js Implementation:* SEO Priority. Primarily SSR Page retrieving generic items dynamically from Supabase without auth gating natively feeding a robust responsive component structure.
- **`/listings`**
  - *Context:* The filtered search mechanism array mapping explicit rentals across geo contexts.
  - *Next.js Implementation:* Parses route query parameters natively executing heavy `ILIKE` searches or geographical bounds against Supabase passing structures statically to React mapping nodes.
- **`/listings/[id]`**
  - *Context:* Item inspection isolating the physical configuration and booking action handlers.
  - *Next.js Implementation:* Dynamic segment routing leveraging SSR fetching deeply nested relational items (`product_catalog`, `physical_units`) executing client-bounded components intercepting modal toggles securely enforcing auth-checks before proceeding to cart flow.
- **`/dashboard`**
  - *Context:* Structural internal UI governing the aggregate system metrics for authenticated actors natively filtering renter vs owner capabilities.
  - *Next.js Implementation:* Heavily securely gated behind `/middleware.ts`. Retrieves broad analytics from Supabase mapping data conditionally against native RLS scope (Auth User = Owner).
- **`/bookings`**
  - *Context:* Active monitoring dashboard for transactional states.
  - *Next.js Implementation:* Isolated structural boundary retrieving raw Booking objects specifically checking relation logic enforcing statuses mapping explicitly back into UI tags (Active, Dispute, Complete).
- **`/profile`**
  - *Context:* Internal identity center controlling settings and KYC mechanisms.
  - *Next.js Implementation:* Secure boundary allowing localized Server Actions updating `public.users` entities gracefully reflecting native Form action states tracking dynamic loading flags effectively.
