import { useRef, useState } from 'react';
import { View, TextInput, Pressable, ActivityIndicator, useColorScheme } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius } from '@/constants/theme';

const KUSHKI_MERCHANT_ID = process.env.EXPO_PUBLIC_KUSHKI_MERCHANT_ID!;

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
    const webviewRef = useRef<WebView>(null);

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
        paddingVertical: 12,
        paddingHorizontal: Spacing.two,
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: colors.text,
    } as const;

    const fieldWrapperStyle = {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        backgroundColor: colors.backgroundElement,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.three,
    };

    return (
        <View
            style={{
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: Radius.lg,
                padding: Spacing.four,
            }}
        >
            {/* WebView invisible: solo ejecuta el SDK real de Kushki, no se ve en pantalla */}
            <View style={{ width: 0, height: 0, opacity: 0 }}>
                <WebView
                    ref={webviewRef}
                    source={{ html: KUSHKI_HTML }}
                    onMessage={handleWebViewMessage}
                    javaScriptEnabled
                />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.four }}>
                <Ionicons name="lock-closed" size={18} color={colors.textSecondary} />
                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.text }}>Pago seguro</ThemedText>
            </View>

            <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12.5, color: colors.text, marginBottom: 6 }}>
                Nombre en la tarjeta
            </ThemedText>
            <View style={[fieldWrapperStyle, { marginBottom: Spacing.three }]}>
                <TextInput value={name} onChangeText={setName} placeholder="Ej: Juan Pérez" placeholderTextColor={colors.textSecondary} style={inputStyle} />
            </View>

            <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12.5, color: colors.text, marginBottom: 6 }}>
                Número de tarjeta
            </ThemedText>
            <View style={[fieldWrapperStyle, { marginBottom: Spacing.three }]}>
                <TextInput
                    value={cardNumber}
                    onChangeText={handleCardNumberChange}
                    placeholder="5451 9515 7492 5480"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    style={inputStyle}
                />
            </View>

            <View style={{ flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.four }}>
                <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12.5, color: colors.text, marginBottom: 6 }}>
                        Vencimiento
                    </ThemedText>
                    <View style={fieldWrapperStyle}>
                        <TextInput
                            value={expiry}
                            onChangeText={handleExpiryChange}
                            placeholder="12/28"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="number-pad"
                            style={inputStyle}
                        />
                    </View>
                </View>
                <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12.5, color: colors.text, marginBottom: 6 }}>
                        CVV
                    </ThemedText>
                    <View style={fieldWrapperStyle}>
                        <TextInput
                            value={cvv}
                            onChangeText={(t) => setCvv(t.replace(/\D/g, '').substring(0, 4))}
                            placeholder="123"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="number-pad"
                            secureTextEntry
                            style={inputStyle}
                        />
                    </View>
                </View>
            </View>

            <Pressable
                onPress={handleSubmit}
                disabled={!isValid || processing}
                style={{
                    backgroundColor: !isValid || processing ? colors.backgroundSelected : '#111',
                    paddingVertical: Spacing.three,
                    borderRadius: Radius.lg,
                    alignItems: 'center',
                }}
            >
                {processing ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: '#fff' }}>
                        Pagar ${(amount / 100).toFixed(2)}
                    </ThemedText>
                )}
            </Pressable>
        </View>
    );
}