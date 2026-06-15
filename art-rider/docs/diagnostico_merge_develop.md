# Diagnóstico de riesgo: `feature/frontendRefractor` → `develop`

> Análisis estático generado el 2026-06-15.  
> **No se modificó ningún archivo. No se hizo merge. No se hizo push.**

---

## Situación general

| Dato | Valor |
|---|---|
| Rama actual | `feature/frontendRefractor` |
| HEAD commiteado | `17f7b1f` (= merge base con `origin/develop`) |
| Commits adelante en `origin/develop` | **13 commits** (desde `485e07d` hasta `6932394`) |
| Commits propios commiteados | **0** — todos los cambios están en el working tree sin commitear |

**El escenario real no es "mi rama vs develop" sino "mis cambios sin commitear vs 13 commits de develop".**  
Antes de cualquier merge, sería necesario commitear o hacer stash. Eso cambia la mecánica del riesgo.

---

## Mapa completo de archivos

### A. Archivos modificados SOLO en mi working tree (develop no los tocó)

| Archivo | Estado | Riesgo |
|---|---|---|
| `app/provider/bookingsProvider/page.tsx` | Modificado (unstaged) | ✅ Seguro |
| `services/bookingsService.ts` | Modificado (unstaged) | ✅ Seguro |
| `app/provider/bookingsProvider/ProviderBookingsClient.tsx` | Sin trackear (nuevo) | ✅ Seguro |
| `app/reservas/` (directorio) | Sin trackear (nuevo) | ✅ Seguro |

### B. Archivos modificados SOLO en `origin/develop` (mi working tree no los tocó)

| Archivo | Qué hizo develop | Criticidad para mí |
|---|---|---|
| `app/api/kushki/charge/route.ts` | Fix crítico: validación de pago ahora verifica `ticketNumber + transactionStatus === 'APPROVAL'` | 🔴 Crítico — no perder |
| `services/providerService.ts` | `getMyProviderProfile` envuelto en React `cache()` | 🟠 Optimización clave |
| `services/notificationsService.ts` | `getMyNotifications` y `getUnreadCount` envueltos en `cache()` | 🟠 Optimización clave |
| `hooks/useNotifications.ts` | Reescrito completamente: ahora consume `NotificationContext` en vez de tener su propio estado | 🟠 Depende de contexto nuevo |
| `contexts/NotificationContext.tsx` | **Nuevo archivo** — extrae lógica de notificaciones a React Context | 🟠 Nuevo — no presente en mi rama |
| `services/listingsService.ts` | Nueva función `getListingByIdWithProvider` + tipo `ListingWithProvider` | 🟡 Aditivo, no rompe nada |
| `lib/eventCategoryMap.ts` | **Nuevo archivo** — tipo `CityInfo` + mapeo categorías de evento | 🟡 Nuevo, no presente |
| `app/listings/[id]/page.tsx` | Usa `getListingByIdWithProvider` (query unificada), `dynamic` import para `MapWrapper`, nueva función `getReviewsForListing` con consultas en paralelo | 🟡 Aditivo |
| `app/page.tsx` | Construye `CityInfo[]` con coords para el hero | 🟡 Aditivo |
| `app/explore/page.tsx` | Nuevos searchParams: `q`, `eventType`, `start`, `end` | 🟡 Aditivo |
| `components/explore/ExploreClient.tsx` | Nuevos filtros para los parámetros anteriores | 🟡 Aditivo |
| `components/explore/ExploreCard.tsx` | Mejoras de navegación | 🟡 Aditivo |
| `components/features/home/LandingHero.tsx` | Ahora acepta `CityInfo[]` con coordenadas en vez de `string[]` | 🟡 Breaking change acotado |
| `components/features/home/SearchDiscoveryPanel.tsx` | **Nuevo componente** — panel de búsqueda/descubrimiento | 🟡 Nuevo |
| `components/features/home/LandingCategoryStrip.tsx` | Cambios de UI | 🟡 Aditivo |
| `app/become-a-provider/layout.tsx` | Añade `initialIsProvider={!!profile}` al Navbar call (consistente con la optimización del Navbar) | 🟡 Aditivo |
| `app/provider/inventory/InventoryClient.tsx` | Items del inventario ahora tienen `Link` — son clickeables | 🟡 Aditivo |
| `components/listing-map/MapClient.tsx` | Cambios (no analizados en detalle) | 🟡 Bajo riesgo |
| `components/listing-map/MapWrapper.tsx` | Cambios (no analizados en detalle) | 🟡 Bajo riesgo |
| `app/packages/[id]/page.tsx` | Cambios (no analizados en detalle) | 🟡 Bajo riesgo |

### C. Archivos modificados en AMBOS lados — los críticos

| Archivo | Mi cambio | Cambio en develop | Clasificación |
|---|---|---|---|
| `app/provider/ProviderLayoutClient.tsx` | Reescritura total del sidebar | +1 línea: `initialIsProvider={!!provider}` en Navbar call | 🔴 **Riesgo silencioso** |
| `components/layout/Navbar.tsx` | `href="/bookings"` → `href="/reservas"` (línea ~161) | Nuevo prop `initialIsProvider` + refactor de `useEffect` (líneas ~62–100) | 🟡 **Probable merge automático** |
| `app/provider/layout.tsx` | Añade `createSupabaseAdminClient` + query unread messages + prop `unreadMessages` | Idem — mismos cambios detectados | ⚠️ **Verificar** (posible idéntico en ambos) |

---

## Análisis detallado de los archivos críticos (Sección C)

---

### 1. `app/provider/ProviderLayoutClient.tsx` — 🔴 RIESGO SILENCIOSO

#### Qué cambió develop

Un único cambio de 1 línea en el render del Navbar:

```tsx
// Versión base (HEAD) — lo que develop partió:
<Navbar initialUser={initialUser} hideNavLinks />

// Versión de develop — optimización:
<Navbar initialUser={initialUser} initialIsProvider={!!provider} hideNavLinks />
```

**Por qué importa:** La prop `initialIsProvider` le dice al Navbar en el server side si el usuario ya es proveedor, evitando que el Navbar dispare `getMyProviderProfile()` como una llamada asíncrona en el cliente durante el mount. Sin esta prop, hay un brief loading spinner + una petición extra a Supabase en cada render del panel de proveedor.

#### Qué cambié yo en mi working tree

**Reescritura total del componente.** Los cambios son masivos:

- Nueva función `brandInitials(name)` para las iniciales del perfil
- Cambia el tipo del prop `provider` de `{ brand_name: string }` a `ProviderProfile` (importado de `providerService`)
- Nuevo prop `unreadMessages?: number`
- Nuevo bloque visual de perfil con borde y sombra (reemplaza el "brand strip" anterior)
- Navegación rediseñada: `border`, `shadow`, colores `#875B9A`, `px-[13px]`, `rounded-xl`
- Añade el link de "Mensajes" inyectado dinámicamente con badge de no leídos
- Elimina `BOTTOM_LINKS` (Configuración + Ayuda) — reemplazado por un bloque "¿Necesitas ayuda?"
- Cambia `bg-gray-50` por `bg-[#f5f4f7]`
- En el call al Navbar:

```tsx
// MI VERSIÓN — NO tiene initialIsProvider:
<Navbar initialUser={initialUser} hideNavLinks />
```

#### El problema concreto

Mi reescritura NO incluye `initialIsProvider={!!provider}`. Si al resolver el merge yo conservo mi versión del componente (lo correcto, ya que es el rediseño completo), estaré descartando silenciosamente la optimización de develop.

**Git no ayuda aquí:** como mi versión reemplaza prácticamente todas las líneas del archivo, git puede:
- Marcar conflicto en todo el archivo → en ese caso el desarrollador debe elegir un lado y perderá el otro
- O si el merge se aplica como "mi working tree sobre el resultado del merge", simplemente sobreescribirá el archivo con mi versión (sin `initialIsProvider`)

#### Clasificación: **Riesgo silencioso** (no genera error de build, pero pierde una optimización real)

#### Recomendación

**Reescribir sobre mi versión, incluyendo la línea que develop añadió.** La solución es trivial — solo hay que agregar `initialIsProvider={!!provider}` al único Navbar call en mi versión del componente:

```tsx
// En mi versión reescrita de ProviderLayoutClient.tsx, buscar esto:
<Navbar initialUser={initialUser} hideNavLinks />

// Y cambiarlo a esto:
<Navbar initialUser={initialUser} initialIsProvider={!!provider} hideNavLinks />
```

Un cambio de 1 palabra. No afecta nada del rediseño visual.

---

### 2. `components/layout/Navbar.tsx` — 🟡 PROBABLE MERGE AUTOMÁTICO

#### Qué cambió develop (líneas ~62–100)

Refactor de la firma del componente y del `useEffect`:

```tsx
// Antes:
export default function Navbar({ initialUser = null, hideNavLinks = false, logoSubtitle }) {
  const [isProvider, setIsProvider] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState(!!initialUser);
  useEffect(() => {
    const fetchUser = async () => { ... }; // fetches SIEMPRE al montar
    fetchUser();
    // ...
  }, []);

// Después en develop:
export default function Navbar({ initialUser = null, initialIsProvider, hideNavLinks = false, logoSubtitle }) {
  const [isProvider, setIsProvider] = useState(initialIsProvider ?? false);
  const [loadingProvider, setLoadingProvider] = useState(initialIsProvider === undefined && !!initialUser);
  useEffect(() => {
    if (initialIsProvider === undefined) { // solo fetcha si no se pasó el prop
      const fetchUser = async () => { ... };
      fetchUser();
    }
    // onAuthStateChange también se condiciona con initialIsProvider === undefined
  }, []);
```

#### Qué cambié yo (línea ~161)

```tsx
// Cambio minimal — solo este href:
href="/reservas"  // era href="/bookings"
```

#### Por qué probablemente no hay conflicto

Los cambios están en zonas completamente distintas del archivo:
- Develop tocó las líneas ~62–100 (firma + `useState` + `useEffect`)
- Yo toqué la línea ~161 (un `href` dentro del JSX del render)

Git hace merge automático cuando los hunks no se solapan. Este debería ser el caso.

#### Riesgo residual

Si el merge automático falla (puede pasar si el contexto de líneas alrededor del `href` fue movido por algún commit de develop), git lo marcará con `<<<<<<<`. La resolución es trivial: tomar la versión de develop del componente signature + mi `href="/reservas"`.

#### Clasificación: **Probable merge automático limpio** — bajo riesgo

#### Recomendación

Verificar post-merge que el `href="/reservas"` sigue presente y que la prop `initialIsProvider` está en la firma. Si hay conflicto, conservar develop para las líneas 62–100 y mi cambio para la línea del href.

---

### 3. `app/provider/layout.tsx` — ⚠️ VERIFICAR

#### Situación

El análisis de git mostró que tanto `origin/develop` como mi working tree añadieron el mismo bloque de código a este archivo:

```tsx
// Ambos lados añaden esto:
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

// ... y más abajo:
let unreadMessages = 0;
try {
  const admin = createSupabaseAdminClient();
  const { data: convos } = await admin
    .from("conversations")
    .select("id")
    .eq("provider_id", provider.id);
  if (convos?.length) {
    const { count } = await admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", convos.map(c => c.id))
      .eq("read", false)
      .neq("sender_id", user?.id ?? "");
    unreadMessages = count ?? 0;
  }
} catch { /* silent */ }

// Y en el return:
<ProviderLayoutClient provider={provider} initialUser={user ?? null} unreadMessages={unreadMessages}>
```

Nota: `app/provider/layout.tsx` NO aparece en el listado de `git diff --name-status HEAD origin/develop`, lo que sugiere que los archivos commiteados en HEAD y develop son idénticos. El diff que sí aparece al comparar específicamente el archivo puede reflejar la versión de mi working tree frente a algún estado intermedio.

#### Clasificación: **Sin riesgo** si los commits son idénticos; **conflicto trivial** si no lo son

#### Recomendación

Antes del merge, correr:
```bash
git show HEAD:art-rider/app/provider/layout.tsx | wc -l
git show origin/develop:art-rider/app/provider/layout.tsx | wc -l
```
Si el número de líneas es el mismo, los archivos commiteados son iguales y no hay conflicto. Los cambios del working tree se aplican encima sin problema.

---

## Tabla resumen de riesgo

| Archivo | Quién lo tocó | Riesgo | Acción recomendada |
|---|---|---|---|
| `app/provider/ProviderLayoutClient.tsx` | YO (total rewrite) + develop (+1 línea) | 🔴 **Silencioso** | Añadir `initialIsProvider={!!provider}` manualmente en mi versión antes de commitear |
| `components/layout/Navbar.tsx` | YO (1 línea) + develop (firma + useEffect) | 🟡 **Merge automático** | Verificar post-merge que `href="/reservas"` y `initialIsProvider` ambos están |
| `app/provider/layout.tsx` | YO (working tree) + develop (probablemente idéntico) | ⚠️ **Verificar** | Correr `git show` en ambos commits para confirmar igualdad |
| `app/provider/bookingsProvider/page.tsx` | Solo YO | ✅ **Seguro** | Sin acción |
| `services/bookingsService.ts` | Solo YO | ✅ **Seguro** | Sin acción |
| `app/provider/bookingsProvider/ProviderBookingsClient.tsx` | Solo YO (nuevo) | ✅ **Seguro** | Sin acción |
| `app/reservas/` | Solo YO (nuevo) | ✅ **Seguro** | Sin acción |
| Los 20 archivos solo en develop | Solo develop | ✅ **Seguro** | Se incorporan al merge sin conflicto |

---

## Optimizaciones de develop que NO debo perder

Estas son los cambios de develop que tienen impacto funcional real en producción. Al hacer el merge deben quedar presentes en el código final:

| # | Optimización | Archivo | Por qué importa |
|---|---|---|---|
| 1 | Validación de pago Kushki via `ticketNumber + transactionStatus === 'APPROVAL'` | `app/api/kushki/charge/route.ts` | Antes se aceptaban pagos que `isSuccessful` pero que la pasarela rechazó en `transactionStatus` → cobros fantasma |
| 2 | `getMyProviderProfile` envuelto en `cache()` | `services/providerService.ts` | Evita re-fetches de la misma función en el mismo render pass de React — crítico para el Navbar + layout que llaman a esta función varias veces |
| 3 | `getMyNotifications` y `getUnreadCount` en `cache()` | `services/notificationsService.ts` | Mismo patrón: reduce queries en cascada |
| 4 | `NotificationContext` + reescritura de `useNotifications` | `contexts/NotificationContext.tsx` + `hooks/useNotifications.ts` | Estado de notificaciones ya no se instancia N veces — ahora hay un único provider en el árbol |
| 5 | `initialIsProvider` en `Navbar` | `components/layout/Navbar.tsx` | Elimina llamada asíncrona a `getMyProviderProfile()` en el cliente en cada mount del Navbar |
| 6 | `getListingByIdWithProvider` (JOIN en 1 query) | `services/listingsService.ts` | Antes eran 2 queries separadas (listing + provider); ahora es 1 |
| 7 | `dynamic()` import de MapWrapper en `/listings/[id]` | `app/listings/[id]/page.tsx` | Evita que el mapa bloquee el First Contentful Paint |
| 8 | `getReviewsForListing` con `Promise.all` | `app/listings/[id]/page.tsx` | Paraleliza la query de listings del proveedor con la de reviews |

---

## Procedimiento recomendado para el merge

1. **Antes de cualquier merge**, en `app/provider/ProviderLayoutClient.tsx` de mi working tree: añadir `initialIsProvider={!!provider}` al `<Navbar>` call. Esto es el único cambio necesario para proteger la optimización de develop.

2. **Commitear mis cambios** (o hacer `git stash`).

3. **Hacer `git merge origin/develop`** (o `git rebase origin/develop` si se prefiere historia lineal).

4. **Resolver conflictos**, si los hay:
   - `components/layout/Navbar.tsx`: tomar versión de develop para la firma/useEffect, conservar `href="/reservas"` en el render.
   - `app/provider/ProviderLayoutClient.tsx`: si hay conflicto, conservar MI versión completa del componente (el rediseño) con la corrección del paso 1 ya aplicada.

5. **Verificar manualmente** que las 8 optimizaciones de la tabla anterior están presentes en el código merged.

6. Correr build y prueba rápida del flujo crítico: login proveedor → panel → mensajes → pago.
