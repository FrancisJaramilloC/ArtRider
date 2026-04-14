 Codebase Structure

Our Next.js architecture heavily decouples presentation from core logic protecting long-term scale and allowing the team of 4 to avoid conflict.

## Folder Boundaries

| Path | Responsibility Boundaries |
| :--- | :--- |
| **`/app`** | Strictly handles React presentation layers, routing topologies, layout boundaries, and generic component scaffolding. No raw database queries belong here. Components either retrieve data generically through Server Props or execute mutations via `/services`. |
| **`/services`** | The specific source of business logic. It handles data-fetching parameters, transactional queries against Supabase, multi-record writes, external service integrations (Stripe), and exports Server Actions directly usable by UI components. |
| **`/lib`** | Utility clients and global configuration definitions. Stores our initialized instances (`supabaseClient`, `supabaseServer`, `supabaseAdmin`) and shared stateless pure functions minimizing dependency bloat. |
| **`/types`** | The central nervous root for internal TypeScript interfaces. Stores Supabase Database schema generated types (`types/supabase.ts`) guaranteeing end-to-end type safety matching standard structures. |
| **`/middleware.ts`**| Defines global edge access controls determining explicitly which requests resolve dynamically. Validates cookie integrity natively rejecting malformed traffic before it encounters the React tree lifecycle. |

## Naming Conventions
- **Component Files**: Use `PascalCase` if acting as explicit components e.g. `CardItem.tsx`, or adhere strictly to the Next.js routing patterns (`page.tsx`, `layout.tsx`).
- **Services/Libraries**: Use `camelCase` for utilities e.g. `authService.ts`, `stripeIntegration.ts`.
- **Functions inside Services**: Strong action-verb mappings (e.g. `executeBooking`, `retrieveListings`, `generateContract`).
