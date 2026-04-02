-- =========================================================
-- ArtRider - Initial Prototype Database Schema (Supabase)
-- =========================================================

-- =========================================================
-- 1. EXTENSIONS & CUSTOM TYPES (ENUMS)
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- NOTE: Requires DB configuration to enable btree_gist extension.
CREATE EXTENSION IF NOT EXISTS "btree_gist"; 

CREATE TYPE kyc_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE calendar_status AS ENUM ('BOOKED', 'BLOCKED', 'MAINTENANCE');
CREATE TYPE booking_status AS ENUM ('AWAITING_SIGNATURES', 'PAID', 'ACTIVE', 'COMPLETED', 'DISPUTE', 'CANCELLED');
CREATE TYPE payment_status AS ENUM ('AUTHORIZED', 'CAPTURED', 'REFUNDED');
CREATE TYPE contract_status AS ENUM ('PENDING', 'PARTIALLY_SIGNED', 'EXECUTED');

-- =========================================================
-- 2. TABLES
-- =========================================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  kyc_status kyc_status DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

CREATE TABLE product_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  model TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;

CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  catalog_item_id UUID REFERENCES product_catalog(id) ON DELETE RESTRICT,
  address_id UUID REFERENCES addresses(id) ON DELETE RESTRICT,
  daily_price INTEGER NOT NULL CHECK (daily_price >= 0),
  description TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE TABLE physical_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  serial_number TEXT NOT NULL,
  condition TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(listing_id, serial_number)
);
ALTER TABLE physical_units ENABLE ROW LEVEL SECURITY;

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  renter_id UUID REFERENCES users(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status booking_status DEFAULT 'AWAITING_SIGNATURES',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_price INTEGER NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CHECK (start_date <= end_date)
);
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE TABLE booking_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  physical_unit_id UUID REFERENCES physical_units(id) ON DELETE RESTRICT,
  locked_daily_price INTEGER NOT NULL CHECK (locked_daily_price >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE booking_units ENABLE ROW LEVEL SECURITY;

CREATE TABLE availability_calendar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  physical_unit_id UUID NOT NULL REFERENCES physical_units(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status calendar_status NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CHECK (start_date <= end_date),
  -- Requires btree_gist extension
  EXCLUDE USING gist (
    physical_unit_id WITH =, 
    daterange(start_date, end_date, '[]') WITH &&
  )
);
ALTER TABLE availability_calendar ENABLE ROW LEVEL SECURITY;

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  deposit_amount INTEGER NOT NULL CHECK (deposit_amount >= 0),
  status payment_status DEFAULT 'AUTHORIZED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE TABLE digital_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  status contract_status DEFAULT 'PENDING',
  contract_hash TEXT,
  pdf_url TEXT,
  owner_signature_hash TEXT,
  renter_signature_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE digital_contracts ENABLE ROW LEVEL SECURITY;

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  renter_id UUID REFERENCES users(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 3. INDEXES
-- =========================================================

CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_listings_owner_id ON listings(owner_id);
CREATE INDEX idx_listings_catalog_id ON listings(catalog_item_id);
CREATE INDEX idx_listings_address_id ON listings(address_id);
CREATE INDEX idx_physical_units_listing_id ON physical_units(listing_id);
CREATE INDEX idx_bookings_renter_id ON bookings(renter_id);
CREATE INDEX idx_bookings_owner_id ON bookings(owner_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_booking_units_booking_id ON booking_units(booking_id);
CREATE INDEX idx_booking_units_unit_id ON booking_units(physical_unit_id);
CREATE INDEX idx_calendar_unit_id ON availability_calendar(physical_unit_id);
CREATE INDEX idx_calendar_dates ON availability_calendar(start_date, end_date);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_conversations_renter_id ON conversations(renter_id);
CREATE INDEX idx_conversations_owner_id ON conversations(owner_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- =========================================================
-- 4. TRIGGERS & FUNCTIONS
-- =========================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tg_addresses_updated_at BEFORE UPDATE ON addresses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tg_product_catalog_updated_at BEFORE UPDATE ON product_catalog FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tg_listings_updated_at BEFORE UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tg_physical_units_updated_at BEFORE UPDATE ON physical_units FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tg_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tg_booking_units_updated_at BEFORE UPDATE ON booking_units FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tg_availability_calendar_updated_at BEFORE UPDATE ON availability_calendar FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tg_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tg_digital_contracts_updated_at BEFORE UPDATE ON digital_contracts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tg_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tg_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION check_active_booking_contract()
RETURNS TRIGGER AS $$
DECLARE
  contract_state contract_status;
BEGIN
  IF NEW.status = 'ACTIVE' AND (OLD.status IS DISTINCT FROM 'ACTIVE') THEN
    SELECT status INTO contract_state FROM digital_contracts WHERE booking_id = NEW.id;
    IF contract_state IS DISTINCT FROM 'EXECUTED' THEN
      RAISE EXCEPTION 'A booking cannot become ACTIVE unless the associated digital contract is fully EXECUTED.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_guard_booking_activation
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION check_active_booking_contract();
