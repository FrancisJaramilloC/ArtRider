"use server";

import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function getUnavailableDates(listingId: string): Promise<string[]> {
  try {
    const supabase = createSupabaseAdminClient();
    
    // Get all units for this listing
    const { data: units, error: unitsError } = await supabase
      .from("equipment_units")
      .select("id")
      .eq("listing_id", listingId)
      .eq("internal_status", "AVAILABLE");
      
    if (unitsError || !units || units.length === 0) return [];
    
    const unitIds = units.map(u => u.id);
    
    // Find all bookings overlapping these units that are not cancelled or archived
    const { data: bookingUnits, error: bookingsError } = await supabase
      .from("booking_units")
      .select("equipment_unit_id, booking:bookings(start_date, end_date, status)")
      .in("equipment_unit_id", unitIds);
      
    if (bookingsError || !bookingUnits) return [];

    // Get manual blocks from availability_calendar (MAINTENANCE + BLOCKED only — BOOKED already covered via bookingUnits above)
    const { data: calendarBlocks, error: calendarError } = await supabase
      .from("availability_calendar")
      .select("start_date, end_date, status")
      .in("equipment_unit_id", unitIds)
      .in("status", ["MAINTENANCE", "BLOCKED"]);

    const blockedDates = new Set<string>();

    const addDateRange = (startStr: string, endStr: string) => {
      let start = new Date(startStr);
      const end = new Date(endStr);
      while (start <= end) {
        blockedDates.add(start.toISOString().split("T")[0]);
        start.setDate(start.getDate() + 1);
      }
    };

    // Note: In a real robust system, we check if *all* units are booked.
    // For simplicity here, since most listings have 1 unit, any booking blocks the date.
    bookingUnits.forEach((bu) => {
      const b = bu.booking as any;
      if (b && b.status !== "CANCELLED" && b.status !== "ARCHIVED") {
        addDateRange(b.start_date, b.end_date);
      }
    });

    if (calendarBlocks) {
      calendarBlocks.forEach((block) => {
        addDateRange(block.start_date, block.end_date);
      });
    }

    return Array.from(blockedDates);
  } catch (e) {
    console.error("[availabilityService] error:", e);
    return [];
  }
}

export async function checkAvailability(listingId: string, startDateStr: string, endDateStr: string): Promise<boolean> {
  const unavailableDates = await getUnavailableDates(listingId);
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  
  let curr = new Date(start);
  while (curr <= end) {
    const dateStr = curr.toISOString().split("T")[0];
    if (unavailableDates.includes(dateStr)) return false;
    curr.setDate(curr.getDate() + 1);
  }
  
  return true;
}
