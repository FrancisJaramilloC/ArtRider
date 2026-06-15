    -- =========================================================
    -- SECURE RLS POLICIES FOR ARTRIDER (PRODUCTION SCHEMA)
    -- Updated: 2026-05-11 — provider_id consolidation
    -- =========================================================

    -- Note: Ensure ALL previously written RLS policies are dropped if modifying a live database
    -- manually. If applying directly to an empty schema map, simply execute everything below.

    -- 1. Profiles (Core User Model)
    CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
    CREATE POLICY "Users cannot insert profiles directly" ON profiles FOR INSERT WITH CHECK (false);
    CREATE POLICY "Users can update own profile safely" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
    CREATE POLICY "Users cannot delete profiles" ON profiles FOR DELETE USING (false);

    -- 2. Identity Verifications (Global KYC)
    CREATE POLICY "Users can view own verifications" ON identity_verifications FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Prevent user manipulation of verifications" ON identity_verifications FOR INSERT WITH CHECK (false);
    CREATE POLICY "Prevent user updates to verifications" ON identity_verifications FOR UPDATE USING (false) WITH CHECK (false);
    CREATE POLICY "Prevent user deletion of verifications" ON identity_verifications FOR DELETE USING (false);

    -- 3. Providers (Business Extension)
    CREATE POLICY "providers_public_read" ON providers FOR SELECT USING (true);
    CREATE POLICY "providers_owner_insert" ON providers FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "providers_owner_update" ON providers FOR UPDATE
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "providers_prevent_delete" ON providers FOR DELETE USING (false);

    -- 4. Addresses
    CREATE POLICY "Users can read own addresses" ON addresses FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert own addresses" ON addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update own addresses safely" ON addresses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can delete own addresses" ON addresses FOR DELETE USING (auth.uid() = user_id);

    -- 5. Product Catalog
    CREATE POLICY "Public read for authenticated users" ON product_catalog FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Prevent insert for non-admins" ON product_catalog FOR INSERT WITH CHECK (false);
    CREATE POLICY "Prevent update for non-admins" ON product_catalog FOR UPDATE USING (false) WITH CHECK (false);
    CREATE POLICY "Prevent delete for non-admins" ON product_catalog FOR DELETE USING (false);

    -- 6. Listings (provider_id → providers)
    CREATE POLICY "listings_read" ON listings FOR SELECT
      USING (is_published = true OR is_my_provider(provider_id));
    CREATE POLICY "listings_insert" ON listings FOR INSERT
      WITH CHECK (is_my_provider(provider_id));
    CREATE POLICY "listings_update" ON listings FOR UPDATE
      USING  (is_my_provider(provider_id))
      WITH CHECK (is_my_provider(provider_id));
    CREATE POLICY "listings_delete" ON listings FOR DELETE
      USING (is_my_provider(provider_id));

    -- 7. Equipment Units
    CREATE POLICY "equipment_units_provider_read" ON equipment_units FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM listings WHERE listings.id = equipment_units.listing_id AND is_my_provider(listings.provider_id))
      );
    CREATE POLICY "equipment_units_provider_insert" ON equipment_units FOR INSERT
      WITH CHECK (
        EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_id AND is_my_provider(listings.provider_id))
      );
    CREATE POLICY "equipment_units_provider_update" ON equipment_units FOR UPDATE
      USING (
        EXISTS (SELECT 1 FROM listings WHERE listings.id = equipment_units.listing_id AND is_my_provider(listings.provider_id))
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_id AND is_my_provider(listings.provider_id))
      );
    CREATE POLICY "equipment_units_provider_delete" ON equipment_units FOR DELETE
      USING (
        EXISTS (SELECT 1 FROM listings WHERE listings.id = equipment_units.listing_id AND is_my_provider(listings.provider_id))
      );
    -- Client booking read (unchanged)
    CREATE POLICY "equipment_units_client_booking_read" ON equipment_units FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM booking_units
          JOIN bookings ON bookings.id = booking_units.booking_id
          WHERE booking_units.equipment_unit_id = equipment_units.id
            AND bookings.client_id = auth.uid()
        )
      );

    -- 8. Bookings (provider_id → providers)
    CREATE POLICY "bookings_read" ON bookings FOR SELECT
      USING (auth.uid() = client_id OR is_my_provider(provider_id));
    CREATE POLICY "bookings_insert" ON bookings FOR INSERT
      WITH CHECK (auth.uid() = client_id);
    CREATE POLICY "bookings_update" ON bookings FOR UPDATE
      USING  (auth.uid() = client_id OR is_my_provider(provider_id))
      WITH CHECK (auth.uid() = client_id OR is_my_provider(provider_id));
    CREATE POLICY "bookings_prevent_delete" ON bookings FOR DELETE USING (false);

    -- 9. Booking Units
    CREATE POLICY "booking_units_read" ON booking_units FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_units.booking_id AND (auth.uid() = bookings.client_id OR is_my_provider(bookings.provider_id)))
      );
    CREATE POLICY "booking_units_provider_insert" ON booking_units FOR INSERT
      WITH CHECK (
        EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_id AND is_my_provider(bookings.provider_id))
      );
    CREATE POLICY "booking_units_provider_update" ON booking_units FOR UPDATE
      USING (
        EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_units.booking_id AND is_my_provider(bookings.provider_id))
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_id AND is_my_provider(bookings.provider_id))
      );
    CREATE POLICY "booking_units_provider_delete" ON booking_units FOR DELETE
      USING (
        EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_units.booking_id AND is_my_provider(bookings.provider_id))
      );

    -- 10. Availability Calendar
    CREATE POLICY "availability_public_read" ON availability_calendar FOR SELECT TO authenticated USING (true);
    CREATE POLICY "availability_provider_insert" ON availability_calendar FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM equipment_units
          JOIN listings ON equipment_units.listing_id = listings.id
          WHERE equipment_units.id = availability_calendar.equipment_unit_id AND is_my_provider(listings.provider_id)
        )
      );
    CREATE POLICY "availability_provider_update" ON availability_calendar FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM equipment_units
          JOIN listings ON equipment_units.listing_id = listings.id
          WHERE equipment_units.id = availability_calendar.equipment_unit_id AND is_my_provider(listings.provider_id)
        )
      );
    CREATE POLICY "availability_provider_delete" ON availability_calendar FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM equipment_units
          JOIN listings ON equipment_units.listing_id = listings.id
          WHERE equipment_units.id = availability_calendar.equipment_unit_id AND is_my_provider(listings.provider_id)
        )
      );

    -- 11. Payments
    CREATE POLICY "payments_read" ON payments FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND (auth.uid() = bookings.client_id OR is_my_provider(bookings.provider_id)))
      );
    CREATE POLICY "Prevent insert payments" ON payments FOR INSERT WITH CHECK (false);
    CREATE POLICY "Prevent update payments" ON payments FOR UPDATE USING (false) WITH CHECK (false);
    CREATE POLICY "Prevent delete payments" ON payments FOR DELETE USING (false);

    -- 12. Digital Contracts
    CREATE POLICY "contracts_read" ON digital_contracts FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM bookings WHERE bookings.id = digital_contracts.booking_id AND (auth.uid() = bookings.client_id OR is_my_provider(bookings.provider_id)))
      );
    CREATE POLICY "Prevent user inserts contracts" ON digital_contracts FOR INSERT WITH CHECK (false);
    CREATE POLICY "contracts_update" ON digital_contracts FOR UPDATE
      USING (
        EXISTS (SELECT 1 FROM bookings WHERE bookings.id = digital_contracts.booking_id AND (auth.uid() = bookings.client_id OR is_my_provider(bookings.provider_id)))
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_id AND (auth.uid() = bookings.client_id OR is_my_provider(bookings.provider_id)))
      );
    CREATE POLICY "Prevent delete contracts" ON digital_contracts FOR DELETE USING (false);

    -- 13. Conversations
    CREATE POLICY "conversations_read" ON conversations FOR SELECT
      USING (auth.uid() = client_id OR is_my_provider(provider_id));
    CREATE POLICY "conversations_insert" ON conversations FOR INSERT
      WITH CHECK (auth.uid() = client_id);
    CREATE POLICY "conversations_update" ON conversations FOR UPDATE
      USING (auth.uid() = client_id OR is_my_provider(provider_id));
    CREATE POLICY "Prevent delete conversations" ON conversations FOR DELETE USING (false);

    -- 14. Messages
    CREATE POLICY "messages_read" ON messages FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM conversations
          WHERE conversations.id = messages.conversation_id AND (auth.uid() = conversations.client_id OR is_my_provider(conversations.provider_id))
        )
      );
    CREATE POLICY "messages_insert" ON messages FOR INSERT
      WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
          SELECT 1 FROM conversations
          WHERE conversations.id = conversation_id AND (auth.uid() = conversations.client_id OR is_my_provider(conversations.provider_id))
        )
      );
    CREATE POLICY "Prevent update messages" ON messages FOR UPDATE USING (false) WITH CHECK (false);
    CREATE POLICY "Prevent delete messages" ON messages FOR DELETE USING (false);
