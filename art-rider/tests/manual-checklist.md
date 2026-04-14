# ArtRider — Manual QA Checklist

> **Cómo usar este documento:**
> - Ejecuta cada caso de prueba en un navegador real.
> - Marca `[x]` si pasa, `[!]` si falla, y anota el error en el campo **Resultado**.
> - Actualiza la fecha de la última ejecución al final del documento.

---

## MÓDULO 1 — Registro de Usuario (`/register`)

### 1.1 Flujo Normal (Happy Path)

| # | Caso de Prueba | Resultado |
|---|---|---|
| 1.1.1 | Registrarse con todos los campos válidos → redirige a `/login` | |
| 1.1.2 | El perfil aparece creado en Supabase → tabla `profiles` | |
| 1.1.3 | El usuario aparece creado en Supabase → tabla `auth.users` | |
| 1.1.4 | El logo ArtRider aparece correctamente en la página | |
| 1.1.5 | El enlace "Volver al inicio" está en la esquina superior izquierda | |
| 1.1.6 | El enlace "Inicia sesión" redirige a `/login` | |

### 1.2 Validaciones del Formulario

| # | Caso de Prueba | Espera | Resultado |
|---|---|---|---|
| 1.2.1 | Enviar con campos vacíos | Bloqueo nativo del navegador | |
| 1.2.2 | Nombre con 1 caracter (ej: "A") | Error: *"entre 2 y 50 caracteres"* | |
| 1.2.3 | Nombre con más de 50 caracteres | Input bloqueado por `maxLength` | |
| 1.2.4 | Teléfono con letras (ej: "abcdefghij") | Error: formato inválido | |
| 1.2.5 | Teléfono con 5 dígitos (demasiado corto) | Error: formato inválido | |
| 1.2.6 | Teléfono con 16 dígitos (demasiado largo) | Input bloqueado por `maxLength` | |
| 1.2.7 | Fecha de nacimiento: año 1111 | Error: *"fecha de nacimiento legítima"* | |
| 1.2.8 | Fecha de nacimiento: año futuro | Error: *"fecha de nacimiento legítima"* | |
| 1.2.9 | Fecha que da menos de 15 años de edad | Error: *"mayor de 15 años"* | |
| 1.2.10 | Contraseña con 7 caracteres | Bloqueo nativo del navegador (`minLength`) | |
| 1.2.11 | Confirmar contraseña diferente | Tooltip del navegador: *"Las contraseñas no coinciden"* | |
| 1.2.12 | Email con formato inválido (sin @) | Bloqueo nativo del navegador | |

### 1.3 Conflictos de Datos Únicos

| # | Caso de Prueba | Espera | Resultado |
|---|---|---|---|
| 1.3.1 | Registrarse con email ya existente | Error: *"An account with this email already exists"* | |
| 1.3.2 | Registrarse con teléfono ya registrado | Error: *"Este número de teléfono ya está registrado"* | |

---

## MÓDULO 2 — Inicio de Sesión (`/login`)

| # | Caso de Prueba | Espera | Resultado |
|---|---|---|---|
| 2.1 | Login con credenciales correctas | Redirige a `/` | |
| 2.2 | Login con contraseña incorrecta | Error: *"Invalid email or password"* | |
| 2.3 | Login con email no registrado | Error: *"Invalid email or password"* | |
| 2.4 | Logo ArtRider visible en la página | Logo con onda de sonido | |
| 2.5 | Enlace "Volver al inicio" en esquina superior izquierda | ← aparece arriba a la izquierda | |
| 2.6 | Enlace "Regístrate" redirige a `/register` | | |
| 2.7 | Enlace "¿Olvidaste tu contraseña?" lleva a `/forgot-password` | Actualmente 404 (pendiente) | |

---

## MÓDULO 3 — Sesión y Navbar

| # | Caso de Prueba | Espera | Resultado |
|---|---|---|---|
| 3.1 | Navbar muestra logo ArtRider con ícono de onda | Logo con borde circular | |
| 3.2 | Usuario NO autenticado: menú desplegable muestra "Iniciar sesión" y "Registrarse" | | |
| 3.3 | Usuario autenticado: menú desplegable muestra "Editar perfil" y "Cerrar sesión" | | |
| 3.4 | Usuario autenticado: aparece enlace "Mis Reservas" en la navbar | | |
| 3.5 | Cerrar sesión → redirige a `/` y limpia la sesión | | |
| 3.6 | Después de cerrar sesión, ir a `/profile` redirige a `/login` | | |

---

## MÓDULO 4 — Perfil de Usuario (`/profile`)

### 4.1 Carga del Perfil

| # | Caso de Prueba | Espera | Resultado |
|---|---|---|---|
| 4.1.1 | Acceder a `/profile` autenticado | Carga los datos del usuario | |
| 4.1.2 | El nombre y teléfono muestran los datos ingresados en el registro | | |
| 4.1.3 | El correo electrónico aparece deshabilitado (campo gris) | | |
| 4.1.4 | La fecha de nacimiento aparece deshabilitada con mensaje explicativo | | |
| 4.1.5 | Si tiene avatar, se muestra la foto. Si no, muestra las iniciales | | |

### 4.2 Actualización de Datos

| # | Caso de Prueba | Espera | Resultado |
|---|---|---|---|
| 4.2.1 | Cambiar el nombre y guardar → mensaje verde de éxito | | |
| 4.2.2 | Cambiar el teléfono por un formato inválido | Error: *"formato de teléfono inválido"* | |
| 4.2.3 | Poner teléfono de otro usuario → error de duplicado | Error: *"ya está registrado con otra cuenta"* | |
| 4.2.4 | Intentar cambiar la fecha de nacimiento (campo deshabilitado) | Campo bloqueado, no enviable | |
| 4.2.5 | Guardar sin hacer ningún cambio → funciona sin error | | |

### 4.3 Subida de Avatar

| # | Caso de Prueba | Espera | Resultado |
|---|---|---|---|
| 4.3.1 | Hacer clic en "Cambiar foto" → abre explorador de archivos | | |
| 4.3.2 | Seleccionar imagen válida (JPG < 2MB) → previsualización inmediata | | |
| 4.3.3 | Guardar con nueva foto → imagen guardada en Supabase Storage | | |
| 4.3.4 | Recargar la página → la nueva foto persiste | | |
| 4.3.5 | Subir imagen mayor a 2MB | Error: *"no puede superar los 2MB"* | |
| 4.3.6 | Intentar subir otra foto en menos de 24 horas | Error: *"una vez cada 24 horas"* | |
| 4.3.7 | Fecha de última actualización aparece en ámbar bajo el botón | | |

---

## MÓDULO 5 — Seguridad General

| # | Caso de Prueba | Espera | Resultado |
|---|---|---|---|
| 5.1 | Acceder a `/profile` sin sesión activa | Redirige a `/login` | |
| 5.2 | Modificar el HTML para habilitar el campo `birthDate` y enviar | Backend ignora el cambio, mantiene la fecha original | |
| 5.3 | Enviar una petición POST directa a `/profile` con datos de otro usuario | RLS de Supabase rechaza el update | |
| 5.4 | El token JWT no debe ser visible en ninguna URL o localStorage | Solo en cookies HTTP-only | |

---

## Estado General

| Módulo | Casos Totales | Pasando | Fallando | Pendientes |
|---|---|---|---|---|
| 1. Registro | 16 | | | |
| 2. Login | 7 | | | |
| 3. Sesión y Navbar | 6 | | | |
| 4. Perfil | 15 | | | |
| 5. Seguridad | 4 | | | |
| **TOTAL** | **48** | | | |

---

## Historial de Ejecuciones

| Fecha | Ejecutado por | Casos Pasando | Notas |
|---|---|---|---|
| | | | |

---

> 📌 **Módulos pendientes de implementar** (sin checklist aún):
> - Listings (publicar equipos)
> - Búsqueda y filtros
> - Reservas (Bookings)
> - Pagos (Stripe)
> - Contratos digitales
> - Mensajería
