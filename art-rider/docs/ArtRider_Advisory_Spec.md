# ArtRider Advisory — Especificación funcional (v1)

## 0. Contexto y propósito de este documento

Este documento describe la idea funcional del módulo **ArtRider Advisory**: un wizard de 4-6 preguntas que recopila las necesidades del evento de un cliente y, mediante un motor de reglas + algoritmo de matching, recomienda paquetes/equipos de proveedores ya existentes en la plataforma de ArtRider.

**Objetivo de este documento:** que Claude Code (con acceso al código actual de ArtRider) lo use como input para:

1. Analizar el código/esquema de datos actual.
2. Identificar qué existe, qué falta y qué hay que modificar.
3. Devolver un plan de integración (en otro .md) con fases concretas, antes/durante/después de implementar el algoritmo.

**Importante — alcance de v1:** Esta primera versión **NO incluye paquetes custom multi-proveedor**. El sistema solo recomienda paquetes ya existentes, armados por un solo proveedor. La función de armar paquetes combinando varios proveedores queda documentada como **Fase 2 (futuro)** al final de este documento, para no complicar la primera integración ni el modelo de negocio inicial.

---

## 1. Visión general

ArtRider Advisory es un wizard que el cliente completa antes de buscar en el marketplace. A partir de sus respuestas, el sistema:

1. Genera un "perfil del evento".
2. Traduce ese perfil en un "ticket de requisitos técnicos" (cuánta potencia de audio, qué tipo de iluminación, si necesita escenario, pantalla, etc.).
3. Compara ese ticket contra los paquetes/equipos existentes en el catálogo (con su metadata) y genera un score de compatibilidad.
4. Muestra al cliente 2-3 opciones recomendadas (ej. Económica / Recomendada / Premium), cada una de un solo proveedor.
5. Al hacer clic en "Reservar", se abre el contacto/chat con ese proveedor, con una tarjeta de contexto pre-cargada (resumen del perfil del evento + ticket de requisitos), para que el proveedor no tenga que preguntar de cero. El proveedor ajusta detalles y cierra la venta directamente con el cliente (modelo tipo Facebook Marketplace: ArtRider conecta, el proveedor cierra).

El valor del módulo es **reducir la fricción de "no sé qué necesito"** del lado del cliente, y entregarle al proveedor un lead mucho más calificado y con contexto.

---

## 2. El Wizard — preguntas y perfil del evento

### 2.1 Preguntas (5-6, todas con opciones predefinidas, no texto libre)

| # | Pregunta | Tipo de respuesta | Ejemplo de opciones |
|---|----------|--------------------|----------------------|
| 1 | Tipo de evento | Selección única | Boda, Fiesta privada, Evento corporativo, Concierto, Graduación, Conferencia |
| 2 | Número de asistentes | Rango | 0-50, 50-150, 150-300, 300+ |
| 3 | Tipo de espacio | Selección única | Interior, Exterior, Ambos/mixto |
| 4 | Foco principal del evento | Selección única | Conversación/discursos, Música y baile, Mixto |
| 5 | Rango de presupuesto | Rango (moneda local) | Definir 3-4 rangos según mercado |
| 6 | Fecha y ciudad/zona | Fecha + selección de ciudad | (para disponibilidad y cobertura geográfica) |

> Nota: todas las respuestas deben ser de opciones cerradas (selects/botones), no texto libre, para que el motor de reglas pueda procesarlas de forma determinística.

### 2.2 Estructura del "Perfil del Evento" (output del wizard)

```
PerfilEvento {
  tipo_evento: enum
  capacidad_personas: rango (min, max)
  tipo_espacio: enum (interior | exterior | mixto)
  foco_evento: enum (conversacion | musica_baile | mixto)
  presupuesto_rango: (min, max)
  fecha_evento: date
  ciudad: string
}
```

Este perfil se guarda como un registro persistente (ver sección 6), porque se reutiliza más adelante (ticket de requisitos, recomendaciones, contexto para el proveedor).

---

## 3. Motor de reglas — de Perfil de Evento a Ticket de Requisitos

El motor de reglas traduce el `PerfilEvento` en un `TicketRequisitos`: un conjunto de necesidades técnicas por categoría. Las reglas deben vivir en una **tabla/config editable** (no hardcodeadas), versionada (ej. "Reglas v1.0"), para poder ajustarlas con el tiempo sin tocar código.

### 3.1 Audio

Variable clave: potencia objetivo (watts), derivada de un factor "watts por persona" que depende de la combinación espacio + foco:

| Espacio | Foco | Factor (watts/persona, ejemplo inicial) |
|---------|------|-------------------------------------------|
| Interior | Conversación | bajo |
| Interior | Música/baile | medio |
| Exterior | Conversación | medio |
| Exterior | Música/baile | alto |

`potencia_objetivo = capacidad_personas × factor`, luego redondeado a un **tier** discreto (ej: <2000W, 2000-5000W, 5000-10000W, 10000W+).

También se determina:
- `tipo_audio`: PA básico (conversación) vs sistema de refuerzo sonoro (música/baile).
- `requiere_subwoofer`: true si foco = música/baile y tier ≥ medio.

### 3.2 Iluminación

- Si `foco_evento = conversacion` y el evento es de día → solo iluminación ambiental, cantidad baja.
- Si `foco_evento = musica_baile` o el evento es de noche → agregar iluminación de efectos (moving heads, pares LED), cantidad proporcional a la capacidad/tamaño del espacio.
- Si hay escenario (ver 3.4) → sumar iluminación específica para destacar esa zona.

### 3.3 Video / Pantallas

- Umbral de capacidad por debajo del cual no se requiere pantalla.
- Por encima del umbral → `requiere_pantalla = true`, con tamaño mínimo recomendado escalando con la capacidad.
- Si `tipo_espacio = exterior` → requisito mínimo de brillo (nits) más alto.

### 3.4 Escenario / Tarima

- Depende más del `tipo_evento` que de la capacidad:
  - Eventos con presentaciones en vivo (concierto, boda con banda/DJ, conferencia con ponentes) → `requiere_escenario = true`, con dimensiones mínimas según el tipo (chico para discursos, grande para banda).
  - Fiesta privada sin presentaciones → `requiere_escenario = false`.

### 3.5 Generación eléctrica

- Si `tipo_espacio = exterior` y (opcional, agregar como pregunta extra) el cliente indica que no hay acceso eléctrico confiable → `requiere_generador = true`, con capacidad mínima en kVA = suma de potencias de audio + luces + video + margen de seguridad.

### 3.6 Estructura del Ticket de Requisitos (output del motor de reglas)

```
TicketRequisitos {
  audio: { tipo: enum, potencia_tier: enum, requiere_subwoofer: bool }
  iluminacion: { tipo: enum, cantidad_tier: enum }
  video: { requiere_pantalla: bool, tamano_tier: enum?, brillo_min: enum? }
  escenario: { requerido: bool, dimensiones_tier: enum? }
  generador: { requerido: bool, kva_min: number? }
}
```

---

## 4. Esquema de metadata para catálogo (equipos y paquetes)

Para que el matching funcione, los equipos y paquetes subidos por proveedores deben tener metadata estructurada (selects/checkboxes, no texto libre).

### 4.1 Campos comunes (a nivel de ítem y de paquete)

- `categoria_principal`: audio | iluminacion | video | escenario | mobiliario | generador | personal_tecnico | otros
- `subcategoria`: depende de la categoría
- `tipos_evento_recomendados`: multi-select (boda, corporativo, concierto, etc.)
- `capacidad_recomendada`: rango (min, max)
- `tipo_espacio_compatible`: interior | exterior | ambos
- `precio` + `unidad` (por evento / por día / por hora)
- `ciudad_base` / `cobertura_geografica`
- `requiere_personal_tecnico`: bool + cantidad

### 4.2 Campos específicos por categoría

**Audio:**
- `potencia_watts_rms`
- `tipo_sistema`: PA básico | refuerzo sonoro | monitoreo
- `incluye_subwoofer`: bool + cantidad
- `canales_mezcladora`
- `microfonos_incluidos`: cantidad + tipo
- `cobertura_metros`

**Iluminación:**
- `tipo_iluminacion`: ambiental | escenográfica | efectos
- `cantidad_luminarias`
- `tipo_luminaria`: par led | moving head | barra led | otro
- `incluye_dmx`: bool
- `incluye_efectos`: bool (humo, burbujas, CO2)

**Video:**
- `tipo_video`: pantalla_led | proyector_pantalla | streaming_switcher
- `tamano_o_resolucion`
- `brillo_nits`

**Escenario/Tarima:**
- `dimensiones` (largo x ancho x alto)
- `capacidad_carga`
- `incluye_techo`: bool

**Mobiliario:**
- `tipo_mobiliario`
- `cantidad`
- `capacidad_personas`

**Generador eléctrico:**
- `potencia_kva`
- `autonomia_horas`

### 4.3 Paquetes (combos armados por proveedores)

Un paquete hereda los campos comunes (capacidad recomendada, tipo de espacio, tipos de evento, precio) y además incluye una **lista de ítems individuales** que lo componen, cada uno con sus propios campos específicos. Esto permite que, en el futuro (Fase 2), el sistema pueda "desarmar" un paquete si necesita combinar piezas.

---

## 5. Algoritmo de matching y scoring (v1 — solo paquetes existentes)

### 5.1 Filtrado previo

Antes de hacer scoring, filtrar el universo de paquetes candidatos:

- Cobertura geográfica compatible con la ciudad del evento.
- Disponibilidad para la fecha del evento (si existe sistema de calendario).
- Precio del paquete dentro o cerca del `presupuesto_rango` del cliente.

### 5.2 Cálculo de score de compatibilidad

Para cada paquete que pasó el filtro, calcular un score compuesto:

| Factor | Descripción | Peso (ejemplo inicial) |
|--------|-------------|--------------------------|
| Ajuste técnico | Qué tan bien la metadata del paquete cubre el `TicketRequisitos` (por categoría: tier igual o superior = bien; inferior = penaliza) | alto |
| Ajuste de presupuesto | Qué tan cerca está el precio del paquete del rango dado, penalizando más si se excede que si queda por debajo | medio |
| Reputación del proveedor | Rating + cantidad de eventos completados | medio |
| Tier del proveedor | Clasificación interna de ArtRider (si aplica boost) | bajo |

### 5.3 Selección final

- Ordenar paquetes por score descendente.
- Definir un **umbral mínimo de score**. Si hay ≥2 paquetes que superan el umbral, mostrar como "Económica / Recomendada / Premium" (según precio relativo entre ellos).
- Si ningún paquete supera el umbral → mostrar el/los de mayor score disponibles, pero con una indicación al cliente de que "no encontramos una opción que cubra el 100% de lo recomendado para tu evento; estas son las más cercanas". (En Fase 2, este caso activaría el armado de paquetes custom).

### 5.4 Generación de explicación

Para cada opción mostrada, generar un texto breve explicando por qué se recomienda (template simple en v1; podría evolucionar a generación con LLM más adelante). Debe mencionar: tipo de evento, capacidad, y qué necesidades del `TicketRequisitos` cubre el paquete.

---

## 6. Flujo de reserva / conexión con el proveedor

Este es el punto crítico del modelo de negocio: **ArtRider conecta, el proveedor cierra** (modelo tipo Facebook Marketplace).

### 6.1 Flujo (v1, un solo proveedor por recomendación)

1. Cliente ve la(s) opción(es) recomendada(s) y presiona "Reservar" sobre una de ellas.
2. Se abre/crea la conversación de contacto con el proveedor de ese paquete (reutilizando el sistema de mensajería/contacto que ya exista en ArtRider).
3. La conversación incluye una **tarjeta de contexto pre-cargada** (no editable por el cliente en ese momento, pero visible para ambos) con:
   - Resumen del `PerfilEvento` (tipo de evento, capacidad, espacio, foco, fecha, ciudad).
   - Resumen del `TicketRequisitos` generado.
   - Referencia al paquete recomendado específico.
4. El proveedor ve esta información de entrada, y desde ahí negocia normalmente: ajusta ítems, da precio final, confirma disponibilidad y cierra la venta con el cliente, igual que en el marketplace actual.

### 6.2 Qué NO cambia respecto al marketplace actual

- ArtRider no confirma reservas ni gestiona pagos/escrow en este flujo (a menos que ya lo haga para el marketplace general; en ese caso el flujo de Advisory simplemente alimenta ese mismo mecanismo con más contexto).
- El proveedor sigue teniendo la libertad de modificar lo que el sistema recomendó (agregar/quitar ítems, cambiar precio).
- La interacción cliente-proveedor sigue siendo el mecanismo de cierre, tal como en un marketplace tipo Facebook.

---

## 7. Modelo de datos conceptual (nuevas entidades necesarias)

> Nota: esto es conceptual, para que Claude Code lo mapee contra el esquema real (Supabase) y determine nombres de tablas, relaciones y migraciones concretas.

1. **`perfil_evento`** — guarda las respuestas del wizard por sesión/usuario. Persiste para reutilizarse durante toda la experiencia del cliente.
2. **`ticket_requisitos`** — resultado del motor de reglas aplicado a un `perfil_evento`. Vinculado 1:1 con `perfil_evento`.
3. **`reglas_config`** — tabla de configuración versionada con los factores/umbrales del motor de reglas (watts/persona, umbrales de capacidad para pantalla/escenario, pesos del scoring, umbral mínimo de score).
4. **Extensión de catálogo existente (equipos/paquetes)** — agregar los campos de metadata estructurada descritos en la sección 4, tanto a nivel de ítem individual como de paquete.
5. **`recomendacion_generada`** — registro de qué opciones se le mostraron al cliente para un `perfil_evento` dado (qué paquetes, qué score, en qué orden). Útil para analítica y para la tarjeta de contexto al reservar.
6. **Extensión de conversación/contacto existente** — capacidad de adjuntar/mostrar una "tarjeta de contexto" (resumen de `perfil_evento` + `ticket_requisitos` + referencia a `recomendacion_generada`) al iniciar una conversación generada desde Advisory.

---

## 8. Qué se le pide a Claude Code (tareas de análisis y planeación)

1. **Analizar el esquema actual** de catálogo (equipos/paquetes) en Supabase y determinar cómo extenderlo con los campos de metadata de la sección 4 (qué tablas tocar, si conviene tabla nueva relacionada vs. columnas adicionales, migraciones necesarias).
2. **Analizar el sistema de mensajería/contacto** actual entre cliente y proveedor, y determinar cómo inyectar la "tarjeta de contexto" (sección 6) sin romper el flujo existente.
3. **Proponer dónde vive el motor de reglas y el algoritmo de matching**: ¿como funciones/edge functions de Supabase, como servicio separado, como lógica en el frontend Next.js? Considerar mantenibilidad de `reglas_config`.
4. **Diseñar el wizard como UI nueva** (Next.js + Tailwind, consistente con el resto de ArtRider), incluyendo el guardado de `perfil_evento`.
5. **Proponer un plan de fases concreto**, dividido en:
   - **Antes de integrar el algoritmo**: cambios de esquema/datos necesarios (extender catálogo, poblar metadata mínima en ítems existentes, crear `reglas_config` inicial).
   - **Durante (el módulo del algoritmo)**: wizard, motor de reglas, motor de matching/scoring, generación de explicaciones.
   - **Después de integrar**: extender flujo de reserva/contacto con la tarjeta de contexto, analítica de `recomendacion_generada`.
6. **Entregar el plan como un .md** con fases, dependencias entre tareas, y notas sobre qué partes del código actual se verían afectadas (archivos/módulos concretos, según lo que encuentre en el repo).

---

## 9. Fase 2 (futuro, NO incluir en v1) — Paquetes custom multi-proveedor

Documentado aquí solo como referencia para no perder la idea, pero **explícitamente fuera del alcance de la primera integración**.

- Si ningún paquete existente supera el umbral de score (sección 5.3), el sistema podría armar un "paquete sugerido" combinando ítems individuales de distintos proveedores (uno por categoría requerida), usando una asignación de presupuesto por categoría según el tipo de evento.
- El flujo de "Reservar" para un paquete custom generaría **una solicitud de contacto separada por cada proveedor involucrado**, cada una con su tarjeta de contexto, incluyendo una nota de que el evento involucra a otros proveedores coordinados a través de ArtRider (sin compartir precios entre ellos).
- Se necesitaría una vista de "estado del evento" para el cliente, mostrando el estado de cada solicitud paralela (pendiente/confirmado/rechazado), y la posibilidad de re-correr el algoritmo solo para la categoría que quede sin confirmar.
- Esto requeriría: lógica de asignación de presupuesto por categoría, validación de coherencia (máximo de proveedores distintos, disponibilidad cruzada), y extensión del modelo de datos para vincular múltiples `solicitud_reserva` a un mismo `perfil_evento`.

---

## 10. Resumen ejecutivo (para referencia rápida)

| Componente | v1 (este documento) | Fase 2 (futuro) |
|------------|----------------------|-------------------|
| Wizard | Sí, 5-6 preguntas | Sin cambios |
| Motor de reglas | Sí | Sin cambios mayores |
| Metadata de catálogo | Sí, extender esquema | Sin cambios mayores |
| Matching/scoring | Sí, solo paquetes existentes de 1 proveedor | Se agrega armado de paquetes custom multi-proveedor |
| Flujo de reserva | Tarjeta de contexto + 1 conversación con el proveedor del paquete | N conversaciones paralelas (una por proveedor involucrado) |
| Coordinación entre proveedores | No aplica | Solo informativa (sin escrow ni gestión activa) |
