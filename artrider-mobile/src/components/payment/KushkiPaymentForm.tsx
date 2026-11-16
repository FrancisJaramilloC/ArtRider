import { useRef, useState } from 'react';
import { View, TextInput } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Colors, Fonts, MinTouch, Spacing, Radius } from '@/constants/theme';

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

type Props = {
    amount: number; // en centavos
    onSuccess: (token: string) => void;
    onError: (error: string) => void;
};

export function KushkiPaymentForm({ amount, onSuccess, onError }: Props) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const webviewRef = useRef<WebView<object>>(null);

    const [name, setName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [processing, setProcessing] = useState(false);

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
        if (!isValid) return;
        setProcessing(true);

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
        setProcessing(false);
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
        minHeight: MinTouch,
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

            <View style={{ gap: 6 }}>
                <Text variant="captionStrong">Nombre en la tarjeta</Text>
                <View style={fieldWrapperStyle}>
                    <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="Ej: Juan Pérez"
                        placeholderTextColor={colors.textMuted}
                        accessibilityLabel="Nombre en la tarjeta"
                        maxFontSizeMultiplier={1.3}
                        style={inputStyle}
                    />
                </View>
            </View>

            <View style={{ gap: 6 }}>
                <Text variant="captionStrong">Número de tarjeta</Text>
                <View style={fieldWrapperStyle}>
                    <TextInput
                        value={cardNumber}
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
                <View style={{ flex: 1, gap: 6 }}>
                    <Text variant="captionStrong">Vencimiento</Text>
                    <View style={fieldWrapperStyle}>
                        <TextInput
                            value={expiry}
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
                <View style={{ flex: 1, gap: 6 }}>
                    <Text variant="captionStrong">CVV</Text>
                    <View style={fieldWrapperStyle}>
                        <TextInput
                            value={cvv}
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
                disabled={!isValid || processing}
                loading={processing}
            />
        </View>
    );
}
