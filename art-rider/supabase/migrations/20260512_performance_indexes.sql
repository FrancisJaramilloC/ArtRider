-- =========================================================
-- ArtRider Performance Optimization — 2026-05-12
-- Adds B-Tree indexes to all foreign keys and heavily queried fields
-- =========================================================

-- ─────────────────────────────────────────────────────────
-- 1. FOREIGN KEY INDEXES
-- ─────────────────────────────────────────────────────────
-- identity_verifications
CREATE INDEX IF NOT EXISTS idx_identity_verifications_user_id ON identity_verifications(user_id);

-- providers
CREATE INDEX IF NOT EXISTS idx_providers_user_id ON providers(user_id);

-- addresses
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);

-- listings
CREATE INDEX IF NOT EXISTS idx_listings_provider_id ON listings(provider_id);
CREATE INDEX IF NOT EXISTS idx_listings_catalog_item_id ON listings(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_listings_address_id ON listings(address_id);

-- equipment_units
CREATE INDEX IF NOT EXISTS idx_equipment_units_listing_id ON equipment_units(listing_id);

-- bookings
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON bookings(provider_id);

-- booking_units
CREATE INDEX IF NOT EXISTS idx_booking_units_booking_id ON booking_units(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_units_equipment_unit_id ON booking_units(equipment_unit_id);

-- availability_calendar
CREATE INDEX IF NOT EXISTS idx_availability_calendar_equipment_unit_id ON availability_calendar(equipment_unit_id);
CREATE INDEX IF NOT EXISTS idx_availability_calendar_booking_id ON availability_calendar(booking_id);

-- payments
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);

-- digital_contracts
CREATE INDEX IF NOT EXISTS idx_digital_contracts_booking_id ON digital_contracts(booking_id);

-- conversations
CREATE INDEX IF NOT EXISTS idx_conversations_booking_id ON conversations(booking_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_provider_id ON conversations(provider_id);
CREATE INDEX IF NOT EXISTS idx_conversations_listing_id ON conversations(listing_id);

-- messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- packages (si aplica, con IF NOT EXISTS para mayor seguridad)
CREATE INDEX IF NOT EXISTS idx_packages_provider_id ON packages(provider_id);
CREATE INDEX IF NOT EXISTS idx_package_items_package_id ON package_items(package_id);
CREATE INDEX IF NOT EXISTS idx_package_items_listing_id ON package_items(listing_id);


-- ─────────────────────────────────────────────────────────
-- 2. HEAVILY QUERIED FIELDS (STATUS, FILTERS, DELETED_AT)
-- ─────────────────────────────────────────────────────────

-- identity_verifications
CREATE INDEX IF NOT EXISTS idx_identity_verifications_status ON identity_verifications(status);

-- providers
CREATE INDEX IF NOT EXISTS idx_providers_status ON providers(status);

-- equipment_units
CREATE INDEX IF NOT EXISTS idx_equipment_units_internal_status ON equipment_units(internal_status);

-- bookings
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- availability_calendar
CREATE INDEX IF NOT EXISTS idx_availability_calendar_status ON availability_calendar(status);

-- payments
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- digital_contracts
CREATE INDEX IF NOT EXISTS idx_digital_contracts_status ON digital_contracts(status);

-- listings (Catálogo y Soft Deletes)
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_is_published ON listings(is_published);
CREATE INDEX IF NOT EXISTS idx_listings_deleted_at ON listings(deleted_at);

-- Perfiles y Soft Deletes
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at);

-- Addresses Soft Deletes
CREATE INDEX IF NOT EXISTS idx_addresses_deleted_at ON addresses(deleted_at);


-- ─────────────────────────────────────────────────────────
-- 3. CUSTOMER REQUESTED: ADDRESS LOCATION SEARCHES
-- ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_addresses_city ON addresses(city);
CREATE INDEX IF NOT EXISTS idx_addresses_state ON addresses(state);
