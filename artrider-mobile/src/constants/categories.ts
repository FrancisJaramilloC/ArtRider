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

export const CATEGORY_GRADIENTS: Record<string, [string, string]> = {
    audio: ['#875B9A', '#5c3569'],
    lighting: ['#2563eb', '#1e3a8a'],
    video: ['#7c3aed', '#4c1d95'],
    effects: ['#db2777', '#831843'],
    advertising: ['#4f46e5', '#312e81'],
    other: ['#6b7280', '#1f2937'],
    package: ['#7C3AED', '#D61F9E'],
};