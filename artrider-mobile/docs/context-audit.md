# ArtRider Mobile — Auditoría de contexto

Generado por auditoría de solo lectura del repo `C:\dev\ArtRider` en su estado actual (branch `feature/artrider-mobile-setup`). Todos los datos fueron verificados leyendo el archivo real, no se asume nada. Donde algo no existe, se dice explícitamente.

---

## 1. Árbol de archivos completo (`artrider-mobile/src`, 4 niveles, sin `node_modules`)

```
src
├── app
│   ├── (auth)
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (provider)
│   │   ├── _layout.tsx
│   │   ├── calendar.tsx
│   │   ├── listings.tsx
│   │   ├── menu.tsx
│   │   ├── messages.tsx
│   │   └── today.tsx
│   ├── (tabs)
│   │   ├── _layout.tsx
│   │   ├── explore.tsx
│   │   ├── index.tsx
│   │   ├── messages.tsx
│   │   ├── profile.tsx
│   │   └── reservations.tsx
│   ├── chat
│   │   └── [id].tsx
│   ├── checkout
│   │   ├── [id].tsx
│   │   ├── success
│   │   │   └── [id].tsx
│   │   └── summary
│   │       └── [id].tsx
│   ├── listing
│   │   └── [id].tsx
│   ├── provider
│   │   ├── reviews.tsx
│   │   └── settings.tsx
│   ├── _layout.tsx
│   ├── become-provider.tsx
│   └── map.tsx
├── components
│   ├── bookings
│   │   ├── BookingListCard.tsx
│   │   └── DateRangePicker.tsx
│   ├── explore
│   │   └── ExploreCard.tsx
│   ├── home
│   │   ├── CategoryStrip.tsx
│   │   ├── CityCarousel.tsx
│   │   └── HomeCard.tsx
│   ├── listing
│   │   └── ImageGallery.tsx
│   ├── map
│   │   ├── MapPreviewCard.tsx
│   │   └── PricePin.tsx
│   ├── navigation
│   │   └── BackButton.tsx
│   ├── payment
│   │   └── KushkiPaymentForm.tsx
│   ├── ui
│   │   └── collapsible.tsx
│   ├── animated-icon.module.css
│   ├── animated-icon.tsx
│   ├── animated-icon.web.tsx
│   ├── external-link.tsx
│   ├── hint-row.tsx
│   ├── protected-screen.tsx
│   ├── themed-text.tsx
│   ├── themed-view.tsx
│   └── web-badge.tsx
├── constants
│   ├── categories.ts
│   └── theme.ts
├── contexts
│   └── AuthContext.tsx
├── hooks
│   ├── use-color-scheme.ts
│   ├── use-color-scheme.web.ts
│   ├── use-theme.ts
│   ├── useAuth.ts
│   └── useFavorito.ts
├── screens
│   ├── auth
│   │   ├── LoginScreen.tsx
│   │   └── RegisterScreen.tsx
│   ├── chat
│   │   └── ChatScreen.tsx
│   ├── explore
│   │   └── ExploreScreen.tsx
│   ├── home
│   │   └── HomeScreen.tsx
│   ├── listing
│   │   └── ListingDetailScreen.tsx
│   ├── map
│   │   └── MapScreen.tsx
│   └── provider
│       ├── BecomeProviderScreen.tsx
│       ├── ProviderMenuScreen.tsx
│       ├── ProviderMessagesScreen.tsx
│       └── ProviderTodayScreen.tsx
├── services
│   ├── authService.ts
│   ├── availabilityService.ts
│   ├── bookingsService.ts
│   ├── catalogService.ts
│   ├── exploreService.ts
│   ├── favoritosService.ts
│   ├── getMyProviderId.ts
│   ├── homeService.ts
│   ├── messagesService.ts
│   ├── notificationsService.ts
│   ├── packagesService.ts
│   ├── profileService.ts
│   ├── providerService.ts
│   └── supabase.ts
├── types
│   └── css.d.ts
└── global.css
```

**Nota de estado de git**: dentro de este árbol, `(provider)/`, `app/chat/`, `app/provider/`, `screens/chat/`, `screens/provider/ProviderMenuScreen.tsx`, `screens/provider/ProviderMessagesScreen.tsx` y `screens/provider/ProviderTodayScreen.tsx` aparecen como **untracked** (`??`) en `git status` — es decir, trabajo nuevo sin commitear todavía. `(tabs)/messages.tsx`, `(tabs)/profile.tsx`, `app/_layout.tsx`, `screens/provider/BecomeProviderScreen.tsx` y `services/messagesService.ts` están **modificados** sin commitear.

---

## 2. Rutas de Expo Router (`src/app/`)

| Archivo | Ruta resultante | Tipo | Importa de |
|---|---|---|---|
| `_layout.tsx` | (root stack) | Con lógica propia | `AuthProvider`/`useAuth` (contexts), `AnimatedSplashOverlay` (components) — define el `Stack` raíz: `(tabs)`, `(provider)`, `chat/[id]`, y `(auth)` protegido con `Stack.Protected guard={!session}` |
| `(auth)/_layout.tsx` | grupo `(auth)` | Con lógica propia (mínima) | Define `Stack` con `login` y `register` |
| `(auth)/login.tsx` | `/login` | Delgada | `LoginScreen` (`@/screens/auth/LoginScreen`) |
| `(auth)/register.tsx` | `/register` | Delgada | `RegisterScreen` (`@/screens/auth/RegisterScreen`) |
| `(provider)/_layout.tsx` | grupo `(provider)` | Con lógica propia | `getMyProviderProfile` (providerService) — carga el perfil, si no es proveedor redirige a `/(tabs)/profile`, si no está `active` redirige a `/become-provider`; si todo bien, renderiza `NativeTabs` (today, calendar, listings, messages, menu) |
| `(provider)/today.tsx` | `/(provider)/today` | Delgada | `ProviderTodayScreen` (`@/screens/provider/ProviderTodayScreen`) |
| `(provider)/calendar.tsx` | `/(provider)/calendar` | Con lógica propia (placeholder inline, "Próximamente") | No importa screen — JSX directo en el archivo |
| `(provider)/listings.tsx` | `/(provider)/listings` | Con lógica propia (placeholder inline, "Próximamente") | No importa screen — JSX directo en el archivo |
| `(provider)/menu.tsx` | `/(provider)/menu` | Delgada | `ProviderMenuScreen` (`@/screens/provider/ProviderMenuScreen`) |
| `(provider)/messages.tsx` | `/(provider)/messages` | Delgada | `ProviderMessagesScreen` (`@/screens/provider/ProviderMessagesScreen`) |
| `(tabs)/_layout.tsx` | grupo `(tabs)` | Con lógica propia | Define `NativeTabs` (index, explore, reservations, messages, profile) |
| `(tabs)/index.tsx` | `/(tabs)/` (Home) | Delgada | `HomeScreen` (`@/screens/home/HomeScreen`) |
| `(tabs)/explore.tsx` | `/(tabs)/explore` | Delgada | `ExploreScreen` (`@/screens/explore/ExploreScreen`) |
| `(tabs)/reservations.tsx` | `/(tabs)/reservations` | Con lógica propia (screen completa vive en el archivo de ruta, no en `src/screens/`) | `ProtectedScreen`, `BookingListCard`, `getClientBookings` |
| `(tabs)/messages.tsx` | `/(tabs)/messages` | Con lógica propia (screen completa vive en el archivo de ruta) | `ProtectedScreen`, `getConversations` (messagesService) |
| `(tabs)/profile.tsx` | `/(tabs)/profile` | Con lógica propia (screen completa vive en el archivo de ruta) | `ProtectedScreen`, `getMyProviderProfile`, `useAuth` |
| `chat/[id].tsx` | `/chat/:id` | Delgada | `ChatScreen` (`@/screens/chat/ChatScreen`) |
| `checkout/[id].tsx` | `/checkout/:id` | Con lógica propia (screen completa vive en el archivo de ruta) | `DateRangePicker`, `BackButton`, `getListingById`, `getUnavailableDates` |
| `checkout/summary/[id].tsx` | `/checkout/summary/:id` | Con lógica propia | `KushkiPaymentForm`, `BackButton`, `getListingById`, `chargeAndCreateBooking` |
| `checkout/success/[id].tsx` | `/checkout/success/:id` | Con lógica propia | Solo componentes UI base (`ThemedText`), sin servicios — recibe todo por params de navegación |
| `listing/[id].tsx` | `/listing/:id` | Delgada | `ListingDetailScreen` (`@/screens/listing/ListingDetailScreen`) |
| `provider/reviews.tsx` | `/provider/reviews` | Con lógica propia (placeholder, "Próximamente") | `BackButton`, `ThemedText` — no importa screen de `src/screens/` |
| `provider/settings.tsx` | `/provider/settings` | Con lógica propia (placeholder, "Próximamente") | `BackButton`, `ThemedText` — no importa screen de `src/screens/` |
| `become-provider.tsx` | `/become-provider` | Delgada | `BecomeProviderScreen` (`@/screens/provider/BecomeProviderScreen`) |
| `map.tsx` | `/map` | Delgada | `MapScreen` (`@/screens/map/MapScreen`) |

---

## 3. Servicios (`src/services/`)

### `authService.ts`
- `signUp(params: SignUpParams): Promise<AuthResult>` — valida campos (edad ≥18, formato teléfono, contraseñas coinciden), llama `supabase.auth.signUp`, fuerza `signOut()` si Supabase ya creó sesión. Toca: `auth.users` (vía Supabase Auth, no tabla directa).
- `signIn(params: SignInParams): Promise<AuthResult>` — `supabase.auth.signInWithPassword`.
- `signOut(): Promise<void>` — `supabase.auth.signOut`.

### `availabilityService.ts`
- `getUnavailableDates(listingId: string): Promise<string[]>` — RPC `get_unavailable_dates`.
- `checkAvailability(listingId: string, startDateStr: string, endDateStr: string): Promise<boolean>` — recorre el rango día a día contra `getUnavailableDates`.

### `bookingsService.ts`
- `createBooking(listingId: string, startDate: string, endDate: string, kushkiTicket?: string): Promise<CreateBookingResult>` — RPC `create_booking`.
- `getClientBookings(): Promise<ClientBooking[]>` — RPC `get_client_bookings`.
- `cancelBooking(bookingId: string): Promise<{ error?: string }>` — `UPDATE` directo sobre tabla `bookings` (`status = 'CANCELLED'`), con `.eq('client_id', user.id).eq('status', 'AWAITING_SIGNATURES')`.
- `chargeAndCreateBooking(kushkiToken: string, listingId: string, startDate: string, endDate: string): Promise<CreateBookingResult>` — `fetch` a la Edge Function `kushki-charge`.

### `catalogService.ts`
- `getListings(): Promise<Listing[]>` — tabla `listings` (+ join `addresses`), filtro `is_published=true`, `deleted_at IS NULL`.
- `getListingById(id: string): Promise<Listing | null>` — tabla `listings`.
- `getListingByIdWithProvider(id: string): Promise<ListingWithProvider | null>` — tabla `listings` + join `providers`.
- `getCatalogItems(): Promise<CatalogItem[]>` — vista `catalog_items`.
- `searchCatalog(filters?: CatalogFilters): Promise<CatalogItem[]>` — vista `catalog_items` con filtros dinámicos.
- `getListingRatings(listingIds: string[]): Promise<Record<string, number>>` — RPC `get_listing_ratings`.

### `exploreService.ts`
- `getExploreItems(): Promise<ExploreItem[]>` — combina `getListings()` (catalogService) + `getPublishedPackages()` (packagesService), no toca Supabase directamente.

### `favoritosService.ts`
- `getUserFavIds(): Promise<{ equipoIds: string[]; paqueteIds: string[] }>` — tabla `favorites`.
- `toggleFavorito(itemId: string, tipo: FavoritoTipo): Promise<{ esFavorito: boolean; error?: string }>` — `DELETE` + `INSERT` sobre `favorites` (patrón delete-first).
- `getFavoritosEquipos()` — tabla `favorites` + `listings`.
- `getFavoritosPaquetes()` — tabla `favorites` + `packages`.

### `getMyProviderId.ts`
- `getMyProviderId(): Promise<string | null>` — tabla `providers` (`.eq('user_id', user.id)`).

### `homeService.ts`
- `getHomeData(): Promise<HomeData>` — combina `getListings()` + `getListingRatings()` (catalogService) + `getPublishedPackages()` (packagesService), agrupa por ciudad. No toca Supabase directamente.

### `messagesService.ts`
(ver también sección 5 — es el servicio prioritario de esta auditoría)
- `getConversations(): Promise<ConversationSummary[]>` — RPC `get_my_conversations`.
- `getMessages(conversationId: string): Promise<Message[]>` — tabla `messages`.
- `sendMessage(conversationId: string, content: string): Promise<Message>` — `INSERT` en `messages`.
- `markMessagesRead(conversationId: string): Promise<void>` — RPC `mark_messages_read`.
- `subscribeToMessages(conversationId: string, onInsert: (message: Message) => void, onUpdate: (message: Message) => void): RealtimeChannel` — canal Realtime `messages:${conversationId}`, escucha `postgres_changes` INSERT/UPDATE sobre tabla `messages`.
- `subscribeToTyping(conversationId: string, myUserId: string, onTypingChange: (isTyping: boolean) => void): RealtimeChannel` — canal Realtime `typing:${conversationId}`, broadcast efímero (no toca DB).
- `broadcastTyping(channel: RealtimeChannel, myUserId: string, isTyping: boolean): void` — emite evento `typing` en el canal.
- `subscribeToPresence(conversationId: string, myUserId: string, onPresenceChange: (onlineUserIds: string[]) => void): RealtimeChannel` — canal Realtime `presence:${conversationId}`, usa `channel.track()`.

### `notificationsService.ts`
- `getMyNotifications(): Promise<AppNotification[]>` — tabla `notifications`.
- `getUnreadCount(): Promise<number>` — `SELECT COUNT` sobre `notifications` (`is_read=false`).
- `markAsRead(id: string): Promise<{ error?: string; success?: boolean }>` — `UPDATE notifications`.
- `markAllAsRead(): Promise<{ error?: string; success?: boolean }>` — `UPDATE notifications`.

### `packagesService.ts`
- `getPackageById(id: string): Promise<PackageWithItems | null>` — tabla `packages` + join `package_items` + `listings` + `providers`.
- `getPublishedPackages(): Promise<PackageSummary[]>` — tabla `packages`, `limit(8)`.

### `profileService.ts`
- `updateProfile(params: UpdateProfileParams): Promise<UpdateProfileResult>` — tabla `profiles` (`SELECT` + `UPDATE`), Storage bucket `avatars` (`upload` + `getPublicUrl`).

### `providerService.ts`
- `getMyProviderProfile(): Promise<ProviderProfile | null>` — tabla `providers`.
- `becomeProvider(params: BecomeProviderParams): Promise<BecomeProviderResult>` — `SELECT` + `INSERT` en `providers`.
- `updateProviderBrandName(newBrandName: string): Promise<UpdateBrandNameResult>` — `UPDATE providers`.

### `supabase.ts`
No exporta funciones de negocio — exporta el cliente `supabase` (`createClient`) configurado con un `ChunkedSecureStoreAdapter` (parte el JWT en chunks de 1800 bytes para superar el límite de ~2048 bytes de SecureStore en Android) y un listener de `AppState` para pausar/reanudar el auto-refresh del token.

---

## 4. Componentes por dominio (`src/components/`)

| Carpeta | Componente | Usado por (según imports encontrados) |
|---|---|---|
| `bookings/` | `BookingListCard` | `app/(tabs)/reservations.tsx` |
| `bookings/` | `DateRangePicker` | `app/checkout/[id].tsx` |
| `explore/` | `ExploreCard` | `screens/explore/ExploreScreen.tsx` |
| `home/` | `CategoryStrip` | `screens/home/HomeScreen.tsx` |
| `home/` | `CityCarousel` | `screens/home/HomeScreen.tsx` (internamente importa `HomeCard`) |
| `home/` | `HomeCard` | `components/home/CityCarousel.tsx` (indirecto) |
| `listing/` | `ImageGallery` | `screens/listing/ListingDetailScreen.tsx` |
| `map/` | `MapPreviewCard` | `screens/map/MapScreen.tsx` |
| `map/` | `PricePin` | `screens/map/MapScreen.tsx` |
| `navigation/` | `BackButton` | `app/checkout/[id].tsx`, `app/checkout/summary/[id].tsx`, `app/provider/reviews.tsx`, `app/provider/settings.tsx`, `screens/chat/ChatScreen.tsx`, `screens/provider/BecomeProviderScreen.tsx` — **no** usado en `app/checkout/success/[id].tsx` (verificado leyendo el archivo completo: esa pantalla no tiene botón de volver, solo "Ver mis reservas") |
| `payment/` | `KushkiPaymentForm` | `app/checkout/summary/[id].tsx` |
| `ui/` | `Collapsible` | Sin imports encontrados en el resto de `src/` (componente huérfano/sin uso actual) |
| (raíz) | `ThemedText` | Prácticamente todas las screens y componentes de UI (uso transversal) |
| (raíz) | `ThemedView` | `components/ui/collapsible.tsx` |
| (raíz) | `ProtectedScreen` | `app/(tabs)/messages.tsx`, `app/(tabs)/profile.tsx`, `app/(tabs)/reservations.tsx` |
| (raíz) | `AnimatedSplashOverlay` (de `animated-icon.tsx`/`.web.tsx`) | `app/_layout.tsx` |
| (raíz) | `external-link.tsx`, `hint-row.tsx`, `web-badge.tsx` | Sin imports encontrados en el resto de `src/` en esta auditoría (no se rastrearon más a fondo; podrían usarse solo entre sí o quedar sin uso) |

---

## 5. Estado real de mensajería/chat (prioridad alta)

### ¿Hay suscripción Realtime en la lista de conversaciones?
**No.** Se verificaron los dos archivos que renderizan listas de conversaciones:

- `src/app/(tabs)/messages.tsx` (`ConversationsContent`): el único `useEffect` relacionado con datos es:
  ```ts
  const load = useCallback(async () => {
    const all = await getConversations();
    setConversations(all);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);
  ```
  Es una carga única al montar + `onRefresh` manual (pull-to-refresh). **No hay `supabase.channel(...)` en este archivo.**

- `src/screens/provider/ProviderMessagesScreen.tsx`: mismo patrón — `load()` en un `useEffect` con `[load]`, sin canal Realtime.

La única pantalla con Realtime es `src/screens/chat/ChatScreen.tsx` (el chat individual), con **tres** canales distintos, cada uno en su propio `useEffect`:

```ts
// Suscripción a mensajes en tiempo real
useEffect(() => {
    if (!conversationId) return;

    const channel = subscribeToMessages(
        conversationId,
        (newMessage) => {
            setMessages((prev) => (prev.some((m) => m.id === newMessage.id) ? prev : [...prev, newMessage]));
            if (newMessage.sender_id !== myUserId) {
                markMessagesRead(conversationId);
            }
        },
        (updatedMessage) => {
            setMessages((prev) => prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m)));
        }
    );

    return () => {
        supabase.removeChannel(channel);
    };
}, [conversationId, myUserId]);

// Canal de "escribiendo..."
useEffect(() => {
    if (!conversationId || !myUserId) return;
    const channel = subscribeToTyping(conversationId, myUserId, setOtherTyping);
    typingChannelRef.current = channel;
    return () => {
        supabase.removeChannel(channel);
    };
}, [conversationId, myUserId]);

// Presencia (en línea)
useEffect(() => {
    if (!conversationId || !myUserId) return;
    const channel = subscribeToPresence(conversationId, myUserId, (onlineIds) => {
        setOtherOnline(onlineIds.some((id) => id !== myUserId));
    });
    return () => {
        supabase.removeChannel(channel);
    };
}, [conversationId, myUserId]);
```

### ¿Cómo se limpian los canales?
Los tres canales de `ChatScreen.tsx` se limpian con `supabase.removeChannel(channel)` en la función de cleanup del `useEffect` correspondiente (archivo: `src/screens/chat/ChatScreen.tsx`, líneas ~84-87, ~94-97 y ~105-108). No existen otros canales Realtime abiertos en el resto de la app (no hay ningún otro `.channel(` fuera de `messagesService.ts` y su uso en `ChatScreen.tsx`).

### Funciones de mensajes/chat en `messagesService.ts` (firma completa)
```ts
export async function getConversations(): Promise<ConversationSummary[]>

export async function getMessages(conversationId: string): Promise<Message[]>

export async function sendMessage(conversationId: string, content: string): Promise<Message>

export async function markMessagesRead(conversationId: string): Promise<void>

export function subscribeToMessages(
  conversationId: string,
  onInsert: (message: Message) => void,
  onUpdate: (message: Message) => void
): RealtimeChannel

export function subscribeToTyping(
  conversationId: string,
  myUserId: string,
  onTypingChange: (isTyping: boolean) => void
): RealtimeChannel

export function broadcastTyping(channel: RealtimeChannel, myUserId: string, isTyping: boolean)

export function subscribeToPresence(
  conversationId: string,
  myUserId: string,
  onPresenceChange: (onlineUserIds: string[]) => void
): RealtimeChannel
```

### ¿Existe botón/pantalla para INICIAR una conversación nueva?
**No existe.** Se buscó en todo `src/` con los patrones `Contactar`, `contactar`, `startConversation`, `createConversation`, `nueva conversacion/conversación`, `get_or_create_conversation` — **cero coincidencias**. No hay ninguna función en `messagesService.ts` (ni en ningún otro servicio) que cree una conversación. `src/screens/listing/ListingDetailScreen.tsx` (pantalla de detalle de equipo) fue leída completa: solo tiene un botón "Reservar" (`router.push(/checkout/${listing.id})`) y un botón de favorito — **no hay ningún botón "Contactar al proveedor" ni acceso a chat desde ahí.**

Los únicos dos lugares desde donde se puede entrar a `/chat/[id]` son:
- `src/app/(tabs)/messages.tsx` (línea 132), al tocar una conversación ya existente en la lista.
- `src/screens/provider/ProviderMessagesScreen.tsx` (línea 71), igual, desde una conversación existente.

Es decir: **hoy solo se puede continuar conversaciones que ya existen** (creadas presumiblemente por otro flujo fuera del mobile, o directamente en la base de datos/web) — el mobile no tiene ningún flujo para crear una conversación desde cero.

### ¿Existe la pantalla `/package/[id]`?
**No existe.** Se confirma explícitamente: no hay ningún archivo `src/app/package/[id].tsx` ni carpeta `src/app/package/`. Sin embargo, **sí hay referencias rotas a esa ruta**:
- `src/services/exploreService.ts:43` — `href: \`/package/${p.id}\``
- `src/services/homeService.ts:64` — `href: \`/package/${pkg.id}\``

Estos `href` se usan en `ExploreCard` y `HomeCard` (`router.push(item.href as any)`) para los paquetes — es decir, **tocar una card de "paquete" en Home o Explorar hoy navega a una ruta que no existe** (`/package/:id`), mientras que sí existe un servicio completo (`packagesService.ts`, con `getPackageById`) preparado para alimentar esa pantalla, pero la pantalla en sí (`src/app/package/[id].tsx`) nunca se creó.

---

## 6. Migraciones / funciones de Postgres

**La carpeta `supabase/` en la raíz del monorepo (`C:\dev\ArtRider\supabase\`) — la que contiene `config.toml` y `functions/kushki-charge/` — NO tiene carpeta `migrations/`.** Solo contiene:
- `supabase/config.toml`
- `supabase/functions/kushki-charge/index.ts` (+ `deno.json`, `.npmrc`)
- `supabase/.temp/` (metadata de sesión CLI, no versionado como migración)

Las migraciones SQL versionadas del proyecto **sí existen, pero viven en `C:\dev\ArtRider\art-rider\supabase\migrations\`** (el proyecto web), no dentro de `artrider-mobile/`. Dado que ambos apuntan al mismo proyecto Supabase (mismo `project_id = "ArtRider"`), documento su contenido porque describen el esquema real contra el que corre también el mobile:

| Archivo | Descripción (según encabezado/contenido) |
|---|---|
| `001_add_reviews_and_align_schema.sql` | Alinea el esquema con el "Class Diagram v4.0"; agrega reviews y ajustes de esquema |
| `001_product_catalog_anon_read.sql` | Permite lectura anónima de `product_catalog` para queries públicas de listings |
| `002_add_gallery_and_availability.sql` | Agrega imágenes de galería; nota explícita de que `availability_status` NO se agrega a listings/packages (se maneja vía `availability_calendar.status`) |
| `20260427_packages.sql` | Crea la tabla `packages` |
| `20260504_packages_address.sql` | Agrega `address_id` a `packages` para ubicarlo en el mapa |
| `20260509_add_archived_status.sql` | Agrega el estado `ARCHIVED` a bookings, columna `archived_at` y políticas RLS |
| `20260509_security_fixes.sql` | Fixes de seguridad (CRIT-01, CRIT-02, HIGH-01..04, MED-03, DESIGN-02/03) |
| `20260511_catalog_search_view.sql` | Crea la vista `catalog_items` (listings + packages unificados) |
| `20260511_rollback_catalog_search_view.sql` | Rollback: `DROP VIEW catalog_items` |
| `20260511_decouple_messaging.sql` | Desacopla el sistema de mensajería: `booking_id` opcional, agrega refs directas a participantes |
| `20260511_rollback_decouple_messaging.sql` | Rollback de la anterior |
| `20260511_provider_identity_consolidation.sql` | Fuerza que solo `providers` (no `profiles` genéricos) puedan tener listings, bookings y packages |
| `20260511_rollback_provider_identity.sql` | Rollback de la anterior |
| `20260511_soft_deletes_rls.sql` | Fuerza `deleted_at IS NULL` en todas las políticas RLS de `SELECT` (excluye explícitamente `profiles`) |
| `20260512_booking_snapshots.sql` | Agrega columnas JSONB de snapshot histórico a `bookings` para inmutabilidad de contratos |
| `20260512_rollback_booking_snapshots.sql` | Rollback de la anterior |
| `20260512_fix_security_definer_warnings.sql` | Agrega `search_path=''` a funciones `SECURITY DEFINER` y revoca `EXECUTE` de `PUBLIC` |
| `20260512_rollback_fix_security_definer_warnings.sql` | Rollback de la anterior |
| `20260512_normalize_status_enums.sql` | Convierte columnas de estado de texto plano a `ENUM` |
| `20260512_rollback_normalize_status_enums.sql` | Rollback de la anterior |
| `20260512_performance_indexes.sql` | Agrega índices B-Tree a foreign keys y campos muy consultados |
| `20260515_addresses_public_listing_read.sql` | Corrige política de `addresses`: antes solo el dueño podía leer su dirección (bloqueaba visitantes anónimos en `/listings`); ahora permite leer direcciones de listings publicados |
| `20260516_add_advertising_category.sql` | Agrega `'advertising'` al CHECK constraint de `listings.category` (faltaba en el esquema pero se usaba en los selectores de categoría del frontend) |
| `20260526_packages_cover_image.sql` | Agrega `cover_image_url` a `packages` |
| `20260601_messages_soft_delete.sql` | Crea tabla `conversation_deleted` para soft-delete de conversaciones por usuario |

**Conclusión de esta sección**: no hay migraciones versionadas dentro de `artrider-mobile/`; las migraciones del backend compartido están en `art-rider/supabase/migrations/` (24 archivos, incluyendo varios rollbacks). El `supabase/` de la raíz del monorepo solo gestiona la Edge Function `kushki-charge`.

---

## 7. `package.json` de `artrider-mobile`

```json
{
  "name": "artrider-mobile",
  "main": "expo-router/entry",
  "version": "1.0.0",
  "dependencies": {
    "@expo-google-fonts/inter": "^0.4.2",
    "@expo/ui": "0.2.0-canary-20260121-a63c0dd",
    "@expo/vector-icons": "^15.1.1",
    "@react-native-community/datetimepicker": "8.4.4",
    "@react-navigation/native": "^7.3.15",
    "@supabase/supabase-js": "^2.112.0",
    "expo": "~54.0.36",
    "expo-constants": "~18.0.13",
    "expo-device": "~8.0.10",
    "expo-font": "~14.0.12",
    "expo-glass-effect": "~0.1.10",
    "expo-image": "~3.0.11",
    "expo-linear-gradient": "~15.0.8",
    "expo-linking": "~8.0.12",
    "expo-router": "~6.0.24",
    "expo-secure-store": "~15.0.8",
    "expo-splash-screen": "~31.0.13",
    "expo-status-bar": "~3.0.9",
    "expo-symbols": "~1.0.8",
    "expo-system-ui": "~6.0.9",
    "expo-web-browser": "~15.0.11",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-native": "0.81.5",
    "react-native-calendars": "^1.1314.0",
    "react-native-gesture-handler": "~2.28.0",
    "react-native-map-clustering": "^4.0.0",
    "react-native-maps": "1.20.1",
    "react-native-reanimated": "4.1.7",
    "react-native-safe-area-context": "~5.6.2",
    "react-native-screens": "~4.16.0",
    "react-native-url-polyfill": "^4.0.0",
    "react-native-web": "~0.21.0",
    "react-native-webview": "13.15.0",
    "react-native-worklets": "0.5.1"
  },
  "devDependencies": {
    "@types/react": "~19.1.17",
    "typescript": "~5.9.3"
  },
  "scripts": {
    "start": "expo start",
    "reset-project": "node ./scripts/reset-project.js",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "lint": "expo lint"
  },
  "private": true
}
```

Nota: hay `pnpm-lock.yaml` y `pnpm-workspace.yaml` **untracked** en la raíz del repo (según `git status`), y `node_modules/` también untracked — sugiere que el monorepo se gestiona con pnpm workspaces pero eso todavía no está commiteado.

---

## 8. Variables de entorno

### `.env.local` (solo claves, no valores — el archivo existe y tiene 372 bytes)
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_KUSHKI_MERCHANT_ID=
```

### `app.json`
No existe `app.config.js` ni `app.config.ts` — solo `app.json`. No tiene bloque `extra`. Claves relevantes presentes:
- `name`, `slug`, `version`, `orientation`, `icon`, `scheme` (`artridermobile`), `userInterfaceStyle`
- `ios.icon`, `android.adaptiveIcon` (+ `predictiveBackGestureEnabled: false`), `web.output` (`static`) + `web.favicon`
- `plugins`: `expo-router`, `expo-splash-screen` (con `backgroundColor`, `image`, `imageWidth`), `expo-secure-store`, `expo-font`, `@react-native-community/datetimepicker`, `expo-web-browser`
- `experiments`: `typedRoutes: true`, `reactCompiler: true`

No hay ningún otro archivo `eas.json` en la raíz de `artrider-mobile`.

---

## 9. Estado de TypeScript

Comando ejecutado desde `C:\dev\ArtRider\artrider-mobile`:
```
npx tsc --noEmit
```
**Resultado: exit code 0, sin salida.** No hay errores de tipos en el proyecto en su estado actual (incluyendo los archivos untracked/modificados de mensajería y provider).

---

## 10. Últimos commits y estado de git

### `git log --oneline -30` (desde la raíz del repo)
```
de50a9a fix: agregar boton de regreso a pantallas sin navegacion hacia atras
36ac827 feat: integracion Kushki via WebView con SDK real, Edge Function de cobro, pantalla de exito
5b01188 feat: pantalla de Mis Reservas con filtros por estado y cancelacion
39ccc39 feat: checkout con desglose de precio y creacion real de reserva vía RPC
d640370 feat: selector de fechas con calendario, un toque selecciona un dia, bloqueo de fechas ocupadas
585a0c6 feat: vista de mapa con marcadores de precio, preview y navegacion, clustering desactivado temporalmente
9b37361 feat: pantalla de Detalle de Equipo con galeria, mapa, proveedor y favoritos
767ff1b feat: pantalla de Exploracion con filtros combinables (categoria, ciudad, precio, texto)
aedad2d feat: pantalla Home con carruseles por ciudad, categorias y favoritos
e20fa25 feat: contexto global de autenticacion (AuthProvider), fix de contraste en pantallas placeholder
bd642a5 feat: downgrade a SDK 54 para compatibilidad con Expo Go, pantallas de Login y Registro
97dd8bc feat: pantalla de Login con diseno de marca ArtRider
b6a3e0c feat: sistema de diseno con paleta ArtRider (light/dark) y fuente Inter
88623ed feat: messagesService y notificationsService, fix de bugs reales en produccion (columna read, tabla conversations)
7281d82 feat: favoritosService, profileService, providerService y helper getMyProviderId
d32c53e feat: catalogService, availabilityService y packagesService (lectura publica)
8775c2d feat: authService con signUp/signIn/signOut, trigger de perfil automatico en profiles
b5374a2 feat: sistema de navegacion con 5 tabs, stack de auth y guard de rutas protegidas
2d9dd92 feat: configurar cliente Supabase con SecureStore chunked adapter y soporte web
8a4f527 feat: inicializar proyecto artrider-mobile con Expo SDK 57, TypeScript estricto, estructura de carpetas y dependencias core
06cc306 Readme actualizado
b10dc9c Merge remote-tracking branch 'origin/develop' into develop
a3bfc31 .
fb4d7eb Merge branch 'main' into develop
e4bb4bd Merge branch 'feature/frontendRefractor' into develop
d27658a chore: ignore CLAUDE.md
353b3e5 merge: resolve conflict in ProviderLayoutClient — keep develop comment + initialIsProvider
d9e896c feat: redesign provider sidebar, reservas route, bookings category, Advisory docs
6932394 Merge branch 'feature/actOptimizacion' into develop
329599e actOprimizacion 20%
```

Nota: el commit `8a4f527` dice "Expo SDK 57" pero `package.json` fija `"expo": "~54.0.36"` — probablemente un desliz en el mensaje del commit; el SDK real instalado es 54 (confirmado por `bd642a5`: "downgrade a SDK 54 para compatibilidad con Expo Go").

### `git status` (branch actual: `feature/artrider-mobile-setup`)
```
Changes not staged for commit:
  modified:   artrider-mobile/src/app/(tabs)/messages.tsx
  modified:   artrider-mobile/src/app/(tabs)/profile.tsx
  modified:   artrider-mobile/src/app/_layout.tsx
  modified:   artrider-mobile/src/screens/provider/BecomeProviderScreen.tsx
  modified:   artrider-mobile/src/services/messagesService.ts

Untracked files:
  .vscode/
  artrider-mobile/src/app/(provider)/
  artrider-mobile/src/app/chat/
  artrider-mobile/src/app/provider/
  artrider-mobile/src/screens/chat/
  artrider-mobile/src/screens/provider/ProviderMenuScreen.tsx
  artrider-mobile/src/screens/provider/ProviderMessagesScreen.tsx
  artrider-mobile/src/screens/provider/ProviderTodayScreen.tsx
  node_modules/
  pnpm-lock.yaml
  pnpm-workspace.yaml
```

Es decir: **todo el módulo de mensajería/chat y el modo proveedor completo (tabs, screens, rutas) es trabajo en curso sin commitear todavía** — no reflejado en el historial de commits de arriba.

---

*Fin de la auditoría. Todo lo anterior fue verificado leyendo directamente el código fuente; nada fue completado de memoria.*
