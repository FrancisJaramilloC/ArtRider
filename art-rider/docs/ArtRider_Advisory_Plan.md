# ArtRider Advisory — Plan de Integración (v1)

> Generado por análisis del repositorio en rama `feature/frontendRefractor` · 2026-06-15

---

## Índice

1. [Estado actual del esquema de catálogo](#1-estado-actual-del-esquema-de-catálogo)
2. [Estado actual del sistema de mensajería](#2-estado-actual-del-sistema-de-mensajería)
3. [Propuesta: motor de reglas y algoritmo de matching](#3-propuesta-motor-de-reglas-y-algoritmo-de-matching)
4. [Diseño del Wizard (nueva UI)](#4-diseño-del-wizard-nueva-ui)
5. [Plan de fases](#5-plan-de-fases)
6. [Dependencias entre tareas](#6-dependencias-entre-tareas)

---

## 1. Estado actual del esquema de catálogo

### 1.1 Qué existe hoy

**Tabla `listings`** (`supabase/schema.sql` líneas 119–136):
```
id, provider_id, catalog_item_id, address_id,
title, brand, model,
category TEXT CHECK (category IN ('audio','lighting','video','effects','other')),
cover_image_url, daily_price, description, is_published,
created_at, updated_at, deleted_at
```
- `category` es un enum de 5 valores. La migración `20260516_add_advertising_category.sql` añadió `advertising`.
- No hay ningún campo de metadata técnica estructurada (potencia, tipo de sistema, capacidad recomendada, espacio compatible, tipos de evento).
- La dirección (ciudad/estado) se resuelve por JOIN a `addresses` via `address_id`.

**Tabla `packages`** (vive en Supabase, referenciada en `packagesService.ts`):
```
id, provider_id, title, description, daily_price,
is_published, cover_image_url, gallery_images,
created_at, updated_at, deleted_at
```
- `package_items(id, package_id, listing_id, quantity)` — los ítems son simples referencias a listings.
- Sin campos de: capacidad recomendada, tipo de espacio, tipos de evento, ciudad de cobertura.

**Vista `catalog_items`** (`schema.sql` líneas 262–270):
- UNION de listings + packages para búsqueda unificada.
- Solo proyecta campos básicos; no incluye metadata técnica.

### 1.2 Qué falta y por qué

El algoritmo de matching de Advisory necesita comparar el `TicketRequisitos` contra metadata estructurada de los paquetes. Hoy esa metadata no existe. Se necesitan dos capas de extensión:

| Nivel | Qué falta | Para qué |
|-------|-----------|----------|
| `packages` | Campos de compatibilidad de evento | Filtro previo antes de scoring (ciudad, capacidad, espacio, tipos de evento) |
| `listings` | Specs técnicas por categoría | Scoring técnico (potencia audio, tipo iluminación, tamaño video, etc.) |

### 1.3 Cambios concretos de esquema necesarios

#### Migración A1: Metadata de compatibilidad en `packages`

Añadir directamente a la tabla `packages` (columnas estructuradas, no JSONB, para poder filtrar con índices):

```sql
-- supabase/migrations/20260620_advisory_packages_metadata.sql

ALTER TABLE packages
  ADD COLUMN tipos_evento       TEXT[]  DEFAULT '{}',
  ADD COLUMN capacidad_min      INTEGER,
  ADD COLUMN capacidad_max      INTEGER,
  ADD COLUMN tipo_espacio       TEXT CHECK (tipo_espacio IN ('interior','exterior','ambos')),
  ADD COLUMN ciudad_cobertura   TEXT[]  DEFAULT '{}';

CREATE INDEX idx_packages_tipo_espacio  ON packages(tipo_espacio);
CREATE INDEX idx_packages_capacidad     ON packages(capacidad_min, capacidad_max);
CREATE INDEX idx_packages_ciudad        ON packages USING gin(ciudad_cobertura);
CREATE INDEX idx_packages_tipos_evento  ON packages USING gin(tipos_evento);
```

**Por qué columnas separadas y no JSONB:** el filtro previo (sección 5.1 de la spec) necesita filtrar por ciudad, capacidad y tipo de espacio antes del scoring. Con columnas indexadas eso es un `WHERE` eficiente; con JSONB sería un scan.

#### Migración A2: Metadata técnica por categoría en `listings`

Aquí sí conviene JSONB porque los campos varían completamente según `category`. Se añade una columna única `metadata_tecnica JSONB` a `listings`:

```sql
-- supabase/migrations/20260620_advisory_listings_metadata.sql

ALTER TABLE listings
  ADD COLUMN metadata_tecnica       JSONB DEFAULT '{}',
  ADD COLUMN tipos_evento           TEXT[] DEFAULT '{}',
  ADD COLUMN capacidad_min          INTEGER,
  ADD COLUMN capacidad_max          INTEGER,
  ADD COLUMN tipo_espacio           TEXT CHECK (tipo_espacio IN ('interior','exterior','ambos')),
  ADD COLUMN requiere_personal      BOOLEAN DEFAULT false,
  ADD COLUMN cantidad_personal      INTEGER;

COMMENT ON COLUMN listings.metadata_tecnica IS
  'Specs técnicas específicas por categoría. 
   audio: {potencia_watts_rms, tipo_sistema, incluye_subwoofer, canales_mezcladora, microfonos_incluidos, cobertura_metros}
   lighting: {tipo_iluminacion, cantidad_luminarias, tipo_luminaria, incluye_dmx, incluye_efectos}
   video: {tipo_video, tamano_o_resolucion, brillo_nits}
   escenario: {dimensiones, capacidad_carga, incluye_techo}
   generador: {potencia_kva, autonomia_horas}';
```

**Por qué JSONB para `metadata_tecnica`:** los campos de audio no aplican a iluminación, y viceversa. Una sola columna JSONB evita tablas separadas por categoría (más joins) sin sacrificar la queryabilidad para el scoring (que se hace en TypeScript, no en SQL).

#### Migración A3: Nuevas tablas Advisory

```sql
-- supabase/migrations/20260620_advisory_core_tables.sql

-- ── Tabla de perfil de evento (output del wizard) ──────────────────────────
CREATE TABLE advisory_perfil_evento (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_token     UUID NULL,          -- token anónimo generado en cookie; NULL una vez vinculado a user_id
  tipo_evento       TEXT NOT NULL,
  capacidad_min     INTEGER NOT NULL,
  capacidad_max     INTEGER NOT NULL,
  tipo_espacio      TEXT NOT NULL CHECK (tipo_espacio IN ('interior','exterior','ambos')),
  foco_evento       TEXT NOT NULL CHECK (foco_evento IN ('conversacion','musica_baile','mixto')),
  presupuesto_min   INTEGER NOT NULL,  -- en centavos
  presupuesto_max   INTEGER NOT NULL,
  fecha_evento      DATE,
  ciudad            TEXT NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE advisory_perfil_evento ENABLE ROW LEVEL SECURITY;

-- Usuarios autenticados: acceden a sus propias filas.
CREATE POLICY "advisory_perfil_own" ON advisory_perfil_evento
  FOR ALL USING (auth.uid() = user_id);

-- Sesiones anónimas: acceden vía session_token en header HTTP personalizado.
-- PROBLEMA raíz: auth.uid() devuelve NULL para el rol anon, y en Postgres
-- NULL = NULL evalúa a NULL (no a true), por lo que la policy anterior
-- nunca concede acceso a filas donde user_id IS NULL.
-- SOLUCIÓN: policy separada que lee el token del header "x-advisory-session"
-- que el cliente envía en cada request Supabase mientras no hay sesión.
CREATE POLICY "advisory_perfil_anon_session" ON advisory_perfil_evento
  FOR ALL USING (
    user_id IS NULL
    AND session_token IS NOT NULL
    AND session_token = (
      nullif(current_setting('request.headers', true), '')::json->>'x-advisory-session'
    )::UUID
  );

-- Vinculación retroactiva al hacer login:
-- En auth.onAuthStateChange (o en el callback de login), ejecutar:
--   UPDATE advisory_perfil_evento
--   SET user_id = auth.uid()
--   WHERE session_token = <token_de_cookie> AND user_id IS NULL;
-- Tras el UPDATE la policy "advisory_perfil_own" cubre la fila; el
-- session_token queda como referencia histórica (no se borra).

-- ── Tabla de ticket de requisitos (output del motor de reglas) ─────────────
CREATE TABLE advisory_ticket_requisitos (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  perfil_id         UUID UNIQUE REFERENCES advisory_perfil_evento(id) ON DELETE CASCADE,
  audio             JSONB NOT NULL DEFAULT '{}',
  iluminacion       JSONB NOT NULL DEFAULT '{}',
  video             JSONB NOT NULL DEFAULT '{}',
  escenario         JSONB NOT NULL DEFAULT '{}',
  generador         JSONB NOT NULL DEFAULT '{}',
  reglas_version    TEXT NOT NULL,  -- ej. "v1.0" — qué versión de reglas_config se usó
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE advisory_ticket_requisitos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "advisory_ticket_own" ON advisory_ticket_requisitos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM advisory_perfil_evento p
      WHERE p.id = advisory_ticket_requisitos.perfil_id
        AND (
          p.user_id = auth.uid()
          OR (
            p.user_id IS NULL
            AND p.session_token IS NOT NULL
            AND p.session_token = (
              nullif(current_setting('request.headers', true), '')::json->>'x-advisory-session'
            )::UUID
          )
        )
    )
  );

-- ── Tabla de configuración de reglas (versionada, editable sin código) ──────
CREATE TABLE advisory_reglas_config (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version           TEXT UNIQUE NOT NULL,  -- ej. "v1.0"
  es_activa         BOOLEAN DEFAULT FALSE,
  config            JSONB NOT NULL,         -- todo el árbol de reglas
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE advisory_reglas_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "advisory_reglas_public_read" ON advisory_reglas_config
  FOR SELECT USING (true);  -- lectura pública (solo la config activa se lee en runtime)

-- ── Tabla de recomendaciones generadas ───────────────────────────────────────
CREATE TABLE advisory_recomendacion (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  perfil_id         UUID REFERENCES advisory_perfil_evento(id) ON DELETE CASCADE,
  package_id        UUID REFERENCES packages(id) ON DELETE SET NULL,
  score             NUMERIC(5,2) NOT NULL,
  tier_label        TEXT CHECK (tier_label IN ('economica','recomendada','premium')),
  explicacion       TEXT,
  posicion          INTEGER NOT NULL,  -- orden en el que se mostró (1, 2, 3)
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE advisory_recomendacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "advisory_recomendacion_own" ON advisory_recomendacion
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM advisory_perfil_evento p
      WHERE p.id = advisory_recomendacion.perfil_id
        AND (
          p.user_id = auth.uid()
          OR (
            p.user_id IS NULL
            AND p.session_token IS NOT NULL
            AND p.session_token = (
              nullif(current_setting('request.headers', true), '')::json->>'x-advisory-session'
            )::UUID
          )
        )
    )
  );

-- ── Extensión de conversations para contexto Advisory ─────────────────────
ALTER TABLE conversations
  ADD COLUMN advisory_perfil_id UUID REFERENCES advisory_perfil_evento(id) ON DELETE SET NULL;

CREATE INDEX idx_conversations_advisory ON conversations(advisory_perfil_id)
  WHERE advisory_perfil_id IS NOT NULL;
```

#### Migración A4: Semilla de `advisory_reglas_config` v1.0

```sql
-- supabase/migrations/20260620_advisory_reglas_seed.sql

INSERT INTO advisory_reglas_config (version, es_activa, config) VALUES (
  'v1.0',
  true,
  '{
    "audio": {
      "factores_watts_persona": {
        "interior_conversacion": 2,
        "interior_musica_baile": 5,
        "exterior_conversacion": 4,
        "exterior_musica_baile": 8
      },
      "tiers_potencia": [
        {"label": "bajo",   "max_watts": 2000},
        {"label": "medio",  "max_watts": 5000},
        {"label": "alto",   "max_watts": 10000},
        {"label": "ultra",  "max_watts": null}
      ],
      "subwoofer_desde_tier": "medio"
    },
    "video": {
      "umbral_capacidad_pantalla": 150,
      "brillo_exterior_min_nits": 5000
    },
    "escenario": {
      "tipos_evento_requieren_escenario": ["concierto","boda","conferencia","graduacion"],
      "dimensiones_tiers": {
        "discursos": "4x3",
        "banda_dj":  "6x4",
        "concierto": "10x6"
      }
    },
    "scoring": {
      "pesos": {
        "ajuste_tecnico": 0.55,
        "ajuste_presupuesto": 0.28,
        "reputacion_proveedor": 0.17
      },
      "umbral_minimo_score": 60,
      "_nota": "tier_proveedor eliminado en v1 (providers.tier no existe en schema). Pesos redistribuidos proporcionalmente desde 0.50/0.25/0.15 → 0.55/0.28/0.17. Suma=1.00. Agregar tier_boost como 4to componente cuando providers.tier exista."
    }
  }'
);
```

---

## 2. Estado actual del sistema de mensajería

### 2.1 Cómo funciona hoy

**Tablas core** (`schema.sql` + migración `20260511_decouple_messaging.sql`):
```
conversations(id, booking_id, client_id, provider_id, listing_id, status, created_at)
messages(id, conversation_id, sender_id, content, read, created_at)
conversation_deleted(conversation_id, user_id)
conversation_archived(conversation_id, user_id)
```

La conversación está **desacoplada del booking** (migración 20260511): `booking_id` es nullable, y los participantes se almacenan directamente como `client_id` + `provider_id`. Una conversación también puede referenciar un `listing_id` como contexto opcional.

**Service layer** (`services/messagesService.ts`):
- `getConversations(userId)` — lista enriquecida con nombre de la contraparte, último mensaje, conteo de no leídos.
- `getMessages(conversationId)` — mensajes ordenados.
- `sendMessage(conversationId, content, senderId)` — insert con RLS del user autenticado.
- `archiveConversation / softDeleteConversation` — soft state en tablas separadas.
- **No existe** `createConversation` como función exportada en el service.

**UI** (`app/mensajes/[conversacionId]/page.tsx` + `components/messages/MessagesClient.tsx`):
- Page server component que carga conversaciones + mensajes iniciales.
- `MessagesClient` es client component con real-time via Supabase Realtime.
- No hay ningún concepto de "tarjeta de contexto" hoy.

**Cómo se inician conversaciones hoy:**
- Desde `app/listings/[id]/ListingActions.tsx` (botón "Contactar al proveedor").
- Desde `app/packages/[id]/PackageActions.tsx` (similar).
- El INSERT en `conversations` se hace inline en el componente / server action.

### 2.2 Cómo se inyecta la tarjeta de contexto Advisory (sección 6 de la spec)

**Cambio mínimo:** la columna `advisory_perfil_id` añadida en Migración A3 es el ancla. No se necesita una columna `context_card` separada — la tarjeta se construye en runtime haciendo JOIN de `advisory_perfil_evento` + `advisory_ticket_requisitos` + `advisory_recomendacion`.

**Flujo concreto:**

1. Cliente completa el wizard → se crea `advisory_perfil_evento` + `advisory_ticket_requisitos`.
2. Cliente ve resultados y hace clic en "Reservar" sobre una opción.
3. Se llama a `createConversationFromAdvisory(perfilId, packageId)` (nueva función en `messagesService.ts`):
   - Obtiene `provider_id` del paquete.
   - Crea fila en `conversations` con `client_id`, `provider_id`, `listing_id = null`, `advisory_perfil_id = perfilId`.
   - Inserta un primer mensaje "sistema" (no editable) con el resumen del perfil como texto estructurado.
4. La página de conversación detecta `advisory_perfil_id` en la conversación y renderiza la `ContextCard` encima de los mensajes.

**Archivos afectados:**
- `services/messagesService.ts` — añadir `createConversationFromAdvisory(perfilId, packageId): Promise<string>` (devuelve conversationId).
- `components/messages/MessagesClient.tsx` — añadir bloque condicional que renderiza `<AdvisoryContextCard />` si la conversación tiene `advisory_perfil_id`.
- `app/mensajes/[conversacionId]/page.tsx` — en el `getConversations`, también traer `advisory_perfil_id` + el perfil completo si existe.

**Diseño de `<AdvisoryContextCard />`** (nuevo componente):
```
┌────────────────────────────────────────────────────┐
│ 🎯 Solicitud generada por ArtRider Advisory        │
│                                                    │
│ Tipo de evento:    Boda          Capacidad: 150-300│
│ Espacio:           Interior      Foco: Música/Baile│
│ Fecha:             15 Jul 2026   Ciudad: Quito     │
│                                                    │
│ Requisitos detectados:                             │
│  • Audio: Tier alto (>5000W), con subwoofer        │
│  • Iluminación: Efectos + ambiental                │
│  • Sin pantalla requerida                          │
│  • Escenario: 6×4 recomendado                      │
│                                                    │
│ Presupuesto declarado: $500 – $1,200               │
└────────────────────────────────────────────────────┘
```
- No editable. Visible para cliente y proveedor.
- Colapsable en móvil (default: colapsada después del primer scroll).

---

## 3. Propuesta: motor de reglas y algoritmo de matching

### 3.1 Dónde vive el motor de reglas

**Decisión: TypeScript en Next.js (server actions), NO Edge Functions de Supabase.**

Razones:
- Las reglas ya están en Supabase (`advisory_reglas_config`), pero su ejecución es puramente computacional (sin acceso a datos externos). No hay ventaja en una Edge Function.
- El wizard ya vive en Next.js. Mantener el motor en el mismo proceso evita una llamada HTTP extra.
- Es más fácil de testear y debuggear en TypeScript que en Deno.
- Si el volumen escala, se puede mover a una Edge Function sin cambiar la interfaz.

**Ubicación:** `services/advisoryService.ts` (nuevo archivo).

### 3.2 Estructura del motor

```typescript
// services/advisoryService.ts

// ── 1. Cargar reglas activas ──
async function getActiveRules(): Promise<ReglasConfig>

// ── 2. Motor de reglas: PerfilEvento → TicketRequisitos ──
function applyRules(perfil: PerfilEvento, reglas: ReglasConfig): TicketRequisitos

// ── 3. Filtro previo de paquetes candidatos ──
async function getCandidatePackages(perfil: PerfilEvento): Promise<PackageWithMetadata[]>

// ── 4. Scoring de un paquete individual ──
function scorePackage(
  pkg: PackageWithMetadata,
  ticket: TicketRequisitos,
  perfil: PerfilEvento,
  reglas: ReglasConfig
): { score: number; breakdown: ScoreBreakdown }

// ── 5. Generación de explicación ──
function generateExplanation(
  pkg: PackageWithMetadata,
  ticket: TicketRequisitos,
  score: number,
  tierLabel: TierLabel
): string

// ── 6. Orquestador principal ──
export async function runAdvisory(
  perfil: PerfilEvento
): Promise<{ ticket: TicketRequisitos; recomendaciones: Recomendacion[] }>
```

### 3.2.1 Nota sobre `catalog_items` y Advisory

`getCandidatePackages()` consulta la tabla `packages` directamente — no a través de la vista `catalog_items`. La vista (`schema.sql` líneas 262–270) solo proyecta campos básicos (`id`, `item_type`, `provider_id`, `title`, `category`, `cover_image_url`, `daily_price`, `description`, `is_published`, `created_at`) y no incluye ninguno de los campos de metadata de Advisory añadidos en Migración A1. El filtro previo por ciudad, capacidad y tipo de espacio se hace con `WHERE` directo sobre `packages` usando los índices de A1. **No es necesario modificar `catalog_items` en v1;** la vista sigue funcionando igual para el catálogo público.

### 3.3 Algoritmo de scoring (detalle)

```typescript
function scorePackage(pkg, ticket, perfil, reglas): { score: number } {

  // Componente 1: Ajuste técnico (peso 0.50)
  // Para cada categoría del TicketRequisitos que sea requerida,
  // verificar si los listings del paquete la cubren con tier >= requerido.
  const tecnico = calcularAjusteTecnico(pkg.items, ticket);
  // Resultado: 0–100 (100 = cubre todo exactamente o mejor)

  // Componente 2: Ajuste de presupuesto (peso 0.25)
  // price dentro del rango: 100; debajo: 90; encima hasta 20%: 50; encima +20%: 0
  const presupuesto = calcularAjustePresupuesto(pkg.daily_price, perfil.presupuesto_min, perfil.presupuesto_max);

  // Componente 3: Reputación (peso 0.17 en v1)
  // avg_rating/5 * 100, ponderado por cantidad de reviews (mínimo fiable: 3)
  const reputacion = calcularReputacion(pkg.provider.avg_rating, pkg.provider.review_count);

  // Componente 4: Tier proveedor — ELIMINADO en v1.
  // La tabla providers (schema.sql líneas 60–68) no tiene campo tier;
  // solo contiene: id, user_id, brand_name, bio, status, created_at.
  // El peso 0.10 fue redistribuido proporcionalmente entre los 3 componentes
  // restantes (ver Migración A4). Queda como mejora futura cuando se agregue
  // providers.tier al esquema.

  const pesos = reglas.scoring.pesos;
  const score =
    tecnico * pesos.ajuste_tecnico +
    presupuesto * pesos.ajuste_presupuesto +
    reputacion * pesos.reputacion_proveedor;
  // pesos v1: ajuste_tecnico=0.55 + ajuste_presupuesto=0.28 + reputacion_proveedor=0.17 = 1.00

  return { score: Math.round(score) };
}
```

### 3.4 Dónde vive `advisory_reglas_config`

La tabla está en Supabase (`advisory_reglas_config`). En runtime:

1. `advisoryService.ts` carga la fila con `es_activa = true` en cada llamada a `runAdvisory`.
2. Para evitar que cambie mid-session, el resultado incluye `reglas_version` y se guarda en `advisory_ticket_requisitos.reglas_version`.
3. Un admin puede crear una nueva fila con versión `v1.1` y marcarla como activa; las sesiones nuevas la usarán automáticamente.

**Sin caché en el servidor** para la config: las reglas son ~1KB de JSON, y el overhead de releerlas es mínimo vs. el riesgo de servir versión desactualizada.

---

## 4. Diseño del Wizard (nueva UI)

### 4.1 Ruta y estructura

```
app/
  advisory/
    page.tsx                    ← Server component (autenticación, seed de perfil vacío)
    resultados/
      page.tsx                  ← Server component (carga recomendaciones)
components/
  features/
    advisory/
      AdvisoryWizard.tsx        ← Client component (5 pasos, estado local)
      AdvisoryStepTipoEvento.tsx
      AdvisoryStepCapacidad.tsx
      AdvisoryStepEspacio.tsx
      AdvisoryStepFoco.tsx
      AdvisoryStepPresupuesto.tsx
      AdvisoryStepFechaYCiudad.tsx
      AdvisoryResultCard.tsx    ← Tarjeta de resultado (Económica/Recomendada/Premium)
      AdvisoryContextCard.tsx   ← Tarjeta de contexto en mensajes
```

### 4.2 Componentes reutilizables del proyecto actual

| Componente actual | Se reutiliza en Advisory | Cómo |
|---|---|---|
| `ListingFormWizard.tsx` | Patrón de step navigation | Copiar la lógica de `step`, `setStep`, barra de progreso |
| `PackageFormWizard.tsx` | Patrón de validación por paso | Misma estructura `errors` por campo |
| `components/ui/button.tsx` | Botones de las opciones del wizard | Sin cambios |
| `components/layout/Navbar.tsx` | Header de las páginas /advisory | Sin cambios |
| `components/ui/ScrollableCarousel.tsx` | Carrusel de tarjetas de resultado | Sin cambios |
| `app/mensajes/[conversacionId]/page.tsx` | Destino tras "Reservar" | Con parámetro `?advisory=true` |

### 4.3 Diseño de pasos del wizard

```
Paso 1/5 — Tipo de evento
  [ Boda ] [ Fiesta privada ] [ Corporativo ]
  [ Concierto ] [ Graduación ] [ Conferencia ]
  → Selección única, botones grandes con ícono

Paso 2/5 — Número de asistentes
  [ Menos de 50 ] [ 50 – 150 ] [ 150 – 300 ] [ Más de 300 ]
  → Selección única, cards con rango

Paso 3/5 — Espacio y foco
  Espacio: [ Interior ] [ Exterior ] [ Mixto ]
  Foco:    [ Conversación ] [ Música/Baile ] [ Mixto ]
  → Dos grupos de selección única en una sola pantalla

Paso 4/5 — Presupuesto
  [ Hasta $300 ] [ $300 – $700 ] [ $700 – $1,500 ] [ Más de $1,500 ]
  → Rangos en moneda local (USD para Ecuador)

Paso 5/5 — Fecha y ciudad
  Fecha del evento: [DatePicker reutilizable de BookingCalendar]
  Ciudad: [ Quito ] [ Guayaquil ] [ Cuenca ] [ Otra ]
  → La ciudad determina el filtro geográfico de paquetes
```

### 4.4 Server action del wizard

```typescript
// app/advisory/actions.ts
"use server";

export async function submitAdvisoryWizard(
  _prev: unknown,
  formData: FormData
): Promise<{ perfilId?: string; error?: string }> {
  // 1. Validar campos
  // 2. INSERT en advisory_perfil_evento
  // 3. Ejecutar runAdvisory(perfil) → { ticket, recomendaciones }
  // 4. INSERT en advisory_ticket_requisitos
  // 5. INSERT en advisory_recomendacion (múltiples filas)
  // 6. Retornar perfilId → el cliente redirige a /advisory/resultados?p=<perfilId>
}
```

### 4.5 Página de resultados (`/advisory/resultados`)

- Carga las filas de `advisory_recomendacion` para el `perfilId` del query param.
- Muestra 2–3 tarjetas `AdvisoryResultCard` con tier label (Económica / Recomendada / Premium).
- Botón "Reservar" en cada tarjeta → llama a `createConversationFromAdvisory(perfilId, packageId)` → redirect a `/mensajes/<conversationId>`.
- Si `score < umbral_minimo` para todas → banner "Estas son las opciones más cercanas disponibles" (sin cambiar la lógica de las tarjetas).

---

## 5. Plan de fases

### Fase A — Antes del algoritmo: cambios de datos y esquema

**Objetivo:** tener el esquema listo y los formularios de proveedor capturando la nueva metadata, antes de escribir una línea del motor de matching.

| # | Tarea | Archivos afectados | Dependencia |
|---|---|---|---|
| A1 | Ejecutar migración A1: columnas de compatibilidad en `packages` | `supabase/migrations/20260620_advisory_packages_metadata.sql` | — |
| A2 | Ejecutar migración A2: `metadata_tecnica` + columnas en `listings` | `supabase/migrations/20260620_advisory_listings_metadata.sql` | — |
| A3 | Ejecutar migración A3: tablas nuevas Advisory + columna en `conversations` | `supabase/migrations/20260620_advisory_core_tables.sql` | A1, A2 |
| A4 | Ejecutar migración A4: semilla de `advisory_reglas_config` v1.0 | `supabase/migrations/20260620_advisory_reglas_seed.sql` | A3 |
| A5 | Actualizar tipos TypeScript de `Listing` en `listingsService.ts` | `services/listingsService.ts` (añadir `metadata_tecnica`, `tipos_evento`, `capacidad_min`, etc. al tipo `Listing`) | A2 |
| A6 | Actualizar tipos TypeScript de `Package` en `packagesService.ts` | `services/packagesService.ts` (añadir `tipos_evento`, `capacidad_min/max`, `tipo_espacio`, `ciudad_cobertura` al tipo `Package`) | A1 |
| A7 | Añadir paso de metadata al formulario `ListingFormWizard.tsx` | `components/features/listings/ListingFormWizard.tsx` (nuevo paso 2 entre Categoría y Detalles; campos dinámicos según `category`) | A2, A5 |
| A8 | Actualizar server action de create/update listing | `app/provider/catalog/new/page.tsx`, `app/provider/catalog/[id]/edit/EditListingClient.tsx`, `services/listingsService.ts` (`createListing`, `updateListing`) | A7 |
| A9 | Añadir paso de metadata de evento al `PackageFormWizard.tsx` | `components/features/listings/PackageFormWizard.tsx` (nuevo paso para tipos_evento, capacidad, espacio, ciudad_cobertura) | A1, A6 |
| A10 | Actualizar server actions de create/update package | `services/packagesService.ts` (`createPackage`, `updatePackage`) | A9 |
| A11 | Poblar metadata mínima en listings/packages existentes (data migration manual) | Script SQL o seed manual vía Supabase dashboard | A1, A2 |

**Criterio de salida de Fase A:** los proveedores pueden subir nueva metadata, la vista `catalog_items` sigue funcionando, y las tablas Advisory existen con la semilla de reglas.

---

### Fase B — Durante: construcción del módulo Advisory

**Objetivo:** wizard funcional → ticket de requisitos → recomendaciones mostradas al cliente.

| # | Tarea | Archivos afectados | Dependencia |
|---|---|---|---|
| B1 | Crear `services/advisoryService.ts` con tipos base | `services/advisoryService.ts` (nuevo) | A4 (reglas_config) |
| B2 | Implementar `getActiveRules()` | `services/advisoryService.ts` | B1 |
| B3 | Implementar `applyRules()` — motor de reglas completo | `services/advisoryService.ts` | B2 |
| B4 | Implementar `getCandidatePackages()` — filtro previo con Supabase | `services/advisoryService.ts` | A1, A6 |
| B5 | Implementar `scorePackage()` + `generateExplanation()` | `services/advisoryService.ts` | B3, B4 |
| B6 | Implementar `runAdvisory()` orquestador + persistencia | `services/advisoryService.ts` | B5 |
| B7 | Crear server action `submitAdvisoryWizard` | `app/advisory/actions.ts` (nuevo) | B6, A3 |
| B8 | Crear componentes UI del wizard | `components/features/advisory/AdvisoryWizard.tsx` + pasos individuales (nuevos) | — |
| B9 | Crear `app/advisory/page.tsx` (server component) | `app/advisory/page.tsx` (nuevo) | B7, B8 |
| B10 | Crear `components/features/advisory/AdvisoryResultCard.tsx` | `components/features/advisory/AdvisoryResultCard.tsx` (nuevo) | — |
| B11 | Crear `app/advisory/resultados/page.tsx` | `app/advisory/resultados/page.tsx` (nuevo) | B9, B10 |
| B12 | Añadir enlace "Planifica tu evento" en Navbar / Home | `components/layout/Navbar.tsx`, `app/page.tsx` o `components/features/home/LandingHero.tsx` | B9 |

**Criterio de salida de Fase B:** un usuario puede completar el wizard, ver 2–3 recomendaciones con score y tier label, y la data se persiste en Supabase.

---

### Fase C — Después: integración con flujo de reserva/contacto

**Objetivo:** el botón "Reservar" en resultados abre una conversación con tarjeta de contexto visible para cliente y proveedor.

| # | Tarea | Archivos afectados | Dependencia |
|---|---|---|---|
| C1 | Añadir `createConversationFromAdvisory()` en `messagesService.ts` | `services/messagesService.ts` | A3 (columna `advisory_perfil_id`) |
| C2 | Conectar botón "Reservar" de `AdvisoryResultCard` a `createConversationFromAdvisory` | `components/features/advisory/AdvisoryResultCard.tsx`, `app/advisory/resultados/page.tsx` | C1, B10 |
| C3 | Crear `components/features/advisory/AdvisoryContextCard.tsx` | `components/features/advisory/AdvisoryContextCard.tsx` (nuevo) | — |
| C4 | Modificar `getConversations()` para incluir `advisory_perfil_id` + JOIN a perfil | `services/messagesService.ts` (actualizar `ConversationSummary` type y query) | C3 |
| C5 | Renderizar `<AdvisoryContextCard />` en `MessagesClient.tsx` | `components/messages/MessagesClient.tsx` (bloque condicional sobre los mensajes) | C3, C4 |
| C6 | Actualizar `app/mensajes/[conversacionId]/page.tsx` para pasar advisory context | `app/mensajes/[conversacionId]/page.tsx` | C4, C5 |
| C7 | RLS para `advisory_recomendacion` — el proveedor del paquete puede leer las que le conciernen | `supabase/migrations/20260620_advisory_core_tables.sql` (añadir política adicional) | A3 |
| C8 | Analítica básica: registrar cuántas conversaciones nacieron de Advisory | Puede ser campo `source TEXT` en `conversations` o simplemente inferirse del `advisory_perfil_id` existente | C1 |

**Criterio de salida de Fase C:** el flujo end-to-end funciona — wizard → ticket → recomendaciones → conversar con proveedor con tarjeta de contexto visible.

---

## 6. Dependencias entre tareas

```
A1, A2
  └─→ A3
        └─→ A4 (seed)
A2 → A5 → A7 → A8
A1 → A6 → A9 → A10
A3, A4 → B1 → B2 → B3
A1, A6 → B4
B3, B4 → B5 → B6 → B7
B7, B8 → B9 → B11 → B12
B10 → B11
A3 → C1 → C2 ← B10
C3, C4 → C5 → C6
```

**Camino crítico:** `A1 → A2 → A3 → A4 → B1 → B2 → B3 + B4 → B5 → B6 → B7 → B9 → B11 → C2 → C5`

Las tareas de UI del wizard (B8, B10) y los componentes de mensajería (C3) pueden paralelizarse con las tareas del service layer.

---

## Notas de implementación

### Categorías de listings y el wizard

El campo `category` actual en `listings` usa: `audio | lighting | video | effects | other | advertising`.
La spec Advisory usa: `audio | iluminacion | video | escenario | mobiliario | generador | personal_tecnico | otros`.
En Fase A, el mapping es:
- `audio` → `audio`
- `lighting` → `iluminacion`
- `video` → `video`
- `effects` → subcategoría dentro de `iluminacion.incluye_efectos`
- `other` → puede mapearse a `escenario`, `generador`, etc. via `metadata_tecnica.subcategoria`

No cambiar el `category` ENUM existente — solo añadir `metadata_tecnica.subcategoria` para mayor granularidad.

### Disponibilidad de fechas

La spec menciona filtrar por disponibilidad de fecha. El sistema de `availability_calendar` actual es por `equipment_unit_id` (no por `package_id`). En Fase B, el filtro de disponibilidad puede ser simplificado: si la `fecha_evento` cae en un rango donde todos los `equipment_units` de los listings del paquete tienen `status = AVAILABLE` → paquete candidato. Implementación completa queda como mejora post-v1.

### Autenticación en el wizard

El wizard debe funcionar **sin login** (para reducir fricción) hasta el paso 5. Al hacer clic en "Ver recomendaciones":

- **Con sesión:** se guarda `advisory_perfil_evento` con `user_id = auth.uid()` y `session_token = NULL`. La policy `advisory_perfil_own` cubre el acceso.
- **Sin sesión:** se genera un `session_token` UUID en el cliente (guardado en cookie `artrider-advisory-session`). Se inserta `advisory_perfil_evento` con `user_id = NULL` y `session_token = <uuid>`. El cliente incluye el header `x-advisory-session: <uuid>` en cada request Supabase. La policy `advisory_perfil_anon_session` (Migración A3) lee ese header vía `current_setting('request.headers')` para autorizar el acceso.

**Vinculación retroactiva al hacer login:** en `auth.onAuthStateChange` (o en el server action del callback OAuth), ejecutar:
```sql
UPDATE advisory_perfil_evento
SET user_id = <uid_del_nuevo_login>
WHERE session_token = <token_de_cookie> AND user_id IS NULL;
```
Tras el `UPDATE`, la policy `advisory_perfil_own` cubre la fila; el `session_token` queda como referencia histórica.

> Las RLS de `advisory_ticket_requisitos` y `advisory_recomendacion` también incluyen el mismo chequeo de `session_token` (vía JOIN a `advisory_perfil_evento`), por lo que el mecanismo anónimo funciona de extremo a extremo sin cambios adicionales en esas tablas.
