export type CategoryId = 'all' | 'audio' | 'lighting' | 'video' | 'effects' | 'advertising';

export const CATEGORIES: { id: CategoryId; label: string; icon: string }[] = [
    { id: 'all', label: 'Todos', icon: 'grid-outline' },
    { id: 'audio', label: 'Sonido', icon: 'volume-high-outline' },
    { id: 'lighting', label: 'Iluminación', icon: 'flash-outline' },
    { id: 'video', label: 'Video', icon: 'videocam-outline' },
    { id: 'effects', label: 'Efectos', icon: 'sparkles-outline' },
    { id: 'advertising', label: 'Publicidad', icon: 'megaphone-outline' },
];

export const CATEGORY_LABELS: Record<string, string> = {
    audio: 'Sonido',
    lighting: 'Iluminación',
    video: 'Video',
    effects: 'Efectos',
    advertising: 'Publicidad',
    other: 'Otro',
};

