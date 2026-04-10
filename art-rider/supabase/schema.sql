-- =========================================================
-- ArtRider - Production Schema (Refactored Architecture)
-- =========================================================

-- =========================================================
-- 1. EXTENSIONS
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- =========================================================
-- 2. ENUMS
-- =========================================================

CREATE TYPE booking_status AS ENUM ('AWAITING_SIGNATURES', 'PAID', 'ACTIVE', 'COMPLETED', 'DISPUTE', 'CANCELLED');
CREATE TYPE payment_status AS ENUM ('AUTHORIZED', 'CAPTURED', 'REFUNDED');
CREATE TYPE contract_status AS ENUM ('PENDING', 'PARTIALLY_SIGNED', 'EXECUTED');
CREATE TYPE calendar_status AS ENUM ('BOOKED', 'BLOCKED', 'MAINTENANCE');

-- =========================================================
-- 3. CORE USER MODEL (PROFILES)
-- =========================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  birth_date DATE,
  phone TEXT UNIQUE,
  avatar_url TEXT,
  avatar_updated_at TIMESTAMPTZ,
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 4. KYC (GLOBAL)
-- =========================================================

CREATE TABLE identity_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  provider_ref TEXT,
  status TEXT DEFAULT 'pending', -- pending, verified, rejected
  verified_at TIMESTAMPTZ
);
ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 5. PROVIDERS (EXTENSION)
-- =========================================================

CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  brand_name TEXT,
  bio TEXT,
  status TEXT DEFAULT 'pending', -- pending, active, suspended
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

-- RLS: provider can only read/write their own record
CREATE POLICY "providers_user_read" ON providers
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "providers_user_insert" ON providers
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "providers_user_update" ON providers
  FOR UPDATE USING (auth.uid() = user_id);

-- =========================================================
-- 6. ADDRESSES
-- =========================================================

CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
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

-- =========================================================
-- 7. PRODUCT CATALOG
-- =========================================================

CREATE TABLE product_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  model TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 8. LISTINGS
-- =========================================================

CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  catalog_item_id UUID REFERENCES product_catalog(id),
  address_id UUID REFERENCES addresses(id),
  title TEXT,
  brand TEXT,
  model TEXT,
  category TEXT CHECK (category IN ('audio', 'lighting', 'video', 'effects', 'other')),
  cover_image_url TEXT,
  daily_price INTEGER NOT NULL,
  description TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- RLS: public reads published; owner reads/writes all their own
CREATE POLICY "listings_public_read" ON listings
  FOR SELECT USING (is_published = true OR auth.uid() = owner_id);
CREATE POLICY "listings_owner_insert" ON listings
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "listings_owner_update" ON listings
  FOR UPDATE USING (auth.uid() = owner_id);

-- =========================================================
-- 9. EQUIPMENT UNITS (CRITICAL MODEL)
-- =========================================================

CREATE TABLE equipment_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  serial_number TEXT NOT NULL,
  condition TEXT,
  internal_status TEXT DEFAULT 'AVAILABLE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, serial_number)
);
ALTER TABLE equipment_units ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 10. BOOKINGS
-- =========================================================

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES profiles(id),
  owner_id UUID REFERENCES profiles(id),
  status booking_status DEFAULT 'AWAITING_SIGNATURES',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_price INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (start_date <= end_date)
);
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 11. BOOKING ITEMS
-- =========================================================

CREATE TABLE booking_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  equipment_unit_id UUID REFERENCES equipment_units(id),
  locked_daily_price INTEGER NOT NULL
);
ALTER TABLE booking_units ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 12. AVAILABILITY CALENDAR
-- =========================================================

CREATE TABLE availability_calendar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_unit_id UUID REFERENCES equipment_units(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status calendar_status NOT NULL,
  booking_id UUID REFERENCES bookings(id),
  CHECK (start_date <= end_date),
  EXCLUDE USING gist (
    equipment_unit_id WITH =,
    daterange(start_date, end_date, '[]') WITH &&
  )
);
ALTER TABLE availability_calendar ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 13. PAYMENTS
-- =========================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id),
  stripe_payment_intent_id TEXT UNIQUE,
  amount INTEGER NOT NULL,
  status payment_status DEFAULT 'AUTHORIZED'
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 14. CONTRACTS
-- =========================================================

CREATE TABLE digital_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID UNIQUE REFERENCES bookings(id),
  status contract_status DEFAULT 'PENDING',
  contract_hash TEXT
);
ALTER TABLE digital_contracts ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 15. MESSAGING
-- =========================================================

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id),
  sender_id UUID REFERENCES profiles(id),
  content TEXT
);