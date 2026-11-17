import { useCallback, useEffect, useState, type ReactNode, type RefObject } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, View, type ScrollViewInstance } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import Animated, { SlideInLeft, SlideInRight, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Rhythm, Spacing, WizardType } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { hapticTap } from '@/utils/haptics';
import { Button } from './Button';
import { ConfirmSheet } from './ConfirmSheet';
import { IconButton } from './IconButton';
import { ModalScreen } from './ModalScreen';
import { StickyFooter } from './StickyFooter';
import { Text } from './Text';

/** Duración de la transición horizontal entre pasos. */
const STEP_TRANSITION_MS = 200;
const PROGRESS_HEIGHT = 4;

export type WizardScaffoldProps = {
  /** Paso actual (base 0) y total de pasos: alimentan la barra de progreso. */
  stepIndex: number;
  stepCount: number;
  title: string;
  subtitle?: string;
  /** ¿Hay datos escritos? Si sí, cerrar pide confirmación. */
  hasData: boolean;
  /** Texto del botón principal («Siguiente», «Publicar anuncio», «Guardar cambios»…). */
  nextLabel: string;
  nextLoading?: boolean;
  onNext: () => void;
  /** Sin esta función no se muestra «Atrás» (primer paso). */
  onBack?: () => void;
  /** Contenido de «Vista previa»; sin él no se muestra el botón. */
  preview?: ReactNode;
  /** Mismo ref del `useForm` para desplazar al primer error. */
  scrollRef?: RefObject<ScrollViewInstance | null>;
  /** Aviso fijo sobre los botones (p. ej. «3 equipos seleccionados»). */
  footerNote?: ReactNode;
  exitTitle?: string;
  exitMessage?: string;
  children: ReactNode;
};

/**
 * Armazón de los asistentes estilo anfitrión: X + «Vista previa», barra de progreso continua, título de
 * paso, contenido con transición horizontal, y barra inferior fija (Atrás / Siguiente) que sube con el
 * teclado. Cerrar con datos pide confirmación (también el botón atrás del sistema).
 */
export function WizardScaffold({
  stepIndex,
  stepCount,
  title,
  subtitle,
  hasData,
  nextLabel,
  nextLoading = false,
  onNext,
  onBack,
  preview,
  scrollRef,
  footerNote,
  exitTitle = '¿Salir sin publicar?',
  exitMessage = 'Si sales ahora, perderás lo que escribiste.',
  children,
}: WizardScaffoldProps) {
  const colors = useTheme();
  const router = useRouter();
  const { gutter, contentWidth } = useLayout();
  const reduceMotion = useReducedMotion();

  const [confirmExit, setConfirmExit] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [lastStep, setLastStep] = useState(stepIndex);

  // La dirección de la transición sale de hacia dónde cambió el paso.
  if (stepIndex !== lastStep) {
    setDirection(stepIndex > lastStep ? 1 : -1);
    setLastStep(stepIndex);
  }

  const progress = useSharedValue((stepIndex + 1) / stepCount);
  useEffect(() => {
    const target = (stepIndex + 1) / stepCount;
    progress.value = reduceMotion ? target : withTiming(target, { duration: STEP_TRANSITION_MS });
  }, [stepIndex, stepCount, reduceMotion, progress]);
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const requestClose = useCallback(() => {
    if (hasData) setConfirmExit(true);
    else router.back();
  }, [hasData, router]);

  // Botón atrás del sistema (Android): mismo comportamiento que la X.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        requestClose();
        return true;
      });
      return () => sub.remove();
    }, [requestClose]),
  );

  const entering = reduceMotion ? undefined : (direction === 1 ? SlideInRight : SlideInLeft).duration(STEP_TRANSITION_MS);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      {/* El gesto de volver de iOS saltaría la confirmación: se desactiva en el asistente. */}
      <Stack.Screen options={{ gestureEnabled: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ width: '100%', maxWidth: contentWidth, alignSelf: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: gutter - 2, paddingRight: gutter }}>
            <IconButton icon="close" label="Cerrar" onPress={requestClose} />
            {preview ? <Button label="Vista previa" variant="ghost" size="sm" fullWidth={false} onPress={() => setShowPreview(true)} /> : null}
          </View>

          <View
            accessibilityRole="progressbar"
            accessibilityLabel={`Paso ${stepIndex + 1} de ${stepCount}`}
            style={{ height: PROGRESS_HEIGHT, marginHorizontal: gutter, borderRadius: PROGRESS_HEIGHT / 2, backgroundColor: colors.backgroundElement, overflow: 'hidden' }}
          >
            <Animated.View style={[{ height: PROGRESS_HEIGHT, borderRadius: PROGRESS_HEIGHT / 2, backgroundColor: colors.primary }, barStyle]} />
          </View>

          <Animated.View key={stepIndex} entering={entering} style={{ flex: 1 }}>
            <ScrollView
              ref={scrollRef}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: Rhythm.section, paddingBottom: Rhythm.section, gap: Rhythm.section }}
            >
              <View style={{ gap: Spacing.two }}>
                <Text variant="display" accessibilityRole="header" style={WizardType.stepTitle}>
                  {title}
                </Text>
                {subtitle ? (
                  <Text variant="body" color="textSecondary">
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              {children}
            </ScrollView>
          </Animated.View>
        </View>

        <StickyFooter>
          {footerNote}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three }}>
            {onBack ? <Button label="Atrás" variant="ghost" size="sm" fullWidth={false} onPress={onBack} disabled={nextLoading} /> : <View />}
            <Button
              label={nextLabel}
              fullWidth={false}
              loading={nextLoading}
              onPress={() => {
                if (nextLoading) return; // sin doble toque
                hapticTap();
                onNext();
              }}
            />
          </View>
        </StickyFooter>
      </KeyboardAvoidingView>

      <ConfirmSheet
        visible={confirmExit}
        title={exitTitle}
        message={exitMessage}
        confirmLabel="Salir"
        cancelLabel="Seguir editando"
        destructive
        onConfirm={() => {
          setConfirmExit(false);
          router.back();
        }}
        onCancel={() => setConfirmExit(false)}
      />
      {preview ? (
        <ModalScreen visible={showPreview} title="Vista previa" onClose={() => setShowPreview(false)}>
          <ScrollView contentContainerStyle={{ padding: gutter, gap: Rhythm.titleToContent }}>
            {preview}
            <Text variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
              Así se ve por ahora: sigue completando los pasos para publicar.
            </Text>
          </ScrollView>
        </ModalScreen>
      ) : null}
    </SafeAreaView>
  );
}
