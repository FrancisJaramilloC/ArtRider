/**
 * SOLO DESARROLLO (__DEV__): galería de componentes y pantallas clave con datos de ejemplo, para
 * revisar diseño y medir (scripts/ui-audit) las pantallas que exigen sesión. No hay llamadas a
 * Supabase: todo son fixtures locales. Abrir en /dev-gallery?s=home|cards|lists|states.
 */
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { OrderGroupCard } from '@/components/bookings/OrderGroupCard';
import { BookingListCard } from '@/components/bookings/BookingListCard';
import { CityCarousel } from '@/components/home/CityCarousel';
import { ConversationsView } from '@/components/messages/ConversationsView';
import { ManagedRow } from '@/components/provider/ManagedRow';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/checkout/CheckoutParts';
import { ItemCard, type ItemCardData } from '@/components/ui/ItemCard';
import { ListRow } from '@/components/ui/ListRow';
import { PriceSummary } from '@/components/ui/PriceSummary';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ItemCardSkeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { Rhythm } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import type { ClientBooking } from '@/services/bookingsService';
import type { HomeCardItem } from '@/services/homeService';
import type { ConversationSummary } from '@/services/messagesService';

/** Foto de producto con fondo blanco (SVG en línea, sin red). */
const PRODUCT_PHOTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect width="400" height="500" fill="#ffffff"/><rect x="130" y="60" width="140" height="380" rx="16" fill="#222"/><circle cx="200" cy="170" r="42" fill="#555"/><circle cx="200" cy="320" r="58" fill="#555"/></svg>',
  );

const LONG_TITLE = 'Sistema de sonido profesional line array con subwoofers activos y mezcladora digital de 32 canales';

const card = (over: Partial<HomeCardItem> & { id: string }): HomeCardItem => ({
  title: 'Luces LED PAR 64',
  category: 'lighting',
  cover_image_url: PRODUCT_PHOTO,
  daily_price: 4500,
  city: 'Loja',
  rating: 4.8,
  href: '/',
  tipo: 'equipo',
  ...over,
});

const CARDS: HomeCardItem[] = [
  card({ id: 'a', title: 'Parlante RCF', rating: 5 }),
  card({ id: 'b', title: LONG_TITLE, category: 'audio', rating: 0, city: 'Santo Domingo de los Tsáchilas' }),
  card({ id: 'c', title: 'Cabeza móvil beam de alta potencia', cover_image_url: null, rating: 4.2, daily_price: 12000 }),
  card({ id: 'd', title: 'Pack Fiesta Mediano', tipo: 'paquete', category: null, rating: 0, city: 'Ecuador', daily_price: 10000 }),
  card({ id: 'e', title: 'Humo', category: 'effects', rating: 0, city: 'Loja', daily_price: 1500 }),
];

const ITEMS: ItemCardData[] = CARDS;

const BOOKINGS: ClientBooking[] = [
  { booking_id: '1', status: 'AWAITING_SIGNATURES', start_date: '2026-11-20', end_date: '2026-11-22', total_price: 18000, created_at: '2026-11-10', listing_title: LONG_TITLE, listing_cover_image_url: PRODUCT_PHOTO, listing_city: 'Loja', order_id: null, provider_name: 'Producciones Andinas del Sur S.A.', provider_phone: '+593 99 123 4567', already_reviewed: false },
  { booking_id: '2', status: 'COMPLETED', start_date: '2026-10-01', end_date: '2026-10-02', total_price: 9000, created_at: '2026-09-30', listing_title: 'Luces PAR', listing_cover_image_url: null, listing_city: 'Quito', order_id: null, provider_name: null, provider_phone: null, already_reviewed: false },
  { booking_id: '3', status: 'ACTIVE', start_date: '2026-11-25', end_date: '2026-11-25', total_price: 4500, created_at: '2026-11-11', listing_title: 'Parlante', listing_cover_image_url: PRODUCT_PHOTO, listing_city: 'Loja', order_id: null, provider_name: 'AudioPro', provider_phone: null, already_reviewed: true },
  { booking_id: '4', status: 'CANCELLED', start_date: '2026-11-01', end_date: '2026-11-03', total_price: 7000, created_at: '2026-10-20', listing_title: 'Pantalla LED', listing_cover_image_url: PRODUCT_PHOTO, listing_city: 'Loja', order_id: null, provider_name: null, provider_phone: null, already_reviewed: false },
];

const CONVERSATIONS: ConversationSummary[] = [
  { id: 'c1', listing_id: 'x', package_id: null, booking_id: null, client_id: 'u', provider_id: 'p', created_at: '2026-11-10', other_name: 'Producciones Andinas del Sur S.A.', equipment_title: LONG_TITLE, cover_image_url: PRODUCT_PHOTO, listing_city: 'Loja', last_message_text: 'Hola, ¿el equipo incluye operador y transporte hasta el lugar del evento en la ciudad?', last_message_time: new Date(Date.now() - 5 * 60000).toISOString(), last_message_is_mine: false, unread_count: 3, booking_start_date: '2026-11-20', booking_end_date: '2026-11-22', booking_total: 18000, is_archived: false },
  { id: 'c2', listing_id: null, package_id: 'k', booking_id: null, client_id: 'u', provider_id: 'p', created_at: '2026-11-09', other_name: 'AudioPro', equipment_title: 'Parlante', cover_image_url: null, listing_city: null, last_message_text: null, last_message_time: null, last_message_is_mine: true, unread_count: 0, booking_start_date: null, booking_end_date: null, booking_total: null, is_archived: false },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: Rhythm.titleToContent }}>
      <Text variant="overline" color="textMuted">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Cards() {
  const { cardWidth, columns, gutter } = useLayout();
  return (
    <View style={{ gap: Rhythm.section }}>
      <CityCarousel title="Equipos populares en Santo Domingo de los Tsáchilas" items={CARDS} favoriteIds={new Set(['a'])} onSeeMore={() => {}} />
      <View style={{ paddingHorizontal: gutter, gap: Rhythm.titleToContent }}>
        <Text variant="overline" color="textMuted">
          Grilla (columnas según ancho)
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Rhythm.cardGap }}>
          {ITEMS.map((item) => (
            <ItemCard key={item.id} item={item} width={cardWidth()} />
          ))}
        </View>
        <Text variant="caption" color="textMuted">
          {columns} columnas
        </Text>
      </View>
    </View>
  );
}

function Lists() {
  return (
    <View style={{ gap: Rhythm.section }}>
      <Section title="Anuncios del proveedor">
        <View style={{ gap: Rhythm.cardGap }}>
          <ManagedRow title={LONG_TITLE} meta="Sonido · $120/día" coverUrl={PRODUCT_PHOTO} published busy={false} onTogglePublished={() => {}} onEdit={() => {}} onDelete={() => {}} />
          <ManagedRow title="Luces PAR" meta="Iluminación · $45/día" coverUrl={null} published={false} busy={false} onTogglePublished={() => {}} onEdit={() => {}} onDelete={() => {}} />
        </View>
      </Section>
      <Section title="Reservas">
        <View style={{ gap: Rhythm.cardGap }}>
          {BOOKINGS.map((b) => (
            <BookingListCard key={b.booking_id} booking={b} onCancelled={() => {}} />
          ))}
          <OrderGroupCard bookings={BOOKINGS.slice(0, 3).map((b, i) => ({ ...b, booking_id: `g${i}`, order_id: 'o1' }))} onCancelled={() => {}} />
        </View>
      </Section>
    </View>
  );
}

function Messages() {
  return (
    <ConversationsView conversations={CONVERSATIONS} loading={false} refreshing={false} onRefresh={() => {}} onOpen={() => {}} onLongPress={() => {}} emptyText="No tienes conversaciones todavía." />
  );
}

function States() {
  const { cardWidth } = useLayout();
  return (
    <View style={{ gap: Rhythm.section }}>
      <Section title="Estado vacío">
        <EmptyState icon="calendar-outline" title="Aún no tienes reservas" description="Cuando reserves un equipo aparecerá aquí." actionLabel="Explorar equipos" onAction={() => {}} />
      </Section>
      <Section title="Estado de error">
        <EmptyState tone="error" icon="alert-circle-outline" title="No pudimos cargar" description="Revisa tu conexión e inténtalo de nuevo." actionLabel="Reintentar" onAction={() => {}} />
        <ErrorBanner message="El pago fue rechazado por el banco. Verifica los datos de tu tarjeta e intenta de nuevo." />
      </Section>
      <Section title="Cargando">
        <View style={{ flexDirection: 'row', gap: Rhythm.cardGap }}>
          <ItemCardSkeleton width={cardWidth()} />
          <ItemCardSkeleton width={cardWidth()} />
        </View>
      </Section>
      <Section title="Insignias de estado">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Badge label="Pendiente" tone="warning" />
          <Badge label="Activa" tone="success" />
          <Badge label="Cancelada" tone="danger" />
          <Badge label="Completada" tone="neutral" />
          <Badge label="Nuevo" tone="accent" />
        </View>
      </Section>
      <Section title="Controles">
        <SectionHeader title="Un título de sección muy largo que debe hacer wrap sin empujar la acción" subtitle="Subtítulo de ejemplo" actionLabel="Ver más" onActionPress={() => {}} />
        <QuantityStepper label="Cantidad a rentar" value={2} max={5} onChange={() => {}} />
        <SegmentedControl options={[{ value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' }]} value="light" onChange={() => {}} />
        <ListRow icon="storefront-outline" label="Conviértete en proveedor" onPress={() => {}} />
        <PriceSummary lines={[{ label: '$45.00 x 3 días', value: '$135.00' }, { label: 'Comisión de servicio (5%)', value: '$6.75' }]} total="$141.75" />
        <Button label="Proceder al pago" onPress={() => {}} />
        <Button label="Cancelar reserva" variant="destructive" onPress={() => {}} />
      </Section>
    </View>
  );
}

export default function Gallery() {
  const { s = 'cards' } = useLocalSearchParams<{ s?: string }>();
  if (s === 'messages') return <Messages />;
  return (
    <Screen scroll padded={s !== 'cards'}>
      <View style={{ paddingTop: Rhythm.chipsToSection }}>
        {s === 'lists' ? <Lists /> : s === 'states' ? <States /> : <Cards />}
      </View>
    </Screen>
  );
}
