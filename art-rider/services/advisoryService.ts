"use server";

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// Cliente Admin para saltar políticas RLS (solo usar en funciones del servidor seguras)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );
}


// ============================================================================
// Tipos de Datos (reflejando la BD)
// ============================================================================

export type EventType = {
  id: string;
  slug: string;
  label: string;
  base_score: number;
  audio_factor: number;
  lighting_factor: number;
};

export type VenueType = {
  id: string;
  slug: string;
  label: string;
  environment: "indoor" | "outdoor" | "mixed";
  venue_score: number;
};

export type ActivityType = {
  id: string;
  slug: string;
  label: string;
  audio_impact: number;
  lighting_impact: number;
  stage_impact: number;
};

export type WizardInput = {
  event_type_slug: string;
  guest_count: number;
  venue_type_slug: string;
  activities: string[];
  budget_min?: number;
  budget_max?: number;
  event_date?: string;
  event_city?: string;
  event_notes?: string;
};

export type AdvisoryContext = {
  ecs_score: number;
  ecs_level: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  audio_requirement: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  lighting_requirement: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  stage_requirement: "NONE" | "SMALL" | "MEDIUM" | "LARGE";
  power_backup: boolean;
  production_time: string | null; // M-09: Pendiente de definición de rangos
};

// ============================================================================
// Funciones de Lectura de Catálogos (Knowledge Base)
// ============================================================================

export async function getEventTypes(): Promise<EventType[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("event_types").select("*").order("sort_order");
  if (error) {
    console.error("[advisoryService] Error fetching event_types:", error);
    return [];
  }
  return data;
}

export async function getVenueTypes(): Promise<VenueType[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("venue_types").select("*").order("sort_order");
  if (error) {
    console.error("[advisoryService] Error fetching venue_types:", error);
    return [];
  }
  return data;
}

export async function getActivityTypes(): Promise<ActivityType[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("activity_types").select("*").order("sort_order");
  if (error) {
    console.error("[advisoryService] Error fetching activity_types:", error);
    return [];
  }
  return data;
}

// ============================================================================
// Motor de Cálculo de Contexto (ECS + PTR)
// ============================================================================

export async function calculateEventContext(input: WizardInput): Promise<AdvisoryContext | null> {
  const supabase = await createSupabaseServerClient();

  // 1. Obtener datos necesarios de los catálogos en paralelo
  const [
    { data: eventData },
    { data: venueData },
    { data: activitiesData },
    { data: guestScoreData },
    { data: ecsThresholds },
    { data: reqThresholds },
    { data: stageThresholds }
  ] = await Promise.all([
    supabase.from("event_types").select("*").eq("slug", input.event_type_slug).single(),
    supabase.from("venue_types").select("*").eq("slug", input.venue_type_slug).single(),
    supabase.from("activity_types").select("*").in("slug", input.activities),
    
    // Para guest score, buscamos el rango que contenga guest_count
    supabase.from("guest_score_ranges")
      .select("score")
      .lte("min_guests", input.guest_count)
      .or(`max_guests.gte.${input.guest_count},max_guests.is.null`)
      .single(),

    supabase.from("ecs_thresholds").select("*"),
    supabase.from("requirement_thresholds").select("*"),
    supabase.from("stage_thresholds").select("*")
  ]);

  // Manejo de la opción "Personalizado" que agregamos solo en el frontend
  let finalVenueData = venueData;
  if (input.venue_type_slug === "personalizado") {
    finalVenueData = {
      slug: "personalizado",
      label: "Personalizado",
      environment: "mixed",
      venue_score: 25 // Puntaje promedio por defecto
    };
  }

  if (!eventData || !finalVenueData || !guestScoreData) {
    console.error("[advisoryService] Error: Missing catalog data for calculation.", { eventData, finalVenueData, guestScoreData });
    return null;
  }

  // 2. Extraer impactos de actividades
  let totalAudioImpact = 0;
  let totalLightingImpact = 0;
  let totalStageImpact = 0;

  if (activitiesData) {
    activitiesData.forEach((act: ActivityType) => {
      totalAudioImpact += act.audio_impact;
      totalLightingImpact += act.lighting_impact;
      totalStageImpact += act.stage_impact;
    });
  }

  // 3. Calcular ECS (Event Complexity Score)
  const ecsScore = 
    eventData.base_score + 
    finalVenueData.venue_score + 
    guestScoreData.score + 
    totalAudioImpact + 
    totalLightingImpact;

  // Determinar nivel de ECS
  const ecsLevelRow = ecsThresholds?.find(t => 
    ecsScore >= t.min_score && (t.max_score === null || ecsScore <= t.max_score)
  );
  const ecsLevel = (ecsLevelRow?.level as AdvisoryContext["ecs_level"]) || "LOW";

  // 4. Calcular Audio Requirement
  const rawAudio = totalAudioImpact * eventData.audio_factor;
  const audioLevelRow = reqThresholds?.find(t => 
    t.category === 'audio' && rawAudio >= t.min_score && (t.max_score === null || rawAudio <= t.max_score)
  );
  const audioReq = (audioLevelRow?.level as AdvisoryContext["audio_requirement"]) || "LOW";

  // 5. Calcular Lighting Requirement
  const rawLighting = totalLightingImpact * eventData.lighting_factor;
  const lightingLevelRow = reqThresholds?.find(t => 
    t.category === 'lighting' && rawLighting >= t.min_score && (t.max_score === null || rawLighting <= t.max_score)
  );
  const lightingReq = (lightingLevelRow?.level as AdvisoryContext["lighting_requirement"]) || "LOW";

  // 6. Calcular Stage Requirement
  const stageLevelRow = stageThresholds?.find(t => 
    totalStageImpact >= t.min_total && (t.max_total === null || totalStageImpact <= t.max_total)
  );
  const stageReq = (stageLevelRow?.level as AdvisoryContext["stage_requirement"]) || "NONE";

  // 7. Derivar Power Backup (M-08)
  const powerBackup = finalVenueData.environment === 'outdoor' || finalVenueData.environment === 'mixed';

  return {
    ecs_score: ecsScore,
    ecs_level: ecsLevel,
    audio_requirement: audioReq,
    lighting_requirement: lightingReq,
    stage_requirement: stageReq,
    power_backup: powerBackup,
    production_time: null, // Pendiente de M-09
  };
}

// ============================================================================
// Guardar Solicitud y Dataset (GC-001, GC-013)
// ============================================================================

export async function submitAdvisoryRequest(input: WizardInput) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Usuario no autenticado" };
  }

  // 1. Calcular el contexto basado en el input
  const context = await calculateEventContext(input);
  if (!context) {
    return { success: false, error: "Error calculando el contexto del evento" };
  }

  // 2. Generar el PTR (Technical Requirements)
  const generatedPtr = {
    audio: context.audio_requirement,
    lighting: context.lighting_requirement,
    stage: context.stage_requirement,
    power_backup: context.power_backup
  };

  // 3. Crear la solicitud de advisory
  const { data: request, error: requestError } = await supabase.from("advisory_requests").insert({
    client_id: user.id,
    event_type_slug: input.event_type_slug,
    guest_count: input.guest_count,
    venue_type_slug: input.venue_type_slug,
    activities: input.activities,
    budget_min: input.budget_min,
    budget_max: input.budget_max,
    event_date: input.event_date ? new Date(input.event_date).toISOString() : null,
    // Guardamos la ciudad en notes temporalmente si la columna no existe
    event_notes: input.event_city ? `Ciudad: ${input.event_city}\n${input.event_notes || ''}` : input.event_notes,
    
    // Contexto calculado
    ecs_score: context.ecs_score,
    ecs_level: context.ecs_level,
    audio_requirement: context.audio_requirement,
    lighting_requirement: context.lighting_requirement,
    stage_requirement: context.stage_requirement,
    power_backup: context.power_backup,
    production_time: context.production_time,
    generated_ptr: generatedPtr,
    
    status: 'pending'
  }).select('id').single();

  if (requestError) {
    console.error("[advisoryService] Error inserting advisory_request:", requestError);
    return { success: false, error: "No se pudo guardar la solicitud" };
  }

  // 4. ADV-006: Guardar datos de entrenamiento (Dataset) usando Admin Client (bypasses RLS)
  const adminSupabase = getAdminClient();
  const { error: trainingError } = await adminSupabase.from("advisory_training_data").insert({
    request_id: request.id,
    wizard_input: input,
    generated_ptr: generatedPtr
  });

  if (trainingError) {
    console.error("[advisoryService] Error saving training data:", trainingError);
  }

  // 5. AUTO-GENERAR PROPUESTA (Fase 1 - Instant Matcher)
  await autoGenerateProposal(request.id, context, input.event_city || "", user.id, input.guest_count, input.venue_type_slug);

  revalidatePath("/dashboard"); 

  return { 
    success: true, 
    requestId: request.id,
    context 
  };
}

// ============================================================================
// Firma de Propuesta y PDF (Sprint 2 - GC-009)
// ============================================================================

export async function signProposalRider(formData: FormData) {
  const proposalId = formData.get("proposalId") as string;
  const pdfFile = formData.get("pdfFile") as File;
  
  if (!proposalId || !pdfFile) return { success: false, error: "Faltan datos requeridos." };

  try {
    const supabase = getAdminClient();
    
    // 1. Subir el PDF al Storage
    const fileName = `${proposalId}-${Date.now()}.pdf`;
    
    // Convertir el File a Buffer para Supabase
    const arrayBuffer = await pdfFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const { error: uploadError } = await supabase.storage
      .from("riders")
      .upload(fileName, buffer, { 
        contentType: "application/pdf",
        upsert: true
      });
      
    if (uploadError) {
      console.error("[advisoryService] PDF upload error:", uploadError);
      return { success: false, error: "No se pudo subir el contrato al servidor." };
    }
    
    const { data: publicUrlData } = supabase.storage.from("riders").getPublicUrl(fileName);
    
    // 2. Actualizar el estado de la propuesta a 'accepted'
    // Como no tenemos pdf_url en la tabla temporalmente lo dejamos con el cambio de estado
    const { error: updateError } = await supabase
      .from("advisory_proposals")
      .update({ status: "accepted" })
      .eq("id", proposalId);
      
    if (updateError) {
      console.error("[advisoryService] Update proposal status error:", updateError);
      return { success: false, error: "Error al actualizar el estado de la propuesta." };
    }
    
    return { success: true, pdfUrl: publicUrlData.publicUrl };
  } catch (error) {
    console.error("[advisoryService] signProposalRider error:", error);
    return { success: false, error: "Error inesperado al firmar." };
  }
}

// ============================================================================
// Auto-Generador de Propuestas (Motor de Recomendación)
// ============================================================================

async function autoGenerateProposal(requestId: string, context: AdvisoryContext, city: string, clientId: string, guestCount: number, venueSlug: string) {
  if (!city) return;

  // Usar Admin Client para saltarse restricciones RLS al leer addresses e insertar proposals
  const supabase = getAdminClient();
  
  // Buscar equipos en la ciudad solicitada
  const { data: listings, error } = await supabase
    .from("listings")
    .select("id, title, category, daily_price, provider_id, specs, address:addresses!inner(city)")
    .eq("is_published", true)
    .ilike("addresses.city", `%${city}%`);

  if (error || !listings || listings.length === 0) {
    console.log("[advisoryService] No listings found in city:", city);
    return;
  }

  const items = [];
  let subtotal = 0;

  // Lógica de Reglas Básica
  const audios = listings.filter(l => l.category === "sonido" || l.category === "audio");
  const lightings = listings.filter(l => l.category === "iluminacion" || l.category === "lighting");

  // Asignar Audio según requerimiento
  if (audios.length > 0) {
    // Algoritmo: Ordenar por potencia desc, y buscar el primero que cubra la cantidad de personas
    const sortedAudios = audios.sort((a, b) => {
      const pA = (a.specs as any)?.potencia_watts_rms || 0;
      const pB = (b.specs as any)?.potencia_watts_rms || 0;
      return pB - pA;
    });
    
    let selected = sortedAudios[0]; // fallback al de mayor potencia
    for (const audio of sortedAudios) {
      if ((audio.specs as any)?.cobertura_personas >= guestCount) {
        selected = audio;
        break; // Toma el que alcance, empezando desde los más potentes
      }
    }

    const qty = context.audio_requirement === 'HIGH' ? 4 : (context.audio_requirement === 'MEDIUM' ? 2 : 1);
    
    const specs = (selected.specs as any) || {};
    
    items.push({
      listing_id: selected.id,
      provider_id: selected.provider_id,
      title: selected.title,
      quantity: qty,
      unit_price: selected.daily_price,
      note: `Sistema principal de audio calibrado para ${context.audio_requirement}.`,
      metrics: [
        specs.cobertura_personas ? `Cobertura óptima: ${specs.cobertura_personas} pax` : `Cobertura estimada: hasta ${guestCount + 20} pax`,
        specs.potencia_watts_rms ? `Potencia RMS: ${specs.potencia_watts_rms}W` : `Nivel: ${context.audio_requirement}`,
        specs.tipo_sistema ? `Tipo: ${specs.tipo_sistema}` : (venueSlug === 'abierto' || venueSlug === 'outdoor' ? 'Apto para Exteriores' : 'Optimizado para Interiores')
      ]
    });
    subtotal += (selected.daily_price * qty);
  }

  // Asignar Iluminación
  if (lightings.length > 0) {
    // Algoritmo: Ordenar por cantidad de luminarias
    const sortedLightings = lightings.sort((a, b) => {
      const pA = (a.specs as any)?.cantidad_luminarias || 0;
      const pB = (b.specs as any)?.cantidad_luminarias || 0;
      return pB - pA;
    });

    let selected = sortedLightings[0];
    const qty = context.lighting_requirement === 'HIGH' ? 4 : (context.lighting_requirement === 'MEDIUM' ? 2 : 1);
    const specs = (selected.specs as any) || {};

    items.push({
      listing_id: selected.id,
      provider_id: selected.provider_id,
      title: selected.title,
      quantity: qty,
      unit_price: selected.daily_price,
      note: `Set de iluminación ambiental profesional (${context.lighting_requirement}).`,
      metrics: [
        specs.cantidad_luminarias ? `Equipos: ${specs.cantidad_luminarias} luminarias` : `Ambiente: Nivel ${context.lighting_requirement}`,
        specs.tipo_iluminacion ? `Tipo: ${specs.tipo_iluminacion}` : `Alcance: Espacio de hasta ${Math.max(50, guestCount)} pax`,
        specs.incluye_dmx ? `Control Inteligente DMX` : `Control Automático/Rítmico`
      ]
    });
    subtotal += (selected.daily_price * qty);
  }

  if (items.length === 0) return; // No pudimos armar nada

  const commission = Math.round(subtotal * 0.10); // 10% ArtRider fee
  const total = subtotal + commission;

  await supabase.from("advisory_proposals").insert({
    request_id: requestId,
    provider_id: items[0].provider_id, // Tomamos el proveedor del primer ítem para la fase 1
    created_by: clientId,
    items: items,
    subtotal: subtotal,
    commission_amount: commission,
    total: total,
    status: 'sent' // Listo para que el cliente lo vea
  });
}

// ============================================================================
// Obtener Solicitud (Sprint 2 - GC-008/GC-012)
// ============================================================================

export async function getAdvisoryRequest(requestId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Usuario no autenticado" };
  }

  // Obtenemos el request y sus proposals usando join de Supabase
  const { data, error } = await supabase
    .from("advisory_requests")
    .select(`
      *,
      advisory_proposals (*)
    `)
    .eq("id", requestId)
    .single();

  if (error) {
    console.error("[advisoryService] Error fetching request:", error);
    return { success: false, error: "No se encontró la solicitud" };
  }

  // Regla GC-012: Ocultar Datos Pre-Pago (El cliente ve la propuesta si existe, pero no el provider)
  // El provider de la propuesta se revelará solo si el estatus es paid, o en una vista diferente.
  // Por ahora, traemos la primera propuesta que esté en estado 'sent' o 'accepted' o 'signed'
  
  const proposal = data.advisory_proposals?.find(
    (p: any) => p.status === 'sent' || p.status === 'accepted' || p.status === 'signed'
  );

  return { 
    success: true, 
    request: data,
    proposal: proposal || null
  };
}

