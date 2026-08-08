import { View, useColorScheme } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ProtectedScreen } from '@/components/protected-screen';
import { Colors } from '@/constants/theme';

export default function MessagesScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <ProtectedScreen>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ThemedText type="title">Mensajes</ThemedText>
      </View>
    </ProtectedScreen>
  );
}