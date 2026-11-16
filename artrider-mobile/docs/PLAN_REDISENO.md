# Plan de rediseño de UI (Airbnb / Uber, sobrio y simétrico)

## Diagnóstico (Fase B)

### Chips de categoría con glifos raros
Los nombres de ícono de `constants/categories.ts` existen todos en el mapa de Ionicons instalado (`@expo/vector-icons` 15.1.1), así que no son nombres mal escritos. La hipótesis más probable es **carga tardía de la fuente de íconos** tras el cambio de SDK: `app/_layout.tsx` solo precargaba Inter. Se precarga ahora `Ionicons.font` junto con Inter (mínimo cambio). **No verificado sin teléfono.** Si persiste, la segunda sospecha es el estilo del texto del chip (`ThemedText` aplica `fontWeight: 500` numérico sobre `Inter_600SemiBold`); el nuevo `Chip` del sistema de diseño elimina esa combinación.

### Inventario (83 archivos `.tsx`)
| Métrica | Valor |
|---|---|
| Colores hex/rgba sueltos | 173 (hex repetidos: `#875b9a`×19, `#5c3569`×19, `#fef2f2`×11…) |
| `width`/`height` fijos ≥ 10 | 145 (peor: `PackageDetailScreen` 14, `ListingDetailScreen` 12, `calendar` 11) |
| `fontSize` sueltos | 405 usos, **24 tamaños distintos** (9.5 → 48) |
| `borderRadius` distintos | **19 valores** (2 → 48, 999) |
| `Image` de RN sin caché ni placeholder | 22 archivos |
| `Dimensions.get` a nivel de módulo (no reactivo) | `HomeScreen`, `ExploreScreen`, `ImageGallery`, `animated-icon` |
| Tarjetas duplicadas | `HomeCard` (180 px fijo, con corazón) y `ExploreCard` (sin corazón), más tarjetas propias en reservas, favoritos, mapa |

### Inconsistencias visibles
1. **Secciones duplicadas en Home** («Equipos populares en Loja» y «…en Loja, Ecuador»): `homeService` agrupa por la cadena cruda de `address.city`. Se normaliza la clave de agrupación (solo presentación).
2. **Corazón de favoritos**: está en `HomeCard`, falta en `ExploreCard` (y en el detalle de paquete).
3. **Badge «Nuevo»** comparte fila con el título (`HomeCard`) y lo aprieta; la calificación puede cortarse.
4. **Contenido bajo la barra flotante** (iOS 26 Liquid Glass): cada pantalla improvisa `paddingBottom` o `BottomTabInset`; la lista de búsqueda en Home y el botón «Mapa» flotante chocan con la barra.
5. **Imágenes**: `aspectRatio` 20/15 en Home y 4/3 en Explorar; sin placeholder ni transición.
6. **Tipografía y radios sin escala**; texto muted de baja legibilidad (contraste < 3:1 en claro y oscuro).
7. Márgenes laterales distintos entre pantallas (`Spacing.four` vs valores sueltos).

## Plan por fases

- **C — Sistema de diseño** (sin tocar pantallas): tokens en `constants/theme.ts` (único módulo), `hooks/use-layout.ts` y componentes base en `components/ui/`: `Text`, `Button`, `Chip`, `SearchBar`, `SectionHeader`, `Badge`, `Avatar`, `EmptyState`, `Skeleton`, `Screen`, `ItemCard` (equipo/paquete).
- **D1 Home y búsqueda**: `HomeScreen`, `CategoryStrip`, `CityCarousel`, `HomeCard`/`ExploreCard` → `ItemCard`, `homeService` (clave de ciudad), `ExploreScreen`.
- **D2 Detalle y reservas**: `ListingDetailScreen`, `PackageDetailScreen`, `ImageGallery`, `BookingListCard`, `OrderGroupCard`, `(tabs)/reservations`, `DateRangePicker`.
- **D3 Carrito y checkout**: `CartScreen`, `checkout/*`, entorno visual de `KushkiPaymentForm` (sin cambiar su comportamiento).
- **D4 Mensajes y notificaciones**: `(tabs)/messages`, `ChatScreen`, `ProviderMessagesScreen`.
- **D5 Perfil, auth y proveedor**: `(tabs)/profile`, `EditProfileScreen`, `screens/auth/*`, `screens/provider/*`, `(provider)/calendar`.
- **E — Revisión**: tsc, expo-doctor, export iOS/Android, greps de hex y tamaños fijos, revisión de código y accesibilidad.

## Paleta (marca real: `art-rider/app/globals.css`)
Acento único: lila de marca `#875B9A` (primary-500). Neutros para todo lo demás. Modo oscuro con las superficies violeta de la web (`#16141E`, `#1E1B2A`, `#26223A`).
