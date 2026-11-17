import { supabase } from './supabase';
import { addDaysKey } from '@/utils/calendar';
import { serviceError } from '@/utils/errors';

/**
 * Fechas no disponibles para un listing (reservas activas + bloqueos manuales).
 * Usa la función RPC get_unavailable_dates, que corre con privilegios elevados
 * en la base de datos para poder cruzar bookings/equipment_units sin que RLS
 * bloquee la consulta — pero solo devuelve fechas, nunca datos de la reserva.
 * Lanza si falla: un error no debe verse como «todo disponible».
 */
export async function getUnavailableDates(listingId: string): Promise<string[]> {
    const { data, error } = await supabase.rpc('get_unavailable_dates', {
        p_listing_id: listingId,
    });

    if (error) {
        throw serviceError('[availabilityService] getUnavailableDates', error);
    }

    return (data ?? []) as string[];
}

export async function checkAvailability(
    listingId: string,
    startDateStr: string,
    endDateStr: string
): Promise<boolean> {
    const blocked = new Set(await getUnavailableDates(listingId));
    for (let cursor = startDateStr; cursor <= endDateStr; cursor = addDaysKey(cursor, 1)) {
        if (blocked.has(cursor)) return false;
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

/** Unidades libres para un rango de fechas; lanza si falla la consulta. */
export async function fetchAvailableUnitsCount(
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
        throw serviceError('[availabilityService] fetchAvailableUnitsCount', error);
    }

    return (data as number) ?? 0;
}

/** Igual que fetchAvailableUnitsCount, pero devuelve 0 si falla (pantallas que no muestran el error). */
export async function getAvailableUnitsCount(
    listingId: string,
    startDate: string,
    endDate: string
): Promise<number> {
    try {
        return await fetchAvailableUnitsCount(listingId, startDate, endDate);
    } catch (error) {
        console.error('[availabilityService] getAvailableUnitsCount:', error);
        return 0;
    }
}
/** Fechas donde al menos un equipo del paquete se queda sin stock suficiente. Lanza si falla. */
export async function getPackageUnavailableDates(packageId: string): Promise<string[]> {
    const { data, error } = await supabase.rpc('get_package_unavailable_dates', {
        p_package_id: packageId,
    });

    if (error) {
        throw serviceError('[availabilityService] getPackageUnavailableDates', error);
    }

    return (data ?? []) as string[];
}
