# Product Requirements Document (PRD) - ArtRider

## 1. Resumen Ejecutivo y Visión
**ArtRider** es un marketplace bilateral (estilo Airbnb) destinado a la industria de eventos y música. Resuelve el cuello de botella logístico y la falta de confianza en el alquiler de equipos creativos (sonido, luces, instrumentos). Centraliza catálogos, gestiona pagos seguros e implementa un sistema automatizado de contratos digitales y seguros de alquiler.

* **Equipo de Desarrollo:** 4 desarrolladores.
* **Herramienta de Desarrollo:** Antigravity.
* **Enfoque:** Alta seriedad, despliegue global, optimización de costos de infraestructura y escalabilidad técnica estricta.

## 2. Stack Tecnológico y Arquitectura
El sistema debe construirse respetando el siguiente stack técnico para garantizar eficiencia operativa:
* **Frontend:** Next.js (App Router), Tailwind CSS y Shadcn/UI.
* **Backend / BaaS:** Supabase (PostgreSQL, Auth, Storage, Edge Functions).
* **ORM:** Prisma o Drizzle (estrictamente Type-safe).
* **Pagos e Identidad:** Stripe Connect (pagos y depósitos) y Stripe Identity (KYC).
* **Seguridad de Base de Datos:** Uso de **UUIDs** para todas las PK/FK expuestas, Row Level Security (RLS) activo en Supabase y *Soft Deletes* (borrado lógico mediante `deleted_at`).

## 3. Reglas de Negocio Críticas (Innegociables)
Al programar las funciones, la IA y los desarrolladores deben respetar obligatoriamente estas lógicas:

1. **Lógica de Contratos Estricta:** El flujo de firmas es asíncrono. Ninguna reserva puede pasar al estado `ACTIVE` si el contrato (`Contract`) no está en estado `EXECUTED` (firmado por dueño y cliente).
2. **Trazabilidad Legal del Hardware:** La identificación legal del equipo se basa exclusivamente en el **Número de Serie** (`serial_number` en `EquipmentUnit`). Este número debe inyectarse automáticamente en la generación del PDF del contrato.
3. **Seguridad Financiera y Depósitos:** Las reservas requieren un flujo de "Autorización y Captura" en Stripe. Se debe bloquear el "Depósito de Garantía" al momento de la reserva y capturarlo/liberarlo solo tras la inspección de devolución.
4. **Congelación de Precios:** Los precios históricos son sagrados. Toda reserva guarda un `locked_price` en `BookingItem` para ser inmune a cambios futuros en el precio del `Listing`.
5. **Logística Independiente:** Las publicaciones (`Listing`) utilizan una tabla `Address` independiente. El lugar donde se recoge el equipo no tiene por qué ser la dirección fiscal del dueño. Frontend debe prever integración con mapas (Mapbox/Google Maps usando `latitude` y `longitude`).

---

## 4. Arquitectura de Datos Detallada (Entity-Relationship)
*Nota para el agente de IA: Utiliza esta estructura exacta para generar los esquemas de Prisma/Drizzle. Asume UUIDs para los tipos `id` en producción, aunque conceptualmente se entiendan como PK.*

### 4.1. Identity & Security (Usuarios y KYC)
* **User:** * `id` (PK, UUID), `email` (UK), `password_hash`, `full_name`, `birth_date`, `phone`, `account_type` (ENUM: `ADMIN`, `OWNER`, `CLIENT`), `stripe_customer_id` (UK), `avatar_url`, `created_at`, `updated_at`, `deleted_at` (Soft delete).
* **IdentityVerification:** * `id` (PK), `user_id` (FK), `provider_ref` (Stripe Identity ID), `status` (ENUM: `PENDING`, `VERIFIED`, `REJECTED`), `verified_at`.
* **Address:** * `id` (PK), `user_id` (FK), `label` (Ej: Home, Warehouse), `street_address`, `city`, `state_province`, `country_code` (ISO 3166-1), `postal_code`, `latitude` (Float), `longitude` (Float).

### 4.2. Global Catalog & Listings (Catálogo y Ofertas)
* **Category:**
  * `id` (PK), `name` (Ej: Audio, Lighting), `slug` (UK), `icon_url`.
* **CatalogProduct:** (Catálogo global estandarizado)
  * `id` (PK), `category_id` (FK), `brand`, `model`, `global_description`, `technical_specs` (JSONB).
* **Listing:** (Publicación específica del dueño)
  * `id` (PK), `owner_id` (FK), `catalog_product_id` (FK), `custom_title`, `owner_notes`, `price_per_day` (Decimal), `replacement_value` (Decimal, base para seguro), `address_id` (FK), `is_active` (Boolean), `created_at`, `deleted_at`.
* **ListingPhoto:**
  * `id` (PK), `listing_id` (FK), `url`, `sort_order` (Int).

### 4.3. Inventory & Availability (Inventario Físico)
* **EquipmentUnit:** (El hardware real)
  * `id` (PK), `listing_id` (FK), `serial_number` (UK, Crítico para contratos), `condition` (ENUM: `NEW`, `GOOD`, `FAIR`), `internal_status` (ENUM: `AVAILABLE`, `RENTED`, `MAINTENANCE`), `created_at`.
* **AvailabilityCalendar:** (Evita overbooking)
  * `id` (PK), `equipment_unit_id` (FK), `start_date`, `end_date`, `status` (ENUM: `BOOKED`, `BLOCKED`, `MAINTENANCE`), `booking_id` (FK, Null si es bloqueo manual).

### 4.4. Bundles (Paquetes de Equipos)
* **Package:** * `id` (PK), `owner_id` (FK), `name`, `package_price_per_day` (Decimal), `is_active` (Boolean).
* **PackageItem:**
  * `id` (PK), `package_id` (FK), `listing_id` (FK), `quantity` (Int).

### 4.5. Transactional Engine (Motor de Reservas)
* **Booking:**
  * `id` (PK), `booking_code` (UK), `client_id` (FK), `owner_id` (FK), `start_date`, `end_date`, `total_days` (Int), `subtotal` (Decimal), `platform_fee` (Decimal), `insurance_fee` (Decimal), `total_amount` (Decimal), `status` (ENUM: `AWAITING_SIGNATURES`, `PAID`, `ACTIVE`, `COMPLETED`, `DISPUTE`), `created_at`.
* **BookingItem:** (Congela el precio transaccional)
  * `id` (PK), `booking_id` (FK), `listing_id` (FK), `package_id` (FK, Nullable), `equipment_unit_id` (FK, asigna el Serial Number exacto), `locked_price` (Decimal).

### 4.6. Legal & Finances (Contratos, Pagos y Seguros)
* **Contract:** (Flujo de firmas asíncronas)
  * `id` (PK), `booking_id` (FK), `version` (Ej: v1.0-2025).
  * Firmas: `owner_signed_at`, `owner_signature_hash`, `owner_pdf_url`, `client_signed_at`, `client_signature_hash`, `client_pdf_url`.
  * `status` (ENUM: `PENDING`, `PARTIALLY_SIGNED`, `EXECUTED`).
* **Payment:**
  * `id` (PK), `booking_id` (FK), `stripe_id` (PaymentIntent ID), `status` (ENUM: `AUTHORIZED`, `CAPTURED`, `REFUNDED`), `security_deposit_amount` (Decimal), `created_at`.
* **InsurancePolicy:**
  * `id` (PK), `booking_id` (FK), `policy_number` (UK), `provider`, `status` (ENUM: `ACTIVE`, `CLAIM_OPEN`, `CLOSED`).

### 4.7. Communication & Feedback (Mensajería y Reseñas)
* **Conversation:**
  * `id` (PK), `booking_id` (FK, opcional/nullable para preguntas pre-reserva), `created_at`.
* **Message:**
  * `id` (PK), `conversation_id` (FK), `sender_id` (FK), `content` (Text), `sent_at`.
* **Review:**
  * `id` (PK), `booking_id` (FK), `author_id` (FK), `target_id` (FK), `rating` (Int 1-5), `comment` (Text), `created_at`.

---

## 5. Casos de Uso Principales a Implementar (Flujo)
1. **Onboarding & KYC:** Registro de usuario -> Verificación de identidad con Stripe Identity -> Alta de direcciones (`Address`).
2. **Creación de Inventario:** Selección de `CatalogProduct` -> Creación de `Listing` -> Registro de `EquipmentUnit` (exigiendo `serial_number`).
3. **Flujo de Reserva Seguro:** El cliente selecciona fechas -> El sistema verifica `AvailabilityCalendar` -> Se genera el `Booking` y `BookingItem` con precio congelado -> Se procesa la autorización de pago en Stripe (incluyendo depósito).
4. **Flujo de Contrato:** Generación del PDF con inyección de datos -> Firma asíncrona (Dueño y Cliente) -> Cambio de `Contract.status` a `EXECUTED` -> Transición del `Booking` a `ACTIVE`.
5. **Cierre de Ciclo:** Devolución del equipo -> Inspección -> Captura de fondos/liberación de depósito en Stripe -> Generación de `Review` bilateral.


## 6. Fases de Desarrollo (Roadmap sugerido para 4 desarrolladores)
Para mantener el foco y lanzar de manera eficiente, el desarrollo se dividirá en las siguientes fases (Sprints/Milestones):

### Fase 1: Core Foundation & Identity 
* Configuración del proyecto base en Antigravity con Next.js y Supabase.
* Implementación de autenticación completa (Supabase Auth).
* Diseño e implementación del esquema de base de datos (Prisma/Drizzle).
* Flujo de Onboarding de usuarios (Arrendador/Arrendatario) e integración básica de Stripe Identity (KYC).

### Fase 2: Inventario y Catálogo 
* CRUD del `CatalogProduct` (solo administradores por ahora).
* Flujo de creación de `Listing` para los dueños, incluyendo carga de fotos a Supabase Storage.
* Gestión de `EquipmentUnit` y validación obligatoria del `serial_number`.
* Interfaz de búsqueda y filtros con soporte de mapas (integración básica de Mapbox o Google Maps usando `Address`).

### Fase 3: Motor Transaccional y Disponibilidad 
* Lógica del `AvailabilityCalendar` para prevenir reservas duplicadas.
* Creación de la vista de reserva y cálculo de totales (Subtotal, comisiones, seguro).
* Integración profunda con Stripe Connect (flujo de Autorización para el depósito de garantía y Captura post-devolución).

### Fase 4: Legal, Logística y Comunicación 
* Generación automática de PDFs del `Contract` inyectando los datos del usuario y el `serial_number`.
* Sistema de firmas digitales asíncronas con validación de estado (`PENDING` -> `EXECUTED`).
* Implementación del sistema de mensajería (`Conversation` / `Message`) en tiempo real (Supabase Realtime).

### Fase 5: QA, Testing y Lanzamiento 
* Pruebas de estrés en el flujo de pagos y contratos.
* Revisión de las políticas de seguridad de Row Level Security (RLS).
* Despliegue en producción (Vercel para Next.js, Supabase Production project).

---

## 7. Requisitos No Funcionales (NFRs)
* **Rendimiento:** Las búsquedas del catálogo y la carga del mapa deben responder en menos de 800ms. Las imágenes deben estar optimizadas (Next/Image) para no penalizar el LCP (Largest Contentful Paint).
* **Seguridad (RLS):** Nadie excepto el dueño y el cliente involucrado en un `Booking` puede acceder a la URL del PDF del `Contract` o a los mensajes de la `Conversation`. Los administradores tienen acceso global.
* **Cumplimiento Financiero:** ArtRider no almacena datos de tarjetas de crédito. Toda la tokenización y cumplimiento PCI-DSS se delega completamente a Stripe.
* **Escalabilidad:** El uso de UUIDs previene cuellos de botella en la generación de IDs y el backend Serverless/Edge de Supabase debe permitir escalar los picos de tráfico de fin de semana (temporada alta de eventos).

---

## 8. Gestión de Riesgos y Mitigación
| Riesgo | Impacto | Estrategia de Mitigación (Técnica/Negocio) |
| :--- | :--- | :--- |
| **Robo o daño irreparable del equipo** | Alto | Retención obligatoria en tarjeta de crédito + Póliza de seguro obligatoria (`InsurancePolicy`). El equipo debe estar verificado por `serial_number`. |
| **Fraude de identidad** | Alto | KYC obligatorio con biometría mediante Stripe Identity antes de permitir la primera reserva o publicación. |
| **Overbooking (Reservas cruzadas)** | Medio | Transacciones de base de datos atómicas al escribir en `AvailabilityCalendar` y bloqueos de fechas instantáneos en la interfaz. |
| **Disputas por estado del equipo** | Medio | Flujo obligatorio de subida de fotos por parte de ambas partes en el momento de la entrega y en la devolución antes de liberar la retención. |

---

## 9. Fuera de Alcance para el MVP (Out of Scope)
Para garantizar que el equipo de 4 personas pueda despachar a tiempo y dentro del presupuesto, los siguientes elementos **NO** se incluirán en la versión inicial (v1.0):
* Aplicación móvil nativa (iOS/Android). La plataforma será estrictamente una Web App Responsiva (PWA opcional).
* Algoritmos de "Precios Dinámicos" (Dynamic Pricing) automatizados. Los precios los fija el dueño manualmente.
* Suscripciones premium para dueños (Se monetizará exclusivamente mediante el `platform_fee` por transacción).
* Integración con calendarios externos (Google Calendar/iCal sync) de forma bidireccional (se manejará solo dentro del ecosistema de ArtRider por ahora).

## 10. Directrices de UI/UX (Experiencia de Usuario)
Dado que el equipo no desarrollará aplicaciones nativas para el MVP y utilizará **Tailwind CSS + Shadcn/UI**, la interfaz debe guiarse por los siguientes principios:
* **Mobile-First Estricto:** La mayoría de los organizadores y DJs estarán en movimiento (en eventos, bodegas o estudios) al momento de buscar equipos o firmar contratos de recepción. La experiencia móvil a través del navegador web debe ser impecable y fluida.
* **Transparencia de Estados:** El estado de un `Booking` y de su `Contract` asociado debe ser visible en todo momento mediante componentes de UI claros (badges o steppers en Shadcn). El usuario nunca debe preguntarse "¿Qué falta para que mi reserva se apruebe?".
* **Fricción Positiva en Acciones Críticas:** Al firmar el contrato digital o autorizar el pago del depósito de garantía, la UI debe incluir modales de confirmación claros que expliquen las implicaciones legales y financieras antes del "click" final.

## 11. Analítica y Monitoreo (Medición de KPIs)
Para medir el éxito del MVP con un presupuesto limitado, se implementará un stack de analítica ligero pero efectivo:
* **Monitoreo de Errores Frontend/Backend:** Sentry (o similar) para capturar fallos silenciosos en la firma de contratos o en el flujo de pagos de Stripe.
* **Analítica de Producto:** Herramientas orientadas a eventos (como PostHog, de código abierto, o Vercel Analytics) para rastrear:
  * Drop-off (abandono) en el flujo de KYC (Identidad).
  * Tasa de conversión desde la visualización de un `Listing` hasta el pago completado.
  * Uso real del mapa interactivo vs. búsqueda por texto.

## 12. Visión a Futuro (Post-MVP / v2.0)
Una vez validado el modelo de negocio y estabilizada la versión 1.0, el equipo evaluará implementar las siguientes características para escalar la plataforma:
* **Precios Dinámicos (Dynamic Pricing):** Sugerencias de precios automatizadas basadas en la demanda local (ej. subir precios durante festivales de música masivos en la ciudad).
* **Integración de Logística de Terceros:** Conexión con servicios de paquetería de última milla (Uber Direct, Cabify Logistics) para que ArtRider gestione no solo el alquiler, sino el transporte físico del equipo de puerta a puerta.
* **Aplicación Nativa (React Native/Expo):** Transición de la PWA a una app nativa en iOS/Android para aprovechar notificaciones push enriquecidas y acceso a la cámara offline para el escaneo de números de serie (`serial_number`) mediante códigos QR.

