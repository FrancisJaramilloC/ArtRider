# Arquitectura de artrider-mobile

App móvil de ArtRider (renta de equipos de audio, luces, video y efectos en Ecuador). Expo **SDK 58** (React Native 0.88, React 19.3), TypeScript estricto, expo-router con rutas tipadas y React Compiler activo. Hermana de la web `art-rider/` (Next.js) y comparte la base de datos Supabase (ver `BASE_DE_DATOS.md`).

## Comandos (solo pnpm 11.1.2)

```bash
pnpm install                       # el único lockfile es pnpm-lock.yaml
pnpm start                         # servidor Expo (escanear QR con Expo Go SDK 58)
pnpm exec tsc --noEmit             # tipos
pnpm dlx expo-doctor               # salud del proyecto
pnpm exec expo export --platform ios   # y android: valida el bundle (borrar dist después)
```

Nunca `npm`, `npx` ni `yarn`. Para ejecutables puntuales: `pnpm exec <bin>` o `pnpm dlx <paquete>`.

## Estructura

```
src/
  app/            Rutas expo-router (archivos finos que montan una pantalla)
    _layout.tsx     Stack raíz + providers (ColorScheme, Auth), fuentes Inter
    (auth)/         login, register, forgot-password (Stack.Protected: solo sin sesión)
    (tabs)/         Home, Reservas, Mensajes, Perfil  (NativeTabs, barra flotante iOS 26)
    (provider)/     Hoy, Calendario, Anuncios, Mensajes, Menú  (NativeTabs del proveedor)
    listing/[id], package/[id], cart, map, chat/[id], profile/edit, become-provider,
    checkout/…, provider/{create-*,edit-*,reviews,settings}, reset-password
  screens/        Pantallas completas por dominio (auth, home, explore, listing, package,
                  cart, chat, map, profile, provider)
  components/     Componentes por dominio: home, explore, bookings, listing, map, payment,
                  reviews, cart, navigation, ui (+ themed-text / themed-view)
  services/       Capa de datos (única que habla con Supabase)
  contexts/       AuthContext, ColorSchemeContext
  hooks/          useAuth, useFavorito, use-color-scheme, use-theme
  constants/      theme.ts (colores, radios, espaciado, fuentes), categories.ts
  types/          declaraciones sueltas
docs/             Este documento, BASE_DE_DATOS.md, context-audit.md (auditoría anterior)
```

Alias `@/*` → `src/*`.

## Navegación

- Raíz: `Stack` sin cabecera. `(tabs)` y `(provider)` siempre accesibles; `(auth)` protegido con `Stack.Protected guard={!session}`.
- Un invitado puede explorar Home, detalle y mapa. Reservas, Mensajes y Perfil envuelven su contenido en `ProtectedScreen` (redirige a `/login`).
- `(tabs)` y `(provider)` usan `expo-router/native-tabs` (pestañas nativas; en iOS 26 flotan con Liquid Glass y el contenido pasa por debajo: hay que reservar el inset inferior).
- Las rutas de `src/app` son delgadas: importan su pantalla de `src/screens/*`.

## Estado y contextos

- `AuthProvider`: `session`, `profile` (tabla `profiles`), `login/register/logout`, `refreshProfile`. Sesión persistida con `ChunkedSecureStoreAdapter` (SecureStore en trozos de 1800 B) en `services/supabase.ts`.
- `ColorSchemeProvider`: modo claro/oscuro con override manual guardado en SecureStore (toggle en Perfil). Los componentes leen `useColorScheme()` y `Colors[scheme]`.
- **No hay `CartContext`**: el carrito vive en el servidor (`cart_items`) y se consulta con `cartService`.
- Estado de pantalla con `useState`/`useEffect`; no hay librería global de estado ni de caché de datos.

## Servicios (`src/services`)

| Servicio | Responsabilidad |
|---|---|
| `supabase.ts` | Cliente; lee `EXPO_PUBLIC_SUPABASE_URL` y `..._ANON_KEY` y **falla al arrancar si faltan** |
| `authService` | signUp / signIn / signOut |
| `catalogService` | listings publicados, detalle, `catalog_items`, valoraciones y reseñas |
| `homeService`, `exploreService` | Agrupan listings + paquetes para Home/búsqueda |
| `packagesService` | Paquetes publicados y detalle |
| `availabilityService` | Fechas no disponibles y unidades libres (RPC) |
| `cartService` | Carrito y creación de orden multi-proveedor (edge `kushki-charge`) |
| `bookingsService` | Reservas del cliente, `create_booking`, pago Kushki, reseñas |
| `messagesService` | Conversaciones, mensajes, Realtime (mensajes, «escribiendo», presencia) |
| `favoritosService`, `notificationsService`, `profileService` | Favoritos, notificaciones, perfil y avatar |
| `providerService`, `providerCatalogService`, `getMyProviderId` | Modo proveedor: perfil, reservas, calendario, CRUD de anuncios y paquetes |

## Librerías clave

expo-router (rutas), react-native-reanimated + worklets (animaciones; `scheduleOnRN`), react-native-gesture-handler 3, react-native-screens / safe-area-context, expo-image y `Image` de RN (fotos), expo-linear-gradient, `@expo/vector-icons` (Ionicons), expo-symbols, expo-glass-effect, react-native-maps + map-clustering (mapa de equipos), react-native-calendars y datetimepicker (fechas), react-native-webview (formulario de tarjeta Kushki), expo-secure-store, expo-image-picker, expo-location, `@supabase/supabase-js`.

## Flujos principales

1. **Autenticación**: login/registro/olvidé contraseña/reset por deep link (`reset-password`). Registro crea `profiles` por trigger.
2. **Exploración**: Home con buscador en píldora, chips de categoría, carruseles por ciudad y paquetes; al enfocar el buscador se muestra la grilla con filtros de ciudad y precio. Mapa con pines de precio.
3. **Detalle y reserva directa**: detalle con galería, reseñas, calendario de disponibilidad → `checkout/[id]` (rango de fechas + cantidad) → resumen → **pago con Kushki** (WebView invisible tokeniza la tarjeta; edge `kushki-charge` cobra y crea la reserva) → éxito.
4. **Carrito**: agregar equipos/paquetes con fechas, resumen multi-proveedor y un único pago (`create_cart_order`).
5. **Reservas del cliente**: lista agrupada, estado, cancelación, reseña tras completar.
6. **Chat**: lista de conversaciones (carga única + pull-to-refresh) y chat con Realtime, «escribiendo…» y presencia.
7. **Perfil**: datos, avatar (Storage `avatars`), tema claro/oscuro, ser proveedor.
8. **Modo proveedor**: «Hoy» (reservas pendientes: aceptar/rechazar con reembolso, finalizar), calendario por anuncio (bloquear fechas), anuncios y paquetes (crear/editar/publicar/borrar, portada vía edge `upload-listing-cover`), mensajes, reseñas, ajustes.

## Sistema de diseño

Un único módulo de tokens: `src/constants/theme.ts` (colores claro/oscuro, `Spacing` en cuadrícula de 8, `Radius`, escala `Type`, `Shadows`, `MinTouch` 44, `Gutter`, `Breakpoints`, `StatusColors`). Acento único: lila de marca `#875B9A` (`#A97DC4` en oscuro); neutros para el resto.

- `hooks/use-layout.ts` (`useLayout`): breakpoints reactivos (compact < 360, regular, tablet > 600), `gutter`, columnas, `cardWidth()`, `bottomInset` (barra flotante iOS 26).
- `components/ui/`: `Text`, `Button`, `IconButton`, `Chip`, `SearchBar`, `SectionHeader`, `Badge`, `Avatar`, `EmptyState`, `Skeleton`/`ScreenSkeleton`, `Screen`, `ScreenHeader`, `StickyFooter`, `Sheet`/`ConfirmSheet`, `ListRow`, `SegmentedControl`, `QuantityStepper`, `PriceSummary`, `ItemCard` (equipo/paquete, con corazón y proporción 4:3 únicos).
- Compartidos por dominio: `components/detail/*` (detalle), `components/checkout/CheckoutParts.tsx`, `components/messages/ConversationsView.tsx`.
- Siempre `useTheme()` / `useColorScheme()` de `@/hooks/*` (respetan el toggle de Perfil), nunca el `useColorScheme` de `react-native`.
- `ThemedText` es el componente heredado; el código nuevo usa `ui/Text`.

## Convenciones

- Idioma de la UI: español. No cambiar textos funcionales al reestilizar.
- Importes en centavos; mostrar con `$${(x/100).toFixed(0)}`.
- Toda llamada a Supabase va en `services/`, nunca en componentes de presentación (excepciones históricas: `AuthContext`, `ForgotPassword/ResetPassword`).
- Estilos con `StyleSheet`/objetos y tokens de `constants/theme.ts`; modo claro/oscuro con `useColorScheme`.
- Sin `any` nuevos ni `@ts-ignore`.

## Paridad con la web

| Existe en la web, no en el móvil | Existe en el móvil, no en la web |
|---|---|
| Panel admin, asesor de eventos (`cotizar`, propuestas, riders), verificación de identidad (Stripe), pagos con Stripe, finanzas e inventario del proveedor, dashboard, **pantalla de notificaciones**, **pantalla de favoritos** | Mapa de equipos con pines y clustering, calendario del proveedor con bloqueo de fechas, vista «Hoy» del proveedor, modo claro/oscuro con toggle |

`notificationsService` y los getters de favoritos del móvil existen pero **ninguna pantalla los usa**. `ExploreScreen` está sin ruta (búsqueda integrada en Home).
