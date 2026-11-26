import { useEffect, useRef, useState } from 'react';
import { View, TextInput } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Colors, Fonts, MinTouch, Spacing, Radius, FieldHeight } from '@/constants/theme';

const KUSHKI_MERCHANT_ID = process.env.EXPO_PUBLIC_KUSHKI_MERCHANT_ID || '7b1bae59194f4e74ae0aec0d506df181';

// Página mínima que carga el SDK real de Kushki.js y escucha mensajes
// de React Native para pedir el token — así usamos el mismo código que
// ya funciona en la web, en vez de replicar su comportamiento a mano.
const KUSHKI_HTML = `
<!DOCTYPE html>
<html>
<head><script src="https://cdn.kushkipagos.com/kushki.min.js"></script></head>
<body>
<script>
  function handleMessage(event) {
    try {
      var data = JSON.parse(event.data);
      var kushki = new Kushki({ merchantId: data.merchantId, inTestEnvironment: true });
      kushki.requestToken({
        amount: data.amount,
        currency: 'USD',
        card: data.card
      }, function(response) {
        window.ReactNativeWebView.postMessage(JSON.stringify(response));
      });
    } catch (e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ code: 'JS_ERROR', message: e.message }));
    }
  }
  document.addEventListener('message', handleMessage);
  window.addEventListener('message', handleMessage);
</script>
</body>
</html>
`;

/** Tiempo máximo para que el WebView devuelva el token de la tarjeta. */
const TOKEN_TIMEOUT_MS = 30_000;

type Props = {
    amount: number; // en centavos
    onSuccess: (token: string) => void;
    onError: (error: string) => void;
    /** Bloquea el formulario (campos y botón "Pagar") mientras el servidor procesa el cobro: evita el doble toque. */
    disabled?: boolean;
};

export function KushkiPaymentForm({ amount, onSuccess, onError, disabled = false }: Props) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const webviewRef = useRef<WebView<object>>(null);

    const [name, setName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [processing, setProcessing] = useState(false);
    // Candado síncrono: `processing` es estado y no se ve hasta el siguiente render, así que un doble toque rápido pediría dos
    // tokens. Con el ref solo se pide uno por envío, y un mensaje del WebView que no corresponde a un envío se descarta.
    const submittingRef = useRef(false);
    // Si el WebView nunca contesta (script de Kushki sin cargar, sin red, callback que no llega), el envío caduca y se libera.
    const tokenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    function clearTokenTimer() {
        if (tokenTimerRef.current) {
            clearTimeout(tokenTimerRef.current);
            tokenTimerRef.current = null;
        }
    }

    // Al desmontar no debe quedar ningún temporizador vivo.
    useEffect(() => clearTokenTimer, []);

    function handleCardNumberChange(text: string) {
        const digits = text.replace(/\D/g, '');
        const formatted = digits.match(/.{1,4}/g)?.join(' ') ?? '';
        setCardNumber(formatted.substring(0, 19));
    }

    function handleExpiryChange(text: string) {
        let digits = text.replace(/\D/g, '');
        if (digits.length >= 2) {
            digits = digits.substring(0, 2) + '/' + digits.substring(2, 4);
        }
        setExpiry(digits.substring(0, 5));
    }

    const isValid = name.length > 0 && cardNumber.replace(/\s/g, '').length >= 15 && expiry.length === 5 && cvv.length >= 3;

    function handleSubmit() {
        if (submittingRef.current || disabled) return;
        if (!isValid) return;
        submittingRef.current = true;
        setProcessing(true);
        // Sin token no hay cobro: si no llega respuesta en TOKEN_TIMEOUT_MS, se libera el envío y se puede reintentar.
        // Un token que llegue después se descarta (submittingRef ya es false).
        clearTokenTimer();
        tokenTimerRef.current = setTimeout(() => {
            tokenTimerRef.current = null;
            if (!submittingRef.current) return;
            submittingRef.current = false;
            setProcessing(false);
            onError('No pudimos validar tu tarjeta. Inténtalo de nuevo.');
        }, TOKEN_TIMEOUT_MS);

        const [month, year] = expiry.split('/');
        const cleanCardNumber = cardNumber.replace(/\D/g, '');

        webviewRef.current?.postMessage(
            JSON.stringify({
                merchantId: KUSHKI_MERCHANT_ID,
                amount: (amount / 100).toFixed(2),
                card: {
                    name,
                    number: cleanCardNumber,
                    cvc: cvv,
                    expiryMonth: month ?? '',
                    expiryYear: year ?? '',
                },
            })
        );
    }

    function handleWebViewMessage(event: WebViewMessageEvent) {
        clearTokenTimer();
        setProcessing(false);
        // Token que no pidió ningún envío en curso (p. ej. un segundo token tras un error reintentable): no lanza otro cobro.
        if (!submittingRef.current) return;
        submittingRef.current = false;
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.code) {
                onError(`${data.code} ${data.message ?? 'Error al validar la tarjeta'}`);
                return;
            }
            onSuccess(data.token);
        } catch {
            onError('Respuesta inesperada del procesador de pagos.');
        }
    }

    const inputStyle = {
        flex: 1,
        minHeight: FieldHeight,
        paddingHorizontal: Spacing.two,
        fontSize: 15,
        fontFamily: Fonts.sans,
        color: colors.text,
    } as const;

    const fieldWrapperStyle = {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        backgroundColor: colors.backgroundElement,
        borderRadius: Radius.xl,
        paddingHorizontal: Spacing.two,
    };

    return (
        <View
            style={{
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: Radius.card,
                padding: Spacing.four,
                gap: Spacing.three,
            }}
        >
            {/* WebView invisible: solo ejecuta el SDK real de Kushki, no se ve en pantalla */}
            <View style={{ width: 0, height: 0, opacity: 0 }}>
                <WebView<object>
                    ref={webviewRef}
                    source={{ html: KUSHKI_HTML }}
                    onMessage={handleWebViewMessage}
                    javaScriptEnabled
                />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                <Ionicons name="lock-closed" size={18} color={colors.textSecondary} />
                <Text variant="subtitle">Pago seguro</Text>
            </View>

            <View style={{ gap: Spacing.two }}>
                <Text variant="captionStrong">Nombre en la tarjeta</Text>
                <View style={fieldWrapperStyle}>
                    <TextInput
                        value={name}
                        editable={!disabled}
                        onChangeText={setName}
                        placeholder="Ej: Juan Pérez"
                        placeholderTextColor={colors.textMuted}
                        accessibilityLabel="Nombre en la tarjeta"
                        maxFontSizeMultiplier={1.3}
                        style={inputStyle}
                    />
                </View>
            </View>

            <View style={{ gap: Spacing.two }}>
                <Text variant="captionStrong">Número de tarjeta</Text>
                <View style={fieldWrapperStyle}>
                    <TextInput
                        value={cardNumber}
                        editable={!disabled}
                        onChangeText={handleCardNumberChange}
                        placeholder="5451 9515 7492 5480"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="number-pad"
                        accessibilityLabel="Número de tarjeta"
                        maxFontSizeMultiplier={1.3}
                        style={inputStyle}
                    />
                </View>
            </View>

            <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                <View style={{ flex: 1, gap: Spacing.two }}>
                    <Text variant="captionStrong">Vencimiento</Text>
                    <View style={fieldWrapperStyle}>
                        <TextInput
                            value={expiry}
                            editable={!disabled}
                            onChangeText={handleExpiryChange}
                            placeholder="12/28"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="number-pad"
                            accessibilityLabel="Vencimiento"
                            maxFontSizeMultiplier={1.3}
                            style={inputStyle}
                        />
                    </View>
                </View>
                <View style={{ flex: 1, gap: Spacing.two }}>
                    <Text variant="captionStrong">CVV</Text>
                    <View style={fieldWrapperStyle}>
                        <TextInput
                            value={cvv}
                            editable={!disabled}
                            onChangeText={(t) => setCvv(t.replace(/\D/g, '').substring(0, 4))}
                            placeholder="123"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="number-pad"
                            secureTextEntry
                            accessibilityLabel="CVV"
                            maxFontSizeMultiplier={1.3}
                            style={inputStyle}
                        />
                    </View>
                </View>
            </View>

            <Button
                label={`Pagar $${(amount / 100).toFixed(2)}`}
                onPress={handleSubmit}
                disabled={!isValid || processing || disabled}
                loading={processing || disabled}
            />
        </View>
    );
}
