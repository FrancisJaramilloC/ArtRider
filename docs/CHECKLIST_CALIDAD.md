# Checklist de calidad — diagnóstico

Fecha: 2026-11-20 · Base: `origin/develop` (`7f37609`) · Solo diagnóstico: no se cambió código, no se aplicó SQL, no se desplegó nada.

**Cómo se hizo.** Búsquedas en el repo versionado (`git grep`) en `artrider-mobile`, `art-rider` (web), `supabase/` (Edge Functions y migraciones) y los docs. No se leyó ningún `.env`. No se consultó Supabase ni la web desplegada.

**Leyenda.**
- *Alcance*: M = móvil, W = web, B = backend (Supabase / Edge Functions).
- *Estado*: hecho · parcial · pendiente · no aplica · no verificable aquí.
- *Esfuerzo*: S (horas) · M (1–3 días) · L (más de 3 días).
- *Prioridad*: alta · media · baja.
- Las rutas son relativas a la raíz del repo; `m/` = `artrider-mobile/src/`, `w/` = `art-rider/`.

> **Limitaciones.**
> - Lo que vive solo en la base o en el dashboard de Supabase (configuración de Auth, buckets, índices reales, región) o en el despliegue de la web (compresión, caché, cabeceras reales, HTTPS) figura como «no verificable aquí».
> - El informe `docs/AUDITORIA_SEGURIDAD.md` está en la rama `fix/c1-creacion-solo-servidor`, todavía no mezclada en `develop`; se cita como referencia.
> - Los conteos de «dependencia sin uso» salen de buscar el nombre del paquete en imports; son **candidatas** y hay que confirmarlas con `pnpm dlx depcheck` antes de quitar nada.

---

## 0. Hallazgos urgentes (antes de la tabla)

1. **Una llave `service_role` de Supabase estuvo versionada.**
   - Aparece en el historial de `art-rider/test_insert.cjs`, en decenas de commits entre 2026-05-26 y 2026-11-16 (por ejemplo `0ffb7fa`, `018d347`, `019e10e`, `220ea6a`).
   - Se quitó en `4667ee9` (2026-11-16, «remove hardcoded service_role script»), pero **sigue en el historial** y en las ramas remotas (`origin/develop` y otras).
   - Se comprobó solo el claim `role` del JWT (sin imprimir el token): es `service_role`.
   - Hay que **rotarla** en Supabase (Settings → API) y actualizar los secretos de las Edge Functions y de la web.
2. **`artrider-mobile/.env` estuvo versionado** (commit `019e10e` 2026-10-17; se retiró en `52a17e1` 2026-10-22).
   - Por la regla de no leer `.env`, no se inspeccionó su contenido histórico. Tratarlo como filtrado hasta revisarlo y rotar lo que contenga.
3. **Pagos en el ambiente de pruebas de Kushki (UAT).**
   - La URL `api-uat.kushkipagos.com` está fija en `supabase/functions/kushki-charge/index.ts:24` (con comentario de cambiarla para producción), `client-cancel-booking/index.ts:16`, `provider-respond-booking/index.ts:82`, `w/app/api/kushki/charge/route.ts:14` y `w/services/bookingsService.ts:518`.
   - Bloquea salir a producción.
4. **Términos y Privacidad son placeholders.**
   - Móvil: `m/constants/legal.ts:6-7` apunta a `example.com` (TODO en la línea 3).
   - Web: `w/components/layout/Footer.tsx:50,52` tiene `href="#"`.
   - Las tiendas exigen URLs reales.
5. **Falta eliminar cuenta y reportar/bloquear contenido** (chat y publicaciones de usuarios): no encontrado. Apple lo exige (guías 5.1.1(v) y 1.2).
6. **La web puede crear reservas sin pasar por el cobro del servidor.**
   - `w/components/features/bookings/ConfirmBookingButton.tsx:24` llama a `createBooking`, que inserta directo en `bookings` (`w/services/bookingsService.ts:361`).
   - Está ligado al hallazgo C2 de la auditoría.

---

## 1. Rendimiento

| # | Punto | Alcance | Estado | Evidencia | Esf. | Prio. |
|---|---|---|---|---|---|---|
| 1 | Skeletons de carga | M, W | **parcial** | M: `m/components/ui/Skeleton.tsx` (pulso en :18-24), usado en 18 archivos (`reservations.tsx:97`, `checkout/[id].tsx:97`, `calendar.tsx:265`). W: solo `w/app/listings/loading.tsx` (1 `loading.tsx` en toda la web) | M | media |
| 2 | Imágenes en WebP o AVIF | M, W | **pendiente** | No hay `.webp`/`.avif` versionados; 61 `.png` (14 en `artrider-mobile/assets/images`). `w/next.config.ts` sin `images.formats`. Las subidas aceptan WebP (`w/components/features/listings/ListingForm.tsx:137`) pero no convierten. Bucket de Supabase: no verificable aquí | M | media |
| 3 | Evitar llamadas duplicadas | M, W | **parcial** | No hay react-query/SWR. El móvil usa un hook propio por pantalla (`m/hooks/useAsyncData.ts:49`, `reloadOnFocus` recarga al volver a enfocar) sin caché compartida. W: no verificado | M | media |
| 4 | Debounce en búsqueda/autocompletado | M, W | **hecho** | `m/screens/home/HomeScreen.tsx:78` (300 ms), `m/components/provider/ItemPickerSheet.tsx:26` (250 ms), `w/components/location-picker/LocationPicker.tsx:157` | — | — |
| 5 | Paginar resultados de la API | M, W | **parcial** | Hecho en catálogo del Partner (`m/services/providerCatalogService.ts:228,501` con `.range`) y `limit(50)` en notificaciones (`m/services/notificationsService.ts:33`). **Sin paginar**: `getCatalogItems` y `searchCatalog` traen todo `catalog_items` (`m/services/catalogService.ts:129-149`); el filtrado de Home es en cliente (`HomeScreen.tsx:100-108`) | M | **alta** |
| 6 | Estáticos desde una CDN | M, W | **no verificable aquí** | Imágenes en Supabase Storage público (`w/next.config.ts` `remotePatterns`); depende de la CDN de Supabase y del despliegue web. Hay `Dockerfile`/`docker-compose.yml` en la web (despliegue propio posible) | S | baja |
| 7 | Tareas lentas a una cola | B | **no aplica (por ahora)** | No hay cola; reembolsos y cobros son síncronos con timeout (`client-cancel-booking/index.ts:42`). Con el volumen actual una cola añade complejidad sin beneficio claro | — | — |
| 8 | Arreglar consultas N+1 | M, W, B | **parcial** | Sin patrón `map(async…)` en móvil/web; los detalles usan una RPC por pantalla (`get_client_booking_detail`, `get_client_order_detail`) y la web usa `Promise.all` (p. ej. `w/app/explore/page.tsx`). Planes de consulta de la base: no verificable aquí | M | media |
| 9 | Compresión Brotli/gzip | W | **no verificable aquí** | `w/next.config.ts` no desactiva `compress`; depende del despliegue. Móvil: no aplica (API JSON de Supabase) | S | baja |
| 10 | Caché con Redis | B | **no aplica** | No hay datos calientes que lo justifiquen; Supabase + RPC; sin Redis en el repo | — | — |
| 11 | Quitar dependencias sin usar | M, W | **pendiente** | Candidatas (0 imports): móvil `expo-glass-effect`, `@expo/ui`, `expo-device`, `@expo/dom-webview`, `@react-native-community/datetimepicker`; web `jspdf`, `leaflet`, `react-leaflet`, `@vis.gl/react-google-maps`, `framer-motion`, `@stripe/stripe-js`, `@radix-ui/react-slot`, `shadcn`. Confirmar con depcheck | S | media |
| 12 | Timeout a las APIs externas | M, B | **parcial** | Hecho: `useAsyncData.ts:86` (15 s por defecto), `client-cancel-booking/index.ts:42` (25 s). **Faltan** en las llamadas a Kushki de `kushki-charge/index.ts:167,293` y `provider-respond-booking/index.ts:82` | S | **alta** |
| 13 | Respuestas de IA token a token | — | **no aplica** | La app no usa IA (solo aparece `openai_api_key` en `supabase/config.toml:101`, config del Studio) | — | — |
| 14 | Actualización optimista de la UI | M, W | **pendiente** | W: solo comentarios en `w/components/messages/ChatRoom.tsx:134-153`; móvil: no encontrado | M | baja |
| 15 | Lazy loading de imágenes fuera de pantalla | M, W | **parcial** | M: `expo-image` con `cachePolicy` en 16 archivos y listas virtualizadas; pero se usa `Image` de RN en `m/components/map/MapPreviewCard.tsx:1`, `m/screens/chat/ChatScreen.tsx:5`, `m/screens/profile/EditProfileScreen.tsx:2`. W: `next/image` (`ListingGallery.tsx:49,79`) y `<img>` en admin (`EquiposClient.tsx:112`, `PaquetesClient.tsx:165`) | S | baja |
| 16 | Peticiones independientes en paralelo | M, W | **parcial** | W: `Promise.all` en 12+ páginas (`w/app/explore/page.tsx`, `w/app/bookings/page.tsx`…). M: `m/app/(provider)/calendar.tsx:207`; el resto no se revisó pantalla por pantalla | S | baja |
| 17 | Índices para las consultas comunes | B | **parcial** | Migraciones: `w/supabase/migrations/20260512_performance_indexes.sql` (bookings, listings, booking_units…). No hay índices versionados para `orders(client_id)`, `bookings(order_id)`, `cart_items`. Estado real: no verificable aquí (correr `get_advisors` de rendimiento) | S | media |
| 18 | OpenTelemetry (peticiones lentas) | B, W | **pendiente** | No encontrado | L | baja |
| 19 | Servidor cerca de la base de datos | W, B | **no verificable aquí** | Región de Supabase y del hosting web no están en el repo | S | baja |
| 20 | SSR o render en el build | W | **hecho** | Next App Router; páginas servidor con `revalidate = 0` (`w/app/listings/[id]/page.tsx:32`) y `force-dynamic` (`provider/bookingsProvider/page.tsx`). Móvil: no aplica | — | — |
| 21 | Scripts de terceros tras la página | W | **no aplica** | No hay `next/script` ni analítica/trackers de terceros en la web | — | — |
| 22 | Dividir el JS por pantalla | W, M | **parcial** | W: `next/dynamic` en 5 archivos (mapas: `MapWrapper.tsx`, `LocationPickerWrapper.tsx`…). M: no aplica en nativo (Metro empaqueta todo) | S | baja |
| 23 | Virtualizar listas largas | M | **hecho** | `FlatList` en 14 archivos (`reservations.tsx:110`, `ConversationsView.tsx`, `FavoritesScreen.tsx`…). W: no verificado | — | — |
| 24 | Pedir solo las columnas necesarias | M, W | **parcial** | 19 `select('*')` (`m/services/catalogService.ts:129,139`, `notificationsService.ts:30`, `providerService.ts:28`…) | M | media |
| 25 | Pool de conexiones | B | **no aplica** | El cliente usa la API REST de Supabase (PostgREST); el pool lo gestiona Supabase | — | — |
| 26 | Evitar rerenders innecesarios | M | **hecho** | React Compiler activo: `artrider-mobile/app.json:45`. W: no verificado | — | — |
| 27 | Caché de estáticos en el navegador | W | **no verificable aquí** | Valores por defecto de Next; depende del despliegue. Móvil: `expo-image` `cachePolicy="memory-disk"` | S | baja |
| 28 | Repartir tráfico entre instancias | W | **no verificable aquí** | No hay evidencia de despliegue; Supabase gestiona su parte | — | baja |
| 29 | Fuentes propias con pocos grosores | M, W | **parcial** | M: Inter 400/500/600/700 (`m/app/_layout.tsx:19-22`, 4 pesos). W: `next/font/google` con Geist, Geist Mono e Inter (`w/app/layout.tsx:2`; 3 familias) | S | baja |
| 30 | Monitoreo de velocidad de usuarios reales | M, W | **pendiente** | No hay Sentry, analítica ni speed-insights | M | media |
| 31 | Probar en celulares y redes lentas | M | **pendiente** | No hay procedimiento ni evidencia. `scripts/ui-audit` mide márgenes y táctiles, no red | M | media |
| 32 | Loader: barra de progreso | M | **hecho** | `m/components/ui/WizardScaffold.tsx:78-95` | — | — |
| 33 | Loader: pull to refresh | M | **hecho** | `reservations.tsx:116`, `ConversationsView.tsx:204`, `FavoritesScreen.tsx:95`, `calendar.tsx:207` | — | — |
| 34 | Loader: spinner | M | **hecho** | `ActivityIndicator` en 9 archivos | — | — |
| 35 | Loader: pulsing (skeleton) | M | **hecho** | `Skeleton.tsx:18-24` (animación de opacidad) | — | — |
| 36 | Loader: de botón | M | **hecho** | `m/components/ui/Button.tsx:18,34,41` (`loading`) | — | — |
| 37 | Loader: de infinite scroll | M | **pendiente** | No hay `onEndReached` ni carga incremental (los `ListFooterComponent` encontrados no son de paginación). Depende del punto 5 | M | media |
| 38 | Loader: de pantalla completa | M | **hecho** | `CheckoutLoading` (`m/app/checkout/cart-summary.tsx:52`) | — | — |

---

## 2. Seguridad

| # | Punto | Alcance | Estado | Evidencia | Esf. | Prio. |
|---|---|---|---|---|---|---|
| 1 | Autenticación bien configurada | M, W, B | **parcial** | Supabase Auth; sesión móvil en SecureStore troceado (`m/services/supabase.ts:3,25`); verificación de correo y reset (`m/app/reset-password.tsx`). Configuración del dashboard (confirmación obligatoria, política de contraseñas, expiración OTP): no verificable aquí | S | media |
| 2 | Claves de API fuera del cliente | M, W, B | **parcial** | La app móvil solo usa la clave `anon` (regla en `artrider-mobile/CLAUDE.md`); `service_role` solo en Edge Functions. **Pero** hubo `service_role` en el historial (ver §0) | S | **alta** |
| 3 | Proteger la base de datos (RLS, permisos) | B | **parcial** | C1 resuelto (rama `fix/c1-creacion-solo-servidor`). Pendiente C2 (`bookings_insert`/`bookings_update` abiertas), funciones `SECURITY DEFINER` ejecutables por `anon`, grants amplios: ver `docs/AUDITORIA_SEGURIDAD.md` en esa rama. Estado real hoy: no verificable aquí | L | **alta** |
| 4 | Forzar HTTPS | M, W | **no verificable aquí** | Los hosts de Kushki y la CDN son `https://`; las URLs de Supabase vienen de variables de entorno (no se leyeron); HSTS/redirección de la web depende del despliegue | S | media |
| 5 | Contraseñas con hash | B | **no aplica** | Lo hace Supabase Auth; la app nunca guarda contraseñas | — | — |
| 6 | Validar formularios en el servidor | M, W, B | **parcial** | Servidor valida precio/fechas/ticket (`kushki-charge`, RPC `create_*_for`). Perfil y equipos validan sobre todo en el cliente (`useForm`, límites en componentes web) | M | media |
| 7 | Protección contra XSS | W, M | **hecho** | React escapa; sin `dangerouslySetInnerHTML` en web ni móvil. WebView de Kushki con HTML propio (`m/components/payment/KushkiPaymentForm.tsx:19`) | — | — |
| 8 | Registrar y vigilar actividad sospechosa | B, W | **pendiente** | Solo `console.error`; sin alertas ni auditoría. Logs de Supabase: no verificable aquí | M | media |
| 9 | Blindar rutas de admin | W | **hecho** | `w/app/admin/layout.tsx:13-14` (`app_metadata.role === "admin"`); cada acción vuelve a comprobarlo (`w/services/adminService.ts:22,67,129,173`) | — | — |
| 10 | Consultas parametrizadas | M, W, B | **hecho** | `supabase-js`/PostgREST y RPC con parámetros. Detalle menor: el texto de búsqueda se interpola en `ilike` (`m/services/catalogService.ts:146`); no es inyección SQL, pero `%`/`_` actúan como comodines | S | baja |
| 11 | Revisar variables de entorno | M, W | **parcial** | `.env` ignorado (`.gitignore`, `artrider-mobile/.gitignore`) y la app falla con mensaje claro si faltan (`m/services/supabase.ts`). Pero `.env` estuvo versionado (ver §0) | S | **alta** |
| 12 | Límite de peticiones (rate limit) | B, W | **pendiente** | No hay en `kushki-charge`, `client-cancel-booking`, `provider-respond-booking`, `upload-listing-cover` ni en `w/app/api/*`. Límites propios de Supabase Auth: no verificable aquí | M | media |
| 13 | Restringir CORS | B | **parcial** | Las 4 Edge Functions usan `Access-Control-Allow-Origin: '*'` (`kushki-charge/index.ts:19`, `client-cancel-booking/index.ts:12`, `provider-respond-booking/index.ts:9`, `upload-listing-cover/index.ts:10`). Riesgo bajo (autenticación por token, no cookie), pero conviene limitarlo al dominio web | S | baja |
| 14 | Cabeceras de seguridad | W | **pendiente** | `w/next.config.ts` no define `headers()` (sin CSP, `X-Frame-Options`, etc.). Cabeceras puestas por el hosting: no verificable aquí | S | media |
| 15 | Cookies de sesión seguras | W | **no verificable aquí** | `@supabase/ssr` en `w/proxy.ts:25-45` propaga las opciones por defecto; revisar `Secure`/`SameSite` en el despliegue | S | media |
| 16 | Protección CSRF | W | **no verificable aquí** | Las rutas `w/app/api/*` (5) no validan `Origin` explícitamente; las Edge Functions usan token en cabecera (no aplica CSRF) | S | media |
| 17 | Enlaces de recuperación que caduquen | B | **no verificable aquí** | Es configuración de Supabase Auth (vigencia del OTP/enlace) | S | media |
| 18 | Limitar tipo y tamaño de archivos subidos | M, W, B | **parcial** | Solo tamaño 5 MB: `upload-listing-cover/index.ts:50`, `w/services/listingsService.ts:163,222,397`. **Sin lista blanca de tipo** en la función (solo comprueba que `mimeType` exista, `:29`); el móvil mapea tipos en `m/services/profileService.ts:25`. Límites del bucket (`file_size_limit`, `allowed_mime_types`): no encontrados en `supabase/config.toml` | M | **alta** |
| 19 | Verificar precios y pagos en el servidor | M, W, B | **parcial** | Móvil: hecho (`kushki-charge` cotiza, compara `expectedTotal`, crea con `create_*_for`). **Web**: `w/components/features/bookings/ConfirmBookingButton.tsx:24` crea reservas sin pago y `w/app/api/kushki/charge/route.ts:52` usa `createBooking` directo | M | **alta** |
| 20 | Modo debug apagado en producción | M, W, B | **parcial** | `dev-gallery` solo en `__DEV__` (`m/app/dev-gallery.tsx:5`). Hay scripts de depuración versionados en la web (`w/check_db.js`, `check_db.ts`, `check_items.js`, `test_packages.js`). `debug_check_provider` no está en el repo: existe, si existe, solo en la base — no verificable aquí | S | media |
| 21 | Actualizar dependencias vulnerables | M, W | **no verificable aquí** | No se corrió `pnpm audit`; no hay Dependabot ni CI (`.github` no existe) | S | media |
| 22 | Quitar paquetes sin uso | M, W | **pendiente** | Ver Rendimiento #11 | S | media |
| 23 | Buscar archivos expuestos | M, W | **parcial** | Versionados sin motivo: `w/stripe.exe` (binario), `w/recent_changes.diff`, `w/out.css`, `w/check_db.*`, `w/check_items.js`, `w/test_packages.js`; capturas en `output/`. El CSV de Supabase con definiciones de producción no está versionado (aparece sin seguimiento). Buckets públicos: no verificable aquí | S | media |
| 24 | Buscar secretos filtrados en el historial de Git | B, W, M | **pendiente** | Hallazgo confirmado: `service_role` en `w/test_insert.cjs` (ver §0); `artrider-mobile/.env` versionado del 2026-10-17 al 2026-10-22; la clave `anon` estuvo fija en `m/services/supabase.ts` (`019e10e`; es pública por diseño). Se buscaron los patrones `sk_live_`, `sk_test_`, `whsec_` y JWT en las últimas 343 revisiones: solo aparecieron JWT. Falta un escaneo completo (gitleaks) | M | **alta** |
| 25 | Revocar y cambiar claves comprometidas | B | **pendiente** | Solo puede hacerlo el dueño del proyecto: rotar `service_role` y revisar lo que hubiera en el `.env` histórico | S | **alta** |
| 26 | Revisión de seguridad a fondo con informe | B | **hecho (parcial)** | `docs/AUDITORIA_SEGURIDAD.md` (rama `fix/c1-creacion-solo-servidor`): C1 arreglado; C2 y altos pendientes. Propuestas SQL sin aplicar. No cubre la web desplegada | L | **alta** |

---

## 3. Legal y privacidad

| # | Punto | Alcance | Estado | Evidencia | Esf. | Prio. |
|---|---|---|---|---|---|---|
| 1 | Política de privacidad | M, W | **pendiente** | Móvil: `m/constants/legal.ts:7` = `https://example.com/privacidad` (TODO `:3`). Web: `w/components/layout/Footer.tsx:50` `href="#"`; `LandingFooter.tsx:76` es texto sin enlace | M | **alta** |
| 2 | Términos de servicio | M, W | **pendiente** | Móvil: `m/constants/legal.ts:6` = `example.com/terminos`. Web: `Footer.tsx:52` `href="#"` | M | **alta** |
| 3 | Banner de cookies | W | **no aplica (por ahora)** | No hay analítica ni rastreadores; las cookies son solo de sesión (necesarias). Revisar si se añade analítica. Móvil: no aplica | — | — |
| 4 | Baja en emails de marketing | W, B | **no aplica (por ahora)** | No se encontraron emails de marketing; el único envío es confirmación de cuenta (`ResendConfirmation`) | — | — |
| 5 | Límites de retención de datos | B | **pendiente** | No hay política ni jobs de purga en el repo. Estado real: no verificable aquí | M | media |
| 6 | Solicitudes de acceso y borrado de datos | M, W, B | **pendiente** | No hay «eliminar cuenta» ni exportación (sin coincidencias en móvil, web ni funciones). Apple exige borrado dentro de la app | L | **alta** |
| 7 | Checkbox de aceptación de privacidad y términos | M, W | **parcial** | Móvil: `m/screens/auth/RegisterScreen.tsx:149-153` (también 18+). Web: el registro (`w/app/(auth)/register/page.tsx`) no tiene casilla | S | **alta** |
| 8 | Registro de la aceptación de los términos | M, B | **parcial** | Móvil guarda `terms_accepted_at` en los metadatos del usuario (`m/services/authService.ts:76`); no guarda la **versión** de los términos. Web: no | S | media |
| 9 | Política de reembolsos | M, W | **parcial** | Móvil: `m/constants/copy.ts:94` (cancelar mientras el Partner no responda; reembolso automático si rechaza). **La web dice otra cosa**: «Cancelación gratuita durante 48 horas» (`w/app/bookings/new/page.tsx:107-109`) y «Reembolso garantizado» (`w/app/listings/[id]/page.tsx:468`). Unificar | S | **alta** |
| 10 | Suscripciones fáciles de cancelar | — | **no aplica** | No hay suscripciones | — | — |
| 11 | Divulgar renovaciones automáticas | — | **no aplica** | No hay cobros recurrentes | — | — |
| 12 | No recolectar datos innecesarios | M, W | **no verificable aquí** | Se piden ubicación (`expo-location`), teléfono y verificación de identidad (web, Stripe: `w/app/api/stripe/create-verification/route.ts`). Falta un inventario de datos y su justificación | M | media |
| 13 | Consentimiento parental (menores) | M | **hecho (bloqueo)** | Se exige ser mayor de 18 (`RegisterScreen.tsx:153`, `authService.ts:62-63`); no se tratan datos de menores | — | — |
| 14 | Consentimiento separado para marketing | W, M | **no aplica (por ahora)** | No hay marketing; ponerlo antes de lanzarlo | — | — |
| 15 | Bloquear rastreadores hasta tener consentimiento | W, M | **no aplica (por ahora)** | No hay rastreadores (sin analítica, pixeles ni SDKs de publicidad) | — | — |
| 16 | Auditar SDKs de terceros, analítica y rastreo | M, W | **pendiente** | Sin inventario documentado. Terceros vistos: Supabase, Kushki (WebView, `cdn.kushkipagos.com`), Stripe (web), Resend, MapLibre/Google Maps (web), fuentes de Google. Necesario también para «App Privacy» de Apple y «Data safety» de Google | S | media |
| 17 | Acuerdos de procesamiento de datos (DPA) | B | **no verificable aquí** | Son contratos con Supabase, Kushki, Stripe, Resend; no están en el repo | S | media |
| 18 | Lista de subencargados | B | **pendiente** | No encontrada (relacionada con #16) | S | baja |
| 19 | Compromisos de disponibilidad realistas | W | **parcial** | No hay SLA publicado; la web afirma «Garantizamos disponibilidad, funcionamiento y soporte técnico» (`w/app/cotizar/resultado/ProposalView.tsx:290`) y «Equipos verificados y garantizados» (`:287`). Confirmar que se pueden sostener | S | media |
| 20 | Sin tarifas ocultas | M, W | **parcial** | Móvil: el desglose muestra subtotal, tarifa de servicio y total antes de pagar (`m/app/checkout/cart-summary.tsx:103-107`) y también en detalles. Web: no verificado | S | media |
| 21 | Datos de contacto del negocio | M, W | **pendiente** | No hay correo/teléfono de soporte visibles (solo un enlace a WhatsApp en `w/components/features/bookings/BookingFlowClient.tsx:111` y textos «contacta a soporte»). Las tiendas piden URL/correo de soporte | S | **alta** |
| 22 | Etiquetar contenido generado por IA | — | **no aplica** | No hay IA | — | — |
| 23 | Impedir entrenamiento de IA con datos de usuarios | — | **no aplica** | No hay IA ni terceros de IA | — | — |
| 24 | Licencias de imágenes, fuentes y código | M, W | **parcial** | Fuentes Inter y Geist (licencia abierta). Las imágenes de `artrider-mobile/assets/images` y `w/public` no tienen origen documentado. `artrider-mobile/LICENSE` es la MIT de Expo heredada de la plantilla; no refleja una licencia propia | S | media |
| 25 | Obligaciones de licencias open source | M, W | **pendiente** | No hay aviso de terceros ni revisión de licencias (`pnpm dlx license-checker`) | S | baja |
| 26 | No usar logos de clientes sin permiso | W | **no verificable aquí** | No se encontraron logos de clientes en el código; requiere revisión humana de los assets | S | baja |
| 27 | Quitar reseñas falsas, cuentas regresivas falsas, afirmaciones sin sustento, falsas afirmaciones de SOC 2 y patrones oscuros | M, W | **parcial** | Sin cuentas regresivas, testimonios ni «SOC 2» (búsqueda sin resultados). Reseñas: solo de reservas completadas (`docs/BASE_DE_DATOS.md`). Afirmaciones a sustentar: «Pago protegido con SafeRider. Reembolso garantizado…» (`w/app/listings/[id]/page.tsx:468`), «Operador certificado» (`:309`), «Equipos verificados y garantizados» | S | media |
| 28 | Requisitos de registro DMCA / reporte de contenido | M, W | **pendiente** | Hay contenido de usuarios (publicaciones, fotos, chat) y no existe «reportar» ni «bloquear» (sin coincidencias). Apple lo pide (1.2); un proceso de retiro por infracción es recomendable aunque el registro DMCA es propio de EE. UU. | M | media |

---

## 4. Accesibilidad

| # | Punto | Alcance | Estado | Evidencia | Esf. | Prio. |
|---|---|---|---|---|---|---|
| 1 | Contraste de color | M, W | **parcial** | Los tokens se corrigieron en el rediseño (`m/constants/theme.ts:39,62`; problema original en `docs/PLAN_REDISENO.md:25`), pero no hay medición automática ni prueba de contraste. Verificar con las herramientas de tema oscuro y claro | M | media |
| 2 | Texto alternativo | M, W | **parcial** | Móvil: 87 `accessibilityLabel` y 118 `accessibilityRole`; las imágenes de contenido llevan etiqueta en los detalles (p. ej. `ClientBookingDetailScreen.tsx:154`) pero no todas. Web: 48 `alt=`, 3 `alt=""` (miniaturas de listados de admin: `EquiposClient.tsx:112`, `PaquetesClient.tsx:165`) | M | media |
| 3 | Navegación con teclado | W, M | **parcial** | Web: 89 estilos `focus`/`outline` en componentes; sin enlace «saltar al contenido» en `w/app/layout.tsx`. Móvil: roles y etiquetas presentes; «reducir movimiento» solo en `m/components/ui/WizardScaffold.tsx:78` y en `utils/motion.ts`; `maxFontSizeMultiplier` limitado a la barra de búsqueda (`SearchFilterBar.tsx:37,79,84`). Probar con VoiceOver/TalkBack y teclado externo: no verificable aquí | M | media |

---

## 5. Orden propuesto de ramas pequeñas

Cada rama debe ser un PR pequeño y revisable por separado. Se ordenan por riesgo y dependencia.

1. **`fix/seguridad-secretos`** (urgente, sin cambios de app)
   - Rotar la `service_role` y revisar lo que hubiera en el `.env` histórico (lo hace el dueño del proyecto).
   - Retirar del repo `w/stripe.exe`, `w/recent_changes.diff`, `w/out.css`, `w/check_db.*`, `w/check_items.js`, `w/test_packages.js` y `output/`.
   - Añadir un escaneo de secretos (gitleaks) como paso previo al commit.
   - Decidir si se limpia el historial (`git filter-repo`) o si basta con rotar.
2. **`fix/pagos-produccion`**
   - Pasar de Kushki UAT a producción en las 5 ubicaciones (con la llave privada de producción en secretos), de forma configurable por variable.
   - Timeouts en `fetch` de `kushki-charge` y `provider-respond-booking`.
   - Rate limit básico en las funciones de dinero.
3. **`fix/seguridad-subidas`**
   - Lista blanca de tipos en `upload-listing-cover` y comprobación del estado del Partner.
   - `file_size_limit` y `allowed_mime_types` en los buckets (propuesta SQL, sin aplicar).
   - Validación del lado del servidor en la web.
4. **`fix/seguridad-bookings-web`** (C2)
   - Migrar la web (`createBooking`, `ConfirmBookingButton`, ruta `kushki/charge`) para que no inserte directo en `bookings`.
   - Después, aplicar las políticas de C2 y los permisos mínimos (`fix/seguridad-permisos-basicos`).
5. **`docs/legal-tiendas`**
   - URLs reales de Términos y Privacidad (móvil y web), casilla en el registro web y versión de los términos aceptados.
   - Eliminar cuenta, reportar/bloquear contenido, datos de contacto y soporte.
   - Política de reembolsos única (móvil = web) y revisión de afirmaciones (SafeRider, «garantizado», «certificado»).
   - Inventario de SDKs para «App Privacy» y «Data safety».
6. **`perf/rendimiento-listas`**
   - Paginación del catálogo con carga incremental y su loader.
   - `select` con columnas concretas.
   - Índices para `orders`, `bookings(order_id)` y `cart_items`, tras correr los avisos de rendimiento de Supabase.
7. **`perf/imagenes`**
   - WebP/AVIF en assets y en las subidas (redimensionar al subir).
   - `Image` de RN → `expo-image` en las 3 pantallas pendientes; `<img>` → `next/image` en admin.
8. **`a11y/accesibilidad`**
   - Medición de contraste (claro/oscuro), etiquetas faltantes, Dynamic Type, «reducir movimiento» global.
   - Web: enlace «saltar al contenido» y revisión de foco; prueba con VoiceOver/TalkBack.
9. **`chore/observabilidad`**
   - Reporte de errores y de rendimiento en usuarios reales (móvil y web) y registro de actividad sospechosa.
   - OpenTelemetry solo si hace falta más adelante.
10. **`chore/dependencias`**
    - Quitar paquetes sin uso (tras `depcheck`), correr `pnpm audit`, revisar licencias.
    - Añadir CI y Dependabot.

Tareas pequeñas que pueden ir sueltas: cabeceras de seguridad y CORS de la web (`fix/web-cabeceras`), `ilike` con comodines escapados, y `debug_check_provider` (confirmar en la base si existe y retirarla).
