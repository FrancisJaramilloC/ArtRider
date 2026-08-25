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
    const sessionClient = await createSupabaseServerClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user) return { success: false, error: "Usuario no autenticado." };

    const supabase = getAdminClient();
    const { data: ownedProposal } = await supabase
      .from("advisory_proposals")
      .select("id, advisory_requests(client_id)")
      .eq("id", proposalId)
      .single();
    const advisoryRequest = Array.isArray(ownedProposal?.advisory_requests)
      ? ownedProposal.advisory_requests[0]
      : ownedProposal?.advisory_requests;
    if (!ownedProposal || advisoryRequest?.client_id !== user.id) {
      return { success: false, error: "No tienes acceso a esta propuesta." };
    }
    
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
  
  // ── 1. Buscar equipos individuales en la ciudad solicitada ──
  const { data: listings, error } = await supabase
    .from("listings")
    .select("id, title, category, daily_price, provider_id, specs, address:addresses!inner(city), equipment_units(id, internal_status)")
    .eq("is_published", true)
    .is("deleted_at", null)
    .ilike("addresses.city", `%${city}%`);

  // ── 2. Buscar paquetes publicados cuyos listings estén en la ciudad ──
  const { data: packages } = await supabase
    .from("packages")
    .select(`
      id, title, daily_price, provider_id, capacity_people, is_published,
      items:package_items(
        quantity,
        listing:listings(id, title, category, specs, daily_price, provider_id,
          address:addresses!inner(city),
          equipment_units(id, internal_status))
      ),
      provider:providers(brand_name)
    `)
    .eq("is_published", true)
    .is("deleted_at", null);

  const hasListings = listings && listings.length > 0;
  const hasPackages = packages && packages.length > 0;

  if (!hasListings && !hasPackages) {
    console.log("[advisoryService] No listings or packages found in city:", city);
    return;
  }

  // ── Filtrar paquetes cuyo primer listing esté en la ciudad ──
  const cityPackages = (packages || []).filter((pkg: any) => {
    const pkgItems = pkg.items || [];
    return pkgItems.some((item: any) => {
      const listing = Array.isArray(item.listing) ? item.listing[0] : item.listing;
      if (!listing) return false;
      const addr = Array.isArray(listing.address) ? listing.address[0] : listing.address;
      return addr?.city?.toLowerCase().includes(city.toLowerCase());
    });
  });

  // ── Lógica de Reglas para equipos individuales ──
  const audios = (listings || []).filter((l: any) => l.category === "sonido" || l.category === "audio");
  const lightings = (listings || []).filter((l: any) => l.category === "iluminacion" || l.category === "lighting");

  const targetQuantity = (requirement: string) =>
    requirement === "HIGH" ? 4 : requirement === "MEDIUM" ? 2 : 1;

  type AdvisoryListingCandidate = {
    id: string;
    provider_id: string;
    title: string;
    daily_price: number;
    specs: {
      potencia_watts_rms?: number;
      cobertura_personas?: number;
      tipo_sistema?: string;
      cantidad_luminarias?: number;
      tipo_iluminacion?: string;
      incluye_dmx?: boolean;
    } | null;
    equipment_units?: { internal_status: string }[];
  };
  const availableUnits = (listing: AdvisoryListingCandidate) =>
    (listing.equipment_units ?? []).filter((unit) => unit.internal_status === "AVAILABLE").length;

  // ── Configuración de tiers ──
  const tierConfigs = [
    {
      tier: 'economico',
      audioSort: (a: AdvisoryListingCandidate, b: AdvisoryListingCandidate) => a.daily_price - b.daily_price,
      lightingSort: (a: AdvisoryListingCandidate, b: AdvisoryListingCandidate) => a.daily_price - b.daily_price,
      quantityScaling: (baseQuantity: number) => baseQuantity,
      packageSort: (a: any, b: any) => a.daily_price - b.daily_price, // Paquete más barato primero
    },
    {
      tier: 'recomendado',
      audioSort: (a: AdvisoryListingCandidate, b: AdvisoryListingCandidate) => {
        const specsA = a.specs || {};
        const specsB = b.specs || {};
        const coversA = (specsA.cobertura_personas ?? 0) >= guestCount ? 1 : 0;
        const coversB = (specsB.cobertura_personas ?? 0) >= guestCount ? 1 : 0;
        return coversB - coversA || (specsB.potencia_watts_rms || 0) - (specsA.potencia_watts_rms || 0);
      },
      lightingSort: (a: AdvisoryListingCandidate, b: AdvisoryListingCandidate) => {
        const pA = a.specs?.cantidad_luminarias || 0;
        const pB = b.specs?.cantidad_luminarias || 0;
        return pB - pA;
      },
      quantityScaling: (baseQuantity: number) => baseQuantity,
      packageSort: (a: any, b: any) => {
        // Priorizar paquetes que cubran la capacidad de personas
        const coversA = (a.capacity_people ?? 0) >= guestCount ? 1 : 0;
        const coversB = (b.capacity_people ?? 0) >= guestCount ? 1 : 0;
        return coversB - coversA || b.daily_price - a.daily_price;
      },
    },
    {
      tier: 'premium',
      audioSort: (a: AdvisoryListingCandidate, b: AdvisoryListingCandidate) => b.daily_price - a.daily_price,
      lightingSort: (a: AdvisoryListingCandidate, b: AdvisoryListingCandidate) => b.daily_price - a.daily_price,
      quantityScaling: (baseQuantity: number) => Math.max(2, baseQuantity),
      packageSort: (a: any, b: any) => b.daily_price - a.daily_price, // Paquete más caro primero
    }
  ];

  const generatedFingerprints = new Set<string>();

  for (const config of tierConfigs) {
    // ── Opción A: Construir propuesta con equipos individuales ──
    type ProposalItem = {
      listing_id: string;
      provider_id: string;
      title: string;
      quantity: number;
      unit_price: number;
      note: string;
      metrics: string[];
    };
    const individualItems: ProposalItem[] = [];
    let individualSubtotal = 0;

    const addRecommendations = (
      candidates: AdvisoryListingCandidate[],
      quantityNeeded: number,
      describe: (listing: AdvisoryListingCandidate) => { note: string; metrics: string[] },
    ) => {
      let remaining = quantityNeeded;
      for (const listing of candidates) {
        if (remaining <= 0) break;
        const stock = availableUnits(listing);
        if (stock <= 0) continue;
        const quantity = Math.min(stock, remaining);
        const description = describe(listing);
        individualItems.push({
          listing_id: listing.id,
          provider_id: listing.provider_id,
          title: listing.title,
          quantity,
          unit_price: listing.daily_price,
          note: description.note,
          metrics: description.metrics,
        });
        individualSubtotal += listing.daily_price * quantity;
        remaining -= quantity;
      }
    };

    // Asignar Audio según requerimiento
    if (audios.length > 0) {
      const sortedAudios = [...audios as AdvisoryListingCandidate[]].sort(config.audioSort);
      const qty = config.quantityScaling(targetQuantity(context.audio_requirement));
      addRecommendations(sortedAudios, qty, (selected) => {
        const specs = selected.specs || {};
        return {
          note: `Sistema de audio calibrado para nivel ${context.audio_requirement}.`,
          metrics: [
            specs.cobertura_personas ? `Cobertura óptima: ${specs.cobertura_personas} pax` : `Cobertura estimada: hasta ${guestCount + 20} pax`,
            specs.potencia_watts_rms ? `Potencia RMS: ${specs.potencia_watts_rms}W` : `Nivel: ${context.audio_requirement}`,
            specs.tipo_sistema ? `Tipo: ${specs.tipo_sistema}` : (venueSlug === "abierto" || venueSlug === "outdoor" ? "Apto para exteriores" : "Optimizado para interiores"),
          ],
        };
      });
    }

    // Asignar Iluminación
    if (lightings.length > 0) {
      const sortedLightings = [...lightings as AdvisoryListingCandidate[]].sort(config.lightingSort);
      const qty = config.quantityScaling(targetQuantity(context.lighting_requirement));
      addRecommendations(sortedLightings, qty, (selected) => {
        const specs = selected.specs || {};
        return {
          note: `Set de iluminación ambiental profesional (${context.lighting_requirement}).`,
          metrics: [
            specs.cantidad_luminarias ? `Equipos: ${specs.cantidad_luminarias} luminarias` : `Ambiente: nivel ${context.lighting_requirement}`,
            specs.tipo_iluminacion ? `Tipo: ${specs.tipo_iluminacion}` : `Alcance: espacio de hasta ${Math.max(50, guestCount)} pax`,
            specs.incluye_dmx ? "Control inteligente DMX" : "Control automático/rítmico",
          ],
        };
      });
    }

    // ── Opción B: Evaluar paquetes como candidatos completos ──
    let bestPackageItems: ProposalItem[] | null = null;
    let bestPackageSubtotal = Infinity;

    if (cityPackages.length > 0) {
      const sortedPackages = [...cityPackages].sort(config.packageSort);
      
      for (const pkg of sortedPackages) {
        const pkgItems = (pkg as any).items || [];
        // Verificar que todos los listings del paquete están publicados y con stock
        let allAvailable = true;
        const proposalItems: ProposalItem[] = [];
        let pkgSubtotal = 0;

        for (const pkgItem of pkgItems) {
          const listing = Array.isArray(pkgItem.listing) ? pkgItem.listing[0] : pkgItem.listing;
          if (!listing) { allAvailable = false; break; }
          
          const units = (listing.equipment_units || []).filter((u: any) => u.internal_status === "AVAILABLE");
          if (units.length < pkgItem.quantity) { allAvailable = false; break; }

          const specs = listing.specs || {};
          proposalItems.push({
            listing_id: listing.id,
            provider_id: listing.provider_id || (pkg as any).provider_id,
            title: listing.title,
            quantity: pkgItem.quantity,
            unit_price: listing.daily_price,
            note: `Parte del paquete "${(pkg as any).title}".`,
            metrics: [
              specs.potencia_watts_rms ? `Potencia: ${specs.potencia_watts_rms}W` : "",
              specs.cobertura_personas ? `Cobertura: ${specs.cobertura_personas} pax` : "",
              (pkg as any).capacity_people ? `Paquete para ${(pkg as any).capacity_people} personas` : "",
            ].filter(Boolean),
          });
          pkgSubtotal += listing.daily_price * pkgItem.quantity;
        }

        if (allAvailable && proposalItems.length > 0) {
          // Usar el precio del paquete si es mejor que la suma de individuales
          const packagePrice = (pkg as any).daily_price;
          const effectiveSubtotal = packagePrice > 0 ? packagePrice : pkgSubtotal;
          
          if (effectiveSubtotal < bestPackageSubtotal) {
            bestPackageSubtotal = effectiveSubtotal;
            bestPackageItems = proposalItems.map(item => ({
              ...item,
              // Ajustar precios proporcionalmente si el paquete tiene precio especial
              unit_price: packagePrice > 0
                ? Math.round((item.unit_price * item.quantity / pkgSubtotal) * packagePrice / item.quantity)
                : item.unit_price,
            }));
          }
          break; // Tomar el mejor paquete según el sort del tier
        }
      }
    }

    // ── Elegir la mejor opción: individuales vs paquete ──
    let finalItems: ProposalItem[];
    let finalSubtotal: number;

    const usePackage = bestPackageItems && bestPackageItems.length > 0;
    const useIndividual = individualItems.length > 0;

    if (usePackage && useIndividual) {
      // Comparar: elegir según el tier
      if (config.tier === 'economico') {
        // Tier económico: el más barato gana
        if (bestPackageSubtotal <= individualSubtotal) {
          finalItems = bestPackageItems!;
          finalSubtotal = bestPackageSubtotal;
        } else {
          finalItems = individualItems;
          finalSubtotal = individualSubtotal;
        }
      } else if (config.tier === 'premium') {
        // Tier premium: el más caro gana (asumimos más valor)
        if (bestPackageSubtotal >= individualSubtotal) {
          finalItems = bestPackageItems!;
          finalSubtotal = bestPackageSubtotal;
        } else {
          finalItems = individualItems;
          finalSubtotal = individualSubtotal;
        }
      } else {
        // Recomendado: preferir paquete si tiene más items (más completo)
        if (bestPackageItems!.length >= individualItems.length) {
          finalItems = bestPackageItems!;
          finalSubtotal = bestPackageSubtotal;
        } else {
          finalItems = individualItems;
          finalSubtotal = individualSubtotal;
        }
      }
    } else if (usePackage) {
      finalItems = bestPackageItems!;
      finalSubtotal = bestPackageSubtotal;
    } else if (useIndividual) {
      finalItems = individualItems;
      finalSubtotal = individualSubtotal;
    } else {
      continue; // Sin items, saltar este tier
    }

    // ── Deduplicación con fingerprint completo (IDs + cantidades + subtotal) ──
    const fingerprint = finalItems
      .map(i => `${i.listing_id}:${i.quantity}`)
      .sort()
      .join(',') + `|${finalSubtotal}`;
    if (generatedFingerprints.has(fingerprint)) {
      continue; // Evitar duplicar si la configuración genera el mismo resultado
    }
    generatedFingerprints.add(fingerprint);

    const commission = Math.round(finalSubtotal * 0.10); // 10% ArtRider fee
    const total = finalSubtotal + commission;

    await supabase.from("advisory_proposals").insert({
      request_id: requestId,
      provider_id: finalItems[0].provider_id,
      created_by: clientId,
      items: finalItems,
      subtotal: finalSubtotal,
      commission_amount: commission,
      total: total,
      status: 'sent',
      tier: config.tier
    });
  }
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
  
  const proposals = (data.advisory_proposals || []).filter(
    (p: any) => ['sent', 'accepted', 'signed'].includes(p.status)
  );

  const proposal = proposals.find((p: any) => p.tier === 'recomendado') || proposals[0] || null;

  return { 
    success: true, 
    request: data,
    proposal,
    proposals
  };
}

// ============================================================================
// Aceptar Propuesta (Sprint 2 - Simplificado)
// ============================================================================

export async function acceptProposal(proposalId: string) {
  try {
    const sessionClient = await createSupabaseServerClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user) return { success: false, error: "Usuario no autenticado." };

    const supabase = getAdminClient();
    const { data: ownedProposal } = await supabase
      .from("advisory_proposals")
      .select("id, advisory_requests(client_id)")
      .eq("id", proposalId)
      .single();

    const advisoryRequest = Array.isArray(ownedProposal?.advisory_requests)
      ? ownedProposal.advisory_requests[0]
      : ownedProposal?.advisory_requests;

    if (!ownedProposal || advisoryRequest?.client_id !== user.id) {
      return { success: false, error: "No tienes acceso a esta propuesta." };
    }

    const { error: updateError } = await supabase
      .from("advisory_proposals")
      .update({ status: "accepted" })
      .eq("id", proposalId);

    if (updateError) {
      console.error("[advisoryService] Update proposal status error:", updateError);
      return { success: false, error: "Error al actualizar el estado de la propuesta." };
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[advisoryService] acceptProposal error:", error);
    return { success: false, error: "Error inesperado al aceptar la propuesta." };
  }
}

