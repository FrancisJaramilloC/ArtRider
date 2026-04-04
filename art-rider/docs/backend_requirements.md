# Análisis de Requisitos de Backend: ArtRider (Fase Frontend Pura)

Este documento centraliza todas las interfaces y componentes visuales que hemos introducido en la fase de **Puro Desarrollo UI (Mock Data)**. Detalla exactamente qué tablas, rutinas y lógicas de Supabase / Funciones externas se necesitan conectar para que cada módulo recién creado cobre vida funcional conforme al PRD.

---

## 1. Módulo: Authentication Navbar & Manejo de Estado

**Ubicación UI:** `components/layout/Navbar.tsx` (y lógica en `middleware.ts`)

**Requisitos Backend:**
- [x] **Autenticación Base:** Conexión SSR con `@supabase/ssr` (Ya completado).
- [ ] **Resolución del Rol Dinámico:** Actualizar los *custom claims* o leer de la tabla `profiles` para determinar si el usuario es un proveedor verificado (`user_metadata.role === 'provider'`) y así mostrar el botón "Panel de Proveedor" vs "Conviértete en Proveedor".
- [ ] **Sincronización de Avatar:** Llamar al Storage de Supabase para obtener la foto principal del usuario y usar el inicial solo como fallback.

---

## 2. Módulo: Configuración del Perfil (Settings View)

**Ubicaciones UI:** `app/profile/page.tsx`, `app/profile/provider/page.tsx`

La UI actual está hardcodeada. Se requiere conectar a las tablas base.

**Requisitos Backend:**
- [ ] **CRUD de `profiles` (Usuarios):** 
  - Endpoint o Server Action para hacer `UPDATE` a `profiles` con: `full_name`, `phone_number`.
  - El `email` viene cifrado de Supabase Auth, se requiere un flujo robusto (Magic Link) si el usuario decide cambiarlo, por ahora desactivado.
- [ ] **Manejo de Imágenes de Perfil:**
  - Instanciar un bucket público en Supabase Storage llamado `avatars`.
  - Crear lógica de subida y eliminación de fotos de perfil desde el cliente.
- [ ] **CRUD de `providers` (Bodegas Públicas):**
  - Actualización de marca comercial (`brand_name`), ubicación principal (`location_id`) y su Biografía (`bio`).

---

## 3. Módulo: Flujo de Onboarding "Conviértete en Proveedor"

**Ubicaciones UI:** `app/become-a-provider/page.tsx` (Landing), `app/become-a-provider/onboarding/page.tsx` (Wizard)

Esta es la pasarela de conversión de cliente a anfitrión. 

**Requisitos Backend (Críticos para Seguridad):**
- [ ] **Creación o Actualización Relacional de Perfil a Proveedor:**
  - Inserción en la base de datos marcando el estado inicial del proveedor como `estado: pending`.
- [ ] **Base de Datos - `addresses` (Direcciones):** 
  - El "Paso 1" captura la dirección física obligatoria. Debe insertarse en una tabla de `addresses` y enlazar dicho `address_id` foreign key al registro del proveedor o bodega.
- [ ] **Integración Stripe Identity (KYC):**
  - El "Paso 3" es un mock de subida de cédula. Esto NO debe ir simple a Supabase Storage. Requiere un Webhook conectando el motor de verificación biométrica de Stripe Identity.
  - Al completar Stripe, recibir webhook para pasar automáticamente la base de datos de `estado: pending` a `estado: verified`.

---

## 4. Módulo: Dashboard de Proveedor (Overview Administrativo)

**Ubicación UI:** `app/dashboard/layout.tsx`, `app/dashboard/page.tsx`

La interfaz contiene tablas visualmente ricas e indicadores (KPIs). Todos deben mutar de forma real.

**Requisitos Backend:**
- [ ] **Consultas de KPIs (Agregaciones / Estadísticas):**
  - Función (Posiblemente SQL View) para sumar los ingresos totales del mes agrupados por el Provider ID.
  - Conteo de equipos (`COUNT(equipments)` donde id_provider = user).
  - Conteo de reservas donde `estado = pendiente`.
- [ ] **Consultas de "Reservas Recientes" (`bookings`):**
  - Fetch relacional (*JOIN*) de la tabla de reservas para obtener: Nombre del Cliente, Título del Equipo reservado, Fechas, Costo monetario, y Estado (Badge label).
- [ ] **Estado General de Validación (Bodega):**
  - Leer en tiempo real si el KYC del proveedor está "Ok" o "Falta Identidad" en la tarjeta lateral rápida para invitar al proveedor a actualizar sus datos.

---

> **💡 Recomendación de Arquitectura Post-UI:**
> Dado que la estructura visual es robusta y limpia (Separadora de clientes `app/` y administradores `app/dashboard/`), el siguiente paso lógico debe ser **Levantar la Arquitectura SQL en Supabase (Tablas principales: Profiles, Providers, Addresses, Equipments, Bookings)** y amarrar RLS (Row Level Security) antes de conectar los Server Actions.
