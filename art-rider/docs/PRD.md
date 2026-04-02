# 📄 Product Requirements Document (PRD)

## **ArtRider**

---

## 1. 🧭 Visión del Producto

**ArtRider** es una plataforma web tipo marketplace que conecta propietarios de equipos creativos (audio, iluminación, instrumentos) con clientes que necesitan alquilarlos para eventos y producciones.

El producto soluciona la fragmentación logística y la falta de confianza en la industria mediante:

* Catálogo centralizado
* Reservas estructuradas
* Pagos seguros con depósito de garantía
* Contratos digitales automáticos con firma bilateral
* Trazabilidad por unidad física (serial number)

---

## 2. 🎯 Objetivos del Producto

### Objetivo principal

Facilitar el alquiler seguro, eficiente y trazable de equipos creativos.

### Objetivos secundarios

* Reducir fricción en reservas
* Garantizar seguridad legal y financiera
* Generar ingresos para propietarios
* Centralizar comunicación entre partes

---

## 3. 👥 User Personas

### 🎧 Cliente (Client)

* Organizador de eventos / DJ / productor
* Necesita equipos confiables rápidamente
* Busca comparar precios y disponibilidad

### 🎛️ Propietario (Owner)

* Posee equipos
* Quiere monetizarlos
* Necesita seguridad (pagos + contratos + seguros)

### 🛡️ Administrador (Admin)

* Supervisa la plataforma
* Gestiona disputas
* Monitorea actividad

---

## 4. 🧩 Alcance del Producto (MVP)

### Incluye:

* Autenticación y KYC
* Creación de listings
* Catálogo de productos
* Reservas (bookings)
* Pagos con depósito
* Contratos digitales
* Mensajería
* Reviews

### No incluye (fase posterior):

* logística integrada (envíos)
* sistema avanzado de disputas
* recomendaciones inteligentes

---

## 5. 🧠 Arquitectura del Sistema

### Stack principal

* Frontend: Next.js
* Backend: Supabase
* Pagos: Stripe
* ORM: Prisma / Drizzle
* DB: PostgreSQL

---

### Capas del sistema

```text
Frontend (UI/UX)
↓
Service Layer (API Routes / Server Actions)
↓
Supabase (DB + Auth + RLS)
↓
Servicios externos (Stripe, PDF)
```

---

## 6. 🔐 Reglas Críticas de Negocio

### 6.1 Contratos

* Un booking NO puede activarse si:

  ```text
  contract.status != EXECUTED
  ```

### 6.2 Firma bilateral

Estados:

* PENDING
* PARTIALLY_SIGNED
* EXECUTED

---

### 6.3 Pagos

* Se usa flujo:

  ```text
  AUTHORIZE → CAPTURE
  ```
* Depósito retenido hasta inspección

---

### 6.4 Trazabilidad

* Cada equipo se identifica por:

  ```text
  serial_number
  ```
* Este dato debe incluirse en el contrato

---

### 6.5 Integridad de precios

* Se usa:

  ```text
  locked_price
  ```
* No cambia después de reservar

---

## 7. 🔄 User Flows

---

### 7.1 Exploración

1. Usuario entra a Home
2. Busca equipos
3. Filtra por categoría/ubicación
4. Ve listings

---

### 7.2 Booking (Flujo crítico)

1. Selecciona fechas
2. Validación de disponibilidad
3. Cálculo de precio
4. Creación de booking
5. Creación de PaymentIntent
6. Generación de contrato

---

### 7.3 Firma de contrato

1. Usuario visualiza contrato
2. Firma digital
3. Se guarda hash
4. Estado cambia:

   * PARTIALLY_SIGNED / EXECUTED

---

### 7.4 Activación

Condiciones:

* contrato EXECUTED
* pago autorizado

---

### 7.5 Finalización

1. Inspección del equipo
2. Captura o liberación del depósito

---

## 8. 📊 Estados del Sistema

### Booking

```text
AWAITING_SIGNATURES
PAID
ACTIVE
COMPLETED
DISPUTE
```

---

### Payment

```text
AUTHORIZED
CAPTURED
REFUNDED
```

---

### Contract

```text
PENDING
PARTIALLY_SIGNED
EXECUTED
```

---

## 9. ⚙️ Requisitos Funcionales

### Usuarios

* Registro / login
* Verificación de identidad (KYC)
* Gestión de perfil

---

### Listings

* Crear, editar, eliminar
* Subir fotos
* Asociar ubicación

---

### Inventario

* Crear unidades físicas
* Gestión de estado

---

### Bookings

* Crear reserva
* Validar disponibilidad
* Bloquear fechas

---

### Pagos

* Crear PaymentIntent
* Autorizar depósito
* Capturar pago

---

### Contratos

* Generar PDF
* Firma digital
* Hash de firma

---

### Mensajería

* Crear conversación
* Enviar mensajes

---

### Reviews

* Calificar usuarios
* Comentarios

---

## 10. 🔒 Requisitos No Funcionales

### Seguridad

* RLS en base de datos
* UUIDs
* Soft delete
* Hash de firmas

---

### Escalabilidad

* PostgreSQL optimizado
* separación de capas
* arquitectura desacoplada

---

### Performance

* SSR con Next.js
* queries optimizadas

---

### Disponibilidad

* uptime alto
* manejo de errores

---

## 11. 🎨 Design Guidelines

Basado en Figma:

### Color principal

```text
#875B9A
```

---

### Uso

* botones principales (CTA)
* estados activos
* branding

---

### Recomendación

* definir variantes:

  * primary-400
  * primary-500
  * primary-600

---

## 12. 🚨 Edge Cases

* pago rechazado
* contrato no firmado
* equipo no disponible
* cancelaciones
* disputas
* daño del equipo

---

## 13. 📈 KPIs

* GMV (Gross Merchandise Volume)
* tasa de conversión
* bookings completados
* tasa de cancelación
* tiempo de reserva

---

## 14. 🗺️ Roadmap

### Fase 1 (MVP)

* Auth
* Listings
* Booking básico
* Pagos
* Contratos

---

### Fase 2

* Mensajería
* Reviews
* mejoras UX

---

### Fase 3

* seguros avanzados
* disputas
* optimización

---

## 15. ⚠️ Riesgos

* complejidad en RLS
* errores en flujo de pagos
* legalidad de firmas
* dependencia de servicios externos

---

## 16. 👥 Organización del Equipo

* Dev 1: DB + Supabase
* Dev 2: Booking logic
* Dev 3: Pagos + contratos
* Dev 4: Frontend

---

# ✅ Conclusión

ArtRider es un sistema transaccional complejo que combina:

* marketplace
* fintech
* legaltech

El éxito depende de:

* correcta separación de responsabilidades
* control estricto de estados
* seguridad en pagos y contratos


