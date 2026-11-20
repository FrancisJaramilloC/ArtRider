/**
 * Textos visibles que nombran a los roles. Cliente → «Rider», proveedor → «Partner».
 * Son invariables en género y se redactan sin artículo siempre que se puede («Modo Rider», «Ser Partner»).
 * Cambia el nombre de un rol SOLO aquí. Los valores de rol en la base de datos, los identificadores de
 * código y las rutas no cambian.
 */
export const ROLE_CLIENT = 'Rider';
export const ROLE_PROVIDER = 'Partner';
export const ROLE_CLIENT_PLURAL = 'Riders';
export const ROLE_PROVIDER_PLURAL = 'Partners';

export const COPY = {
  // Cambio de modo y alta
  switchToProviderMode: `Cambiar a modo ${ROLE_PROVIDER}`,
  switchToClientMode: `Cambiar a modo ${ROLE_CLIENT}`,
  becomeProvider: `Ser ${ROLE_PROVIDER}`,
  becomeProviderAction: `Convertirme en ${ROLE_PROVIDER}`,
  notProviderYetTitle: `Aún no eres ${ROLE_PROVIDER}`,
  notProviderYetBody: `No tienes un perfil de ${ROLE_PROVIDER} todavía.`,
  providerAccountActive: `Tu cuenta de ${ROLE_PROVIDER} está activa. Ya puedes gestionar tu catálogo.`,
  providerAccountSuspended: `Tu cuenta de ${ROLE_PROVIDER} ha sido suspendida. Contacta a soporte para más información.`,
  providerSetupTitle: `Configura tu perfil de ${ROLE_PROVIDER}`,
  providerRegisterFailed: 'No se pudo registrar tu perfil. Por favor intenta más tarde.',
  providerRequestInReview: 'Solicitud en revisión',
  providerRequestSent: 'Solicitud enviada',
  providerRequestSentBody: `Recibimos tu solicitud para ser ${ROLE_PROVIDER}. Nuestro equipo la revisará y te avisaremos cuando tu cuenta esté activa (1-3 días hábiles).`,
  providerRequestInReviewBody: `Tu solicitud para ser ${ROLE_PROVIDER} está en revisión. Te avisaremos cuando tu cuenta esté activa (1-3 días hábiles).`,
  providerSuspendedRow: 'Cuenta suspendida',
  backToProfile: 'Volver al perfil',

  // Fechas del carrito
  arrivalLabel: 'Llegada',
  departureLabel: 'Salida',
  dateNotChosen: 'Elegir',
  pickDatesGuide: 'Toca el primer día y luego el último',
  onlyThisDay: 'Solo este día',
  cartTotalPending: 'Elige llegada y salida para ver el total',
  rangeHasBlockedDays: 'Hay días no disponibles en ese rango',

  // Insignias y fichas
  providerVerified: `${ROLE_PROVIDER} verificado`,
  providerLabel: (name: string) => `${ROLE_PROVIDER}: ${name}`,
  providerFallbackName: `${ROLE_PROVIDER} ArtRider`,
  moreFromProvider: `Más de este ${ROLE_PROVIDER}`,

  // Reservas y llamadas
  callProvider: (phone: string) => `Llamar al ${ROLE_PROVIDER} ${phone}`,
  callClient: (phone: string) => `Llamar al ${ROLE_CLIENT} ${phone}`,
  clientCardTitle: ROLE_CLIENT,
  thisClient: `este ${ROLE_CLIENT}`,
  pendingBookingsEmpty: `Aquí aparecen las reservas que esperan la respuesta del ${ROLE_PROVIDER}.`,
  checkoutSuccessNote: `El ${ROLE_PROVIDER} revisará tu solicitud y la confirmará pronto.`,
  cartSuccessTitle: (count: number) => (count === 1 ? '¡Solicitud enviada!' : '¡Solicitudes enviadas!'),
  cartSuccessNote: (count: number) =>
    count === 1
      ? `El ${ROLE_PROVIDER} revisará tu solicitud y la confirmará pronto.`
      : `Los ${ROLE_PROVIDER_PLURAL} revisarán tus solicitudes y las confirmarán pronto.`,
  refundNote: `Esto reembolsará automáticamente al ${ROLE_CLIENT} si ya se cobró. Esta acción no se puede deshacer.`,
  reviewsEmpty: `Aquí verás las reseñas que dejan tus ${ROLE_CLIENT_PLURAL}.`,

  // Mensajes
  providerMessagesEmpty: `Cuando un ${ROLE_CLIENT} te consulte sobre un equipo, la conversación aparecerá aquí.`,
  providerMessagesHelp: `Las conversaciones aparecen cuando un ${ROLE_CLIENT} te consulta o reserva.`,

  // Publicar anuncios y paquetes
  describeToClients: `Cuenta a los ${ROLE_CLIENT_PLURAL} qué incluye, estado, accesorios...`,
  photoFirstThing: `Una buena foto es lo primero que ven los ${ROLE_CLIENT_PLURAL}.`,
  originVisibility: `¿De dónde sale este equipo? Solo lo verán los ${ROLE_CLIENT_PLURAL} con reserva confirmada.`,
  previewListingUpdated: 'Así van a ver el anuncio actualizado:',
  previewListingNew: `Así lo van a ver tus ${ROLE_CLIENT_PLURAL}:`,
  previewPackageUpdated: 'Así van a ver el paquete actualizado:',
  emptyListings: `Publica tu primer equipo para que los ${ROLE_CLIENT_PLURAL} puedan rentarlo.`,

  // Errores de servicios (visibles al usuario)
  noActiveProviderProfile: `No tienes un perfil de ${ROLE_PROVIDER} activo.`,
  providerNotActiveYet: `Tu cuenta de ${ROLE_PROVIDER} todavía no está activa.`,
  mustLoginToBecomeProvider: `Debes iniciar sesión para registrarte como ${ROLE_PROVIDER}.`,
  alreadyProvider: `Ya tienes un perfil de ${ROLE_PROVIDER} registrado.`,
  alreadyProviderPending: 'Ya enviaste tu solicitud: está en revisión.',
  providerSuspendedBody: `Tu cuenta de ${ROLE_PROVIDER} está suspendida. Contacta a soporte.`,
  providerStatusUnavailable: `No se pudo cargar tu estado de ${ROLE_PROVIDER}`,
  ownItemNotice: (kind: 'equipo' | 'paquete') => `Este ${kind} es tuyo: no puedes reservarlo ni agregarlo al carrito.`,

  // Detalle de reserva del Rider
  bookingDetailTitle: 'Tu reserva',
  bookingStatusLine: {
    AWAITING_SIGNATURES: `Esperando la respuesta del ${ROLE_PROVIDER}. Puedes cancelar mientras tanto.`,
    PAID: `Reserva confirmada. El ${ROLE_PROVIDER} aceptó tu solicitud.`,
    ACTIVE: `Reserva confirmada. El ${ROLE_PROVIDER} aceptó tu solicitud.`,
    COMPLETED: 'Reserva finalizada. ¡Gracias por rentar con ArtRider!',
    CANCELLED: 'Esta reserva fue cancelada.',
    DISPUTE: 'Esta reserva tiene una disputa abierta.',
    ARCHIVED: 'Esta reserva fue archivada.',
  } as Record<string, string>,
  bookingAddressNotice: 'La dirección exacta se comparte al confirmar.',
  bookingRefundRequested: 'Reembolso solicitado',
  bookingPaymentReference: 'Referencia de pago',
  bookingCancellationTitle: 'Política de cancelación',
  bookingCancellationPolicy: `Puedes cancelar tu reserva mientras el ${ROLE_PROVIDER} no haya respondido. Si el ${ROLE_PROVIDER} rechaza tu solicitud, el pago se reembolsa automáticamente. Una vez confirmada, escríbele al ${ROLE_PROVIDER} para coordinar cualquier cambio.`,
  bookingNotFoundTitle: 'No encontramos esta reserva',
  bookingNotFoundBody: 'Puede que ya no exista o que no sea tuya.',
  bookingCancelConfirm: 'Esto cancelará tu reserva y no se puede deshacer.',
} as const;
