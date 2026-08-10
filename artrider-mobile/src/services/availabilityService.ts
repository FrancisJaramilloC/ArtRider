import { supabase } from './supabase';

/**
 * Fechas no disponibles para un listing (reservas activas + bloqueos manuales).
 * Usa la función RPC get_unavailable_dates, que corre con privilegios elevados
 * en la base de datos para poder cruzar bookings/equipment_units sin que RLS
 * bloquee la consulta — pero solo devuelve fechas, nunca datos de la reserva.
 */
export async function getUnavailableDates(listingId: string): Promise<string[]> {
    const { data, error } = await supabase.rpc('get_unavailable_dates', {
        p_listing_id: listingId,
    });

    if (error) {
        console.error('[availabilityService] getUnavailableDates:', error.message);
        return [];
    }

    return (data ?? []) as string[];
}

export async function checkAvailability(
    listingId: string,
    startDateStr: string,
    endDateStr: string
): Promise<boolean> {
    const unavailableDates = await getUnavailableDates(listingId);
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    const curr = new Date(start);
    while (curr <= end) {
        const dateStr = curr.toISOString().split('T')[0];
        if (unavailableDates.includes(dateStr)) return false;
        curr.setDate(curr.getDate() + 1);
    }

    return true;
}
/** Total de unidades que el proveedor tiene registradas para este equipo. */
export async function getListingTotalUnits(listingId: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_listing_total_units', {
        p_listing_id: listingId,
    });

    if (error) {
        console.error('[availabilityService] getListingTotalUnits:', error.message);
        return 0;
    }

    return (data as number) ?? 0;
}

/** Unidades libres para un rango de fechas específico (no solo si hay o no). */
export async function getAvailableUnitsCount(
    listingId: string,
    startDate: string,
    endDate: string
): Promise<number> {
    const { data, error } = await supabase.rpc('get_available_units_count', {
        p_listing_id: listingId,
        p_start_date: startDate,
        p_end_date: endDate,
    });

    if (error) {
        console.error('[availabilityService] getAvailableUnitsCount:', error.message);
        return 0;
    }

    return (data as number) ?? 0;
}
/** Fechas donde al menos un equipo del paquete se queda sin stock suficiente. */
export async function getPackageUnavailableDates(packageId: string): Promise<string[]> {
    const { data, error } = await supabase.rpc('get_package_unavailable_dates', {
        p_package_id: packageId,
    });

    if (error) {
        console.error('[availabilityService] getPackageUnavailableDates:', error.message);
        return [];
    }

    return (data ?? []) as string[];
}