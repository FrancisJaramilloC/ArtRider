    -- =========================================================
    -- SECURE RLS POLICIES FOR ARTRIDER (PRODUCTION SCHEMA)
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
    CREATE POLICY "Public providers are viewable by everyone" ON providers FOR SELECT USING (true);
    CREATE POLICY "Users can manage own provider profile" ON providers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

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

    -- 6. Listings
    CREATE POLICY "Anyone can read published listings" ON listings FOR SELECT USING (is_published = true OR auth.uid() = owner_id);
    CREATE POLICY "Owners can insert listings" ON listings FOR INSERT WITH CHECK (auth.uid() = owner_id);
    CREATE POLICY "Owners can update listings safely" ON listings FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
    CREATE POLICY "Owners can delete listings" ON listings FOR DELETE USING (auth.uid() = owner_id);

    -- 7. Equipment Units (Replaces Physical Units)
    CREATE POLICY "Listing owners can view units" ON equipment_units FOR SELECT USING (
        EXISTS (SELECT 1 FROM listings WHERE listings.id = equipment_units.listing_id AND listings.owner_id = auth.uid())
    );
    CREATE POLICY "Listing owners can insert units" ON equipment_units FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_id AND listings.owner_id = auth.uid())
    );
    CREATE POLICY "Listing owners can update units safely" ON equipment_units FOR UPDATE USING (
        EXISTS (SELECT 1 FROM listings WHERE listings.id = equipment_units.listing_id AND listings.owner_id = auth.uid())
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_id AND listings.owner_id = auth.uid())
    );
    CREATE POLICY "Listing owners can delete units" ON equipment_units FOR DELETE USING (
        EXISTS (SELECT 1 FROM listings WHERE listings.id = equipment_units.listing_id AND listings.owner_id = auth.uid())
    );

    -- 8. Bookings
    CREATE POLICY "Bookings visible to client and owner" ON bookings FOR SELECT USING (auth.uid() IN (client_id, owner_id));
    CREATE POLICY "Only client can insert bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = client_id);
    CREATE POLICY "Client and owner can update bookings safely" ON bookings FOR UPDATE USING (auth.uid() IN (client_id, owner_id)) WITH CHECK (auth.uid() IN (client_id, owner_id));
    CREATE POLICY "Prevent delete bookings" ON bookings FOR DELETE USING (false);

    -- 9. Booking Units
    CREATE POLICY "Booking units visible to client and owner" ON booking_units FOR SELECT USING (
        EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_units.booking_id AND auth.uid() IN (bookings.client_id, bookings.owner_id))
    );
    CREATE POLICY "Only owner can insert booking units" ON booking_units FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_id AND bookings.owner_id = auth.uid())
    );
    CREATE POLICY "Only owner can update booking units safely" ON booking_units FOR UPDATE USING (
        EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_units.booking_id AND bookings.owner_id = auth.uid())
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_id AND bookings.owner_id = auth.uid())
    );
    CREATE POLICY "Only owner can delete booking units" ON booking_units FOR DELETE USING (
        EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_units.booking_id AND bookings.owner_id = auth.uid())
    );

    -- 10. Availability Calendar
    CREATE POLICY "Users can read availability" ON availability_calendar FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Owners can insert availability" ON availability_calendar FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM equipment_units
            JOIN listings ON equipment_units.listing_id = listings.id
            WHERE equipment_units.id = availability_calendar.equipment_unit_id AND listings.owner_id = auth.uid()
        )
    );
    CREATE POLICY "Owners can update availability safely" ON availability_calendar FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM equipment_units
            JOIN listings ON equipment_units.listing_id = listings.id
            WHERE equipment_units.id = availability_calendar.equipment_unit_id AND listings.owner_id = auth.uid()
        )
    );
    CREATE POLICY "Owners can delete availability" ON availability_calendar FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM equipment_units
            JOIN listings ON equipment_units.listing_id = listings.id
            WHERE equipment_units.id = availability_calendar.equipment_unit_id AND listings.owner_id = auth.uid()
        )
    );

    -- 11. Payments
    CREATE POLICY "Payments visible to client and owner" ON payments FOR SELECT USING (
        EXISTS (SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND auth.uid() IN (bookings.client_id, bookings.owner_id))
    );
    CREATE POLICY "Prevent insert payments" ON payments FOR INSERT WITH CHECK (false);
    CREATE POLICY "Prevent update payments" ON payments FOR UPDATE USING (false) WITH CHECK (false);
    CREATE POLICY "Prevent delete payments" ON payments FOR DELETE USING (false);

    -- 12. Digital Contracts
    CREATE POLICY "Contracts visible to client and owner" ON digital_contracts FOR SELECT USING (
        EXISTS (SELECT 1 FROM bookings WHERE bookings.id = digital_contracts.booking_id AND auth.uid() IN (bookings.client_id, bookings.owner_id))
    );
    CREATE POLICY "Prevent user inserts contracts" ON digital_contracts FOR INSERT WITH CHECK (false);
    CREATE POLICY "Contracts updatable safely by both parties" ON digital_contracts FOR UPDATE USING (
        EXISTS (SELECT 1 FROM bookings WHERE bookings.id = digital_contracts.booking_id AND auth.uid() IN (bookings.client_id, bookings.owner_id))
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_id AND auth.uid() IN (bookings.client_id, bookings.owner_id))
    );
    CREATE POLICY "Prevent delete contracts" ON digital_contracts FOR DELETE USING (false);

    -- 13. Conversations
    -- Note: Conversations map functionally to booking_id now. Handled via join strictly keeping boundaries fluid.
    CREATE POLICY "Conversations visible to participants" ON conversations FOR SELECT USING (
        EXISTS (SELECT 1 FROM bookings WHERE bookings.id = conversations.booking_id AND auth.uid() IN (bookings.client_id, bookings.owner_id))
    );
    CREATE POLICY "Participants can explicitly insert conversations" ON conversations FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_id AND auth.uid() IN (bookings.client_id, bookings.owner_id))
    );
    CREATE POLICY "Participants can update conversations safely" ON conversations FOR UPDATE USING (
        EXISTS (SELECT 1 FROM bookings WHERE bookings.id = conversations.booking_id AND auth.uid() IN (bookings.client_id, bookings.owner_id))
    );
    CREATE POLICY "Prevent delete conversations" ON conversations FOR DELETE USING (false);

    -- 14. Messages
    CREATE POLICY "Messages visible to conversation participants" ON messages FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations
            JOIN bookings ON conversations.booking_id = bookings.id
            WHERE conversations.id = messages.conversation_id AND auth.uid() IN (bookings.client_id, bookings.owner_id)
        )
    );
    CREATE POLICY "Participants can insert own messages securely" ON messages FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM conversations
            JOIN bookings ON conversations.booking_id = bookings.id
            WHERE conversations.id = conversation_id AND auth.uid() IN (bookings.client_id, bookings.owner_id)
        )
    );
    CREATE POLICY "Prevent update messages" ON messages FOR UPDATE USING (false) WITH CHECK (false);
    CREATE POLICY "Prevent delete messages" ON messages FOR DELETE USING (false);
