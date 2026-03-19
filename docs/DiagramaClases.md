<details>
<summary><b>🇬🇧 Versión en Inglés (ArtRider Master Class Diagram v4.0)</b></summary>
 **"Enterprise-Ready"**.

He añadido 4 elementos técnicos cruciales para que la aplicación funcione en la vida real sin romperse:
1.  **Addresses:** Separar la ubicación del usuario de la ubicación del equipo (Logística).
2.  **Conversations/Messages:** El flujo de negociación previo a la reserva.
3.  **Audit Timestamps:** `created_at` y `updated_at` en todas las tablas (estándar de industria).
4.  **Soft Deletes:** Campo `deleted_at` para no perder registros financieros si alguien borra un producto.

Aquí está el **ArtRider Master Class Diagram (v4.0 Final)**:

```
erDiagram
    %% ==========================================
    %% 1. USER & IDENTITY (KYC & SECURITY)
    %% ==========================================
    User ||--o{ Address : "has"
    User ||--o{ Listing : "owns"
    User ||--o{ Booking : "as_client"
    User ||--o{ Booking : "as_owner"
    User ||--o| IdentityVerification : "verified_by"
    User ||--o{ Conversation : "participates"

    User {
        int id PK
        string email UK
        string password_hash
        string full_name
        date birth_date
        string phone
        string account_type "ADMIN, OWNER, CLIENT"
        string stripe_customer_id UK
        string avatar_url
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at "Soft delete"
    }

    IdentityVerification {
        int id PK
        int user_id FK
        string provider_ref "Stripe Identity ID"
        string status "PENDING, VERIFIED, REJECTED"
        timestamp verified_at
    }

    Address {
        int id PK
        int user_id FK
        string label "Home, Warehouse, Studio"
        string street_address
        string city
        string state_province
        string country_code "ISO 3166-1"
        string postal_code
        float latitude
        float longitude
    }

    %% ==========================================
    %% 2. GLOBAL CATALOG & LISTINGS
    %% ==========================================
    Category ||--o{ CatalogProduct : "groups"
    CatalogProduct ||--o{ Listing : "template_for"
    Listing ||--o{ ListingPhoto : "displays"
    Listing ||--|{ EquipmentUnit : "physical_stock"

    Category {
        int id PK
        string name "Audio, Lighting, etc"
        string slug UK
        string icon_url
    }

    CatalogProduct {
        int id PK
        int category_id FK
        string brand
        string model
        text global_description
        jsonb technical_specs "JSON: weight, power, etc"
    }

    Listing {
        int id PK
        int owner_id FK
        int catalog_product_id FK
        string custom_title
        text owner_notes
        decimal price_per_day
        decimal replacement_value "Basis for Insurance"
        int address_id FK "Where the gear is located"
        boolean is_active
        timestamp created_at
        timestamp deleted_at
    }

    ListingPhoto {
        int id PK
        int listing_id FK
        string url
        int sort_order
    }

    %% ==========================================
    %% 3. INVENTORY & AVAILABILITY
    %% ==========================================
    EquipmentUnit ||--o{ AvailabilityCalendar : "schedules"
    
    EquipmentUnit {
        int id PK
        int listing_id FK
        string serial_number UK "Required for Contracts"
        string condition "NEW, GOOD, FAIR"
        string internal_status "AVAILABLE, RENTED, MAINTENANCE"
        timestamp created_at
    }

    AvailabilityCalendar {
        int id PK
        int equipment_unit_id FK
        date start_date
        date end_date
        string status "BOOKED, BLOCKED, MAINTENANCE"
        int booking_id FK "Null if manually blocked"
    }

    %% ==========================================
    %% 4. BUNDLES (PACKAGES)
    %% ==========================================
    Package ||--|{ PackageItem : "contains"
    Listing ||--o{ PackageItem : "linked_to"

    Package {
        int id PK
        int owner_id FK
        string name
        decimal package_price_per_day
        boolean is_active
    }

    PackageItem {
        int id PK
        int package_id FK
        int listing_id FK
        int quantity
    }

    %% ==========================================
    %% 5. THE TRANSACTIONAL ENGINE (BOOKINGS)
    %% ==========================================
    Booking ||--|{ BookingItem : "includes"
    Booking ||--|| Contract : "formalizes"
    Booking ||--o| Payment : "settles"
    Booking ||--o| InsurancePolicy : "covers"

    Booking {
        int id PK
        string booking_code UK
        int client_id FK
        int owner_id FK
        date start_date
        date end_date
        int total_days
        decimal subtotal
        decimal platform_fee
        decimal insurance_fee
        decimal total_amount
        string status "AWAITING_SIGNATURES, PAID, ACTIVE, COMPLETED, DISPUTE"
        timestamp created_at
    }

    BookingItem {
        int id PK
        int booking_id FK
        int listing_id FK
        int package_id FK "Null if single"
        int equipment_unit_id FK "The specific Serial Number"
        decimal locked_price "Price at the moment of booking"
    }

    %% ==========================================
    %% 6. LEGAL & FINANCES
    %% ==========================================
    Contract {
        int id PK
        int booking_id FK
        string version "v1.0-2025"
        
        %% Bilateral Signatures
        timestamp owner_signed_at
        string owner_signature_hash
        string owner_pdf_url
        
        timestamp client_signed_at
        string client_signature_hash
        string client_pdf_url
        
        string status "PENDING, PARTIALLY_SIGNED, EXECUTED"
    }

    Payment {
        int id PK
        int booking_id FK
        string stripe_id "PaymentIntent ID"
        string status "AUTHORIZED, CAPTURED, REFUNDED"
        decimal security_deposit_amount
        timestamp created_at
    }

    InsurancePolicy {
        int id PK
        int booking_id FK
        string policy_number UK
        string provider
        string status "ACTIVE, CLAIM_OPEN, CLOSED"
    }

    %% ==========================================
    %% 7. COMMUNICATION & FEEDBACK
    %% ==========================================
    Conversation ||--o{ Message : "contains"
    Booking ||--o{ Review : "generates"

    Conversation {
        int id PK
        int booking_id FK "Optional: can start before booking"
        timestamp created_at
    }

    Message {
        int id PK
        int conversation_id FK
        int sender_id FK
        text content
        timestamp sent_at
    }

    Review {
        int id PK
        int booking_id FK
        int author_id FK
        int target_id FK "User being rated"
        int rating
        text comment
        timestamp created_at
    }
```

### Por qué este diseño es "perfecto" para empezar:

1.  **Lógica de Negocio Intacta:** Mantiene la esencia de ArtRider (Airbnb de equipos), pero con el rigor de un sistema financiero.
2.  **Contratos Robustos:** La tabla `Contract` soporta el flujo de firmas por separado. No se marca como `EXECUTED` hasta que ambos `timestamp` de firma están llenos.
3.  **Preparado para Maps:** La tabla `Address` con `latitude` y `longitude` permite que el equipo de Frontend implemente la búsqueda por mapa (Mapbox/Google Maps) fácilmente.
4.  **Mensajería Integrada:** Las tablas `Conversation` y `Message` permiten que el cliente y el dueño coordinen la entrega de los equipos sin salir de la plataforma.
5.  **Integridad de Datos:** Al usar `BookingItem` con un `locked_price`, proteges el histórico financiero. Si el dueño sube el precio de sus equipos mañana, las reservas antiguas no se ven afectadas.
6.  **Trazabilidad Legal:** La relación `BookingItem -> EquipmentUnit (serial_number)` es lo que vierte el dato exacto en el contrato automático.

**Recomendación técnica para el equipo:**
Utilicen **UUIDs** en lugar de IDs incrementales para las tablas públicas (`User`, `Listing`, `Booking`, `Contract`). Esto añade una capa extra de seguridad (nadie podrá adivinar cuántos usuarios o contratos tienen viendo la URL).

</details>

<details>
<summary><b>🇪🇸 Versión en Español (Diagrama de Clases)</b></summary>

Este esquema incluye la lógica de **contratos automáticos**, **trazabilidad por número de serie** (sin QR), **validación de identidad**, **logística de direcciones** y **sistema de mensajería**.

```
erDiagram
    %% ==========================================
    %% 1. USUARIOS E IDENTIDAD (KYC y SEGURIDAD)
    %% ==========================================
    Usuario ||--o{ Direccion : "tiene"
    Usuario ||--o{ Publicacion : "es_dueno_de"
    Usuario ||--o{ Reserva : "realiza_como_cliente"
    Usuario ||--o{ Reserva : "gestiona_como_propietario"
    Usuario ||--o| VerificacionIdentidad : "esta_verificado_por"
    Usuario ||--o{ Conversacion : "participa_en"

    Usuario {
        int id PK
        string email UK
        string password_hash
        string nombre_completo
        date fecha_nacimiento "Requerido para contratos/seguros"
        string telefono
        string tipo_cuenta "ADMIN, PROPIETARIO, CLIENTE"
        string stripe_customer_id UK "ID de pasarela global"
        string avatar_url
        timestamp creado_en
        timestamp actualizado_en
        timestamp eliminado_en "Soft delete para auditoría"
    }

    VerificacionIdentidad {
        int id PK
        int usuario_id FK
        string proveedor_ref "Referencia de Stripe Identity/Sumsub"
        string estado "PENDIENTE, VERIFICADO, RECHAZADO"
        timestamp verificado_en
    }

    Direccion {
        int id PK
        int usuario_id FK
        string etiqueta "Hogar, Bodega, Estudio"
        string direccion_linea1
        string ciudad
        string estado_provincia
        string codigo_pais "ISO 3166-1"
        string codigo_postal
        float latitud
        float longitud "Para búsqueda en mapa"
    }

    %% ==========================================
    %% 2. CATÁLOGO GLOBAL Y PUBLICACIONES
    %% ==========================================
    Categoria ||--o{ ProductoCatalogo : "agrupa"
    ProductoCatalogo ||--o{ Publicacion : "es_plantilla_de"
    Publicacion ||--o{ FotoPublicacion : "muestra"
    Publicacion ||--|{ UnidadEquipo : "tiene_stock_fisico"

    Categoria {
        int id PK
        string nombre "Audio, Iluminación, etc."
        string slug UK
        string icono_url
    }

    ProductoCatalogo {
        int id PK
        int categoria_id FK
        string marca
        string modelo
        text descripcion_global
        jsonb especificaciones_tecnicas "Watts, Peso, etc."
    }

    Publicacion {
        int id PK
        int propietario_id FK
        int producto_catalogo_id FK
        string titulo_personalizado
        text notas_del_propietario
        decimal precio_por_dia
        decimal valor_reposicion "Base para Seguro y Contrato"
        int direccion_id FK "Ubicación del equipo"
        boolean esta_activa
        timestamp creado_en
        timestamp eliminado_en
    }

    FotoPublicacion {
        int id PK
        int publicacion_id FK
        string url
        int orden_visualizacion
    }

    %% ==========================================
    %% 3. INVENTARIO Y DISPONIBILIDAD
    %% ==========================================
    UnidadEquipo ||--o{ CalendarioDisponibilidad : "se_programa_en"
    
    UnidadEquipo {
        int id PK
        int publicacion_id FK
        string numero_serie UK "Obligatorio para el Contrato Legal"
        string condicion_fisica "NUEVO, BUENO, DESGASTADO"
        string estado_interno "DISPONIBLE, ALQUILADO, MANTENIMIENTO"
        timestamp creado_en
    }

    CalendarioDisponibilidad {
        int id PK
        int unidad_equipo_id FK
        date fecha_inicio
        date fecha_fin
        string estado "RESERVADO, BLOQUEADO, MANTENIMIENTO"
        int reserva_id FK "Null si el bloqueo es manual"
    }

    %% ==========================================
    %% 4. PAQUETES (BUNDLES)
    %% ==========================================
    Paquete ||--|{ ItemPaquete : "contiene"
    Publicacion ||--o{ ItemPaquete : "vinculada_a"

    Paquete {
        int id PK
        int propietario_id FK
        string nombre
        decimal precio_paquete_dia
        boolean esta_activo
    }

    ItemPaquete {
        int id PK
        int paquete_id FK
        int publicacion_id FK
        int cantidad
    }

    %% ==========================================
    %% 5. MOTOR TRANSACCIONAL Y RESERVAS
    %% ==========================================
    Reserva ||--|{ ItemReserva : "desglosa"
    Reserva ||--|| ContratoDigital : "se_formaliza_con"
    Reserva ||--o| Pago : "se_liquida_con"
    Reserva ||--o| PolizaSeguro : "se_asegura_con"

    Reserva {
        int id PK
        string codigo_reserva UK "ART-2025-XXXX"
        int cliente_id FK
        int propietario_id FK
        date fecha_inicio
        date fecha_fin
        int total_dias
        decimal subtotal
        decimal comision_plataforma
        decimal costo_seguro
        decimal monto_total
        string estado "ESPERANDO_FIRMAS, PAGADO, ACTIVO, COMPLETADO, DISPUTA"
        timestamp creado_en
    }

    ItemReserva {
        int id PK
        int reserva_id FK
        int publicacion_id FK
        int paquete_id FK "Null si es item individual"
        int unidad_equipo_id FK "El Número de Serie específico"
        decimal precio_congelado "Precio al momento de reservar"
    }

    %% ==========================================
    %% 6. LEGAL Y FINANZAS
    %% ==========================================
    ContratoDigital {
        int id PK
        int reserva_id FK
        string version "v1.0-2025"
        
        %% Firmas Bilaterales
        timestamp firmado_por_dueno_en
        string hash_firma_dueno "Prueba criptográfica"
        string url_pdf_dueno
        
        timestamp firmado_por_cliente_en
        string hash_firma_cliente "Prueba criptográfica"
        string url_pdf_cliente
        
        string estado "PENDIENTE, FIRMADO_PARCIAL, EJECUTADO"
    }

    Pago {
        int id PK
        int reserva_id FK
        string stripe_id "ID de la transacción"
        string estado_pago "AUTORIZADO, CAPTURADO, REEMBOLSADO"
        decimal deposito_garantia_monto "Dinero retenido en escrow"
        timestamp creado_en
    }

    PolizaSeguro {
        int id PK
        int reserva_id FK
        string numero_poliza UK
        string aseguradora
        string estado_cobertura "ACTIVA, RECLAMO_ABIERTO, CERRADA"
    }

    %% ==========================================
    %% 7. COMUNICACIÓN Y RESEÑAS
    %% ==========================================
    Conversacion ||--o{ Mensaje : "contiene"
    Reserva ||--o{ Resena : "genera"

    Conversacion {
        int id PK
        int reserva_id FK "Opcional: puede iniciar antes de reservar"
        timestamp creado_en
    }

    Mensaje {
        int id PK
        int conversacion_id FK
        int remitente_id FK
        text contenido
        timestamp enviado_en
    }

    Resena {
        int id PK
        int reserva_id FK
        int autor_id FK
        int destino_id FK "Usuario calificado (Dueño o Cliente)"
        int calificacion "1 a 5"
        text comentario
        timestamp creado_en
    }
```

### Consideraciones para tu equipo de desarrollo:

1.  **Lógica del Contrato Digital:** La tabla `ContratoDigital` está diseñada para que el flujo de firmas sea asíncrono. El sistema no debe permitir que la reserva pase al estado `ACTIVO` (entrega de equipo) si el `estado` del contrato no es `EJECUTADO`.
2.  **Identificación por Número de Serie:** Al eliminar los QRs, el `numero_serie` de la tabla `UnidadEquipo` es el dato legal más importante. Este debe aparecer automáticamente en las cláusulas del PDF generado para que el contrato sea vinculante sobre un objeto específico.
3.  **Seguridad Financiera:** La tabla `Pago` incluye `deposito_garantia_monto`. Esto es fundamental para ArtRider: es el monto que se "bloquea" en la tarjeta del cliente y solo se libera si el propietario confirma que el equipo volvió en buen estado.
4.  **Ubicación y Logística:** La tabla `Direccion` permite que una `Publicación` tenga una ubicación física distinta a la del `Usuario`. Esto es útil si un propietario tiene sus equipos en diferentes bodegas o ciudades.

</details>