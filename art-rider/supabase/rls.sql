-- =========================================================
-- SECURE RLS POLICIES FOR ARTRIDER
-- =========================================================

-- 1. Users
CREATE POLICY "Users can read own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users cannot insert profiles directly" ON users FOR INSERT WITH CHECK (false);
CREATE POLICY "Users can update own profile safely" ON users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users cannot delete profiles" ON users FOR DELETE USING (false);

-- 2. Addresses
CREATE POLICY "Users can read own addresses" ON addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own addresses" ON addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own addresses safely" ON addresses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own addresses" ON addresses FOR DELETE USING (auth.uid() = user_id);

-- 3. Product Catalog
CREATE POLICY "Public read for authenticated users" ON product_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "Prevent insert for non-admins" ON product_catalog FOR INSERT WITH CHECK (false);
CREATE POLICY "Prevent update for non-admins" ON product_catalog FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "Prevent delete for non-admins" ON product_catalog FOR DELETE USING (false);

-- 4. Listings
CREATE POLICY "Anyone can read published listings" ON listings FOR SELECT USING (is_published = true OR auth.uid() = owner_id);
CREATE POLICY "Owners can insert listings" ON listings FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update listings safely" ON listings FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can delete listings" ON listings FOR DELETE USING (auth.uid() = owner_id);

-- 5. Physical Units
CREATE POLICY "Listing owners can view units" ON physical_units FOR SELECT USING (
    EXISTS (SELECT 1 FROM listings WHERE listings.id = physical_units.listing_id AND listings.owner_id = auth.uid())
);
CREATE POLICY "Listing owners can insert units" ON physical_units FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_id AND listings.owner_id = auth.uid())
);
CREATE POLICY "Listing owners can update units safely" ON physical_units FOR UPDATE USING (
    EXISTS (SELECT 1 FROM listings WHERE listings.id = physical_units.listing_id AND listings.owner_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_id AND listings.owner_id = auth.uid())
);
CREATE POLICY "Listing owners can delete units" ON physical_units FOR DELETE USING (
    EXISTS (SELECT 1 FROM listings WHERE listings.id = physical_units.listing_id AND listings.owner_id = auth.uid())
);

-- 6. Availability Calendar
CREATE POLICY "Users can read availability" ON availability_calendar FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners can insert availability" ON availability_calendar FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM physical_units
        JOIN listings ON physical_units.listing_id = listings.id
        WHERE physical_units.id = physical_unit_id AND listings.owner_id = auth.uid()
    )
);
CREATE POLICY "Owners can update availability safely" ON availability_calendar FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM physical_units
        JOIN listings ON physical_units.listing_id = listings.id
        WHERE physical_units.id = availability_calendar.physical_unit_id AND listings.owner_id = auth.uid()
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM physical_units
        JOIN listings ON physical_units.listing_id = listings.id
        WHERE physical_units.id = physical_unit_id AND listings.owner_id = auth.uid()
    )
);
CREATE POLICY "Owners can delete availability" ON availability_calendar FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM physical_units
        JOIN listings ON physical_units.listing_id = listings.id
        WHERE physical_units.id = availability_calendar.physical_unit_id AND listings.owner_id = auth.uid()
    )
);

-- 7. Bookings
CREATE POLICY "Bookings visible to renter and owner" ON bookings FOR SELECT USING (auth.uid() IN (renter_id, owner_id));
CREATE POLICY "Only renter can insert bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = renter_id);
CREATE POLICY "Renter and owner can update bookings safely" ON bookings FOR UPDATE USING (auth.uid() IN (renter_id, owner_id)) WITH CHECK (auth.uid() IN (renter_id, owner_id));
CREATE POLICY "Prevent delete bookings" ON bookings FOR DELETE USING (false);

-- 8. Booking Units
CREATE POLICY "Booking units visible to renter and owner" ON booking_units FOR SELECT USING (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_units.booking_id AND auth.uid() IN (bookings.renter_id, bookings.owner_id))
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

-- 9. Payments
CREATE POLICY "Payments visible to renter and owner" ON payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND auth.uid() IN (bookings.renter_id, bookings.owner_id))
);
CREATE POLICY "Prevent insert payments" ON payments FOR INSERT WITH CHECK (false);
CREATE POLICY "Prevent update payments" ON payments FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "Prevent delete payments" ON payments FOR DELETE USING (false);

-- 10. Digital Contracts
CREATE POLICY "Contracts visible to renter and owner" ON digital_contracts FOR SELECT USING (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = digital_contracts.booking_id AND auth.uid() IN (bookings.renter_id, bookings.owner_id))
);
CREATE POLICY "Prevent user inserts contracts" ON digital_contracts FOR INSERT WITH CHECK (false);
CREATE POLICY "Contracts updatable safely by both parties" ON digital_contracts FOR UPDATE USING (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = digital_contracts.booking_id AND auth.uid() IN (bookings.renter_id, bookings.owner_id))
) WITH CHECK (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_id AND auth.uid() IN (bookings.renter_id, bookings.owner_id))
);
CREATE POLICY "Prevent delete contracts" ON digital_contracts FOR DELETE USING (false);

-- 11. Conversations
CREATE POLICY "Conversations visible to participants" ON conversations FOR SELECT USING (auth.uid() IN (renter_id, owner_id));
CREATE POLICY "Participants can explicitly insert conversations" ON conversations FOR INSERT WITH CHECK (auth.uid() IN (renter_id, owner_id));
CREATE POLICY "Participants can update conversations safely" ON conversations FOR UPDATE USING (auth.uid() IN (renter_id, owner_id)) WITH CHECK (auth.uid() IN (renter_id, owner_id));
CREATE POLICY "Prevent delete conversations" ON conversations FOR DELETE USING (false);

-- 12. Messages
CREATE POLICY "Messages visible to conversation participants" ON messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND auth.uid() IN (conversations.renter_id, conversations.owner_id))
);
CREATE POLICY "Participants can insert own messages securely" ON messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (SELECT 1 FROM conversations WHERE conversations.id = conversation_id AND auth.uid() IN (conversations.renter_id, conversations.owner_id))
);
CREATE POLICY "Prevent update messages" ON messages FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "Prevent delete messages" ON messages FOR DELETE USING (false);
