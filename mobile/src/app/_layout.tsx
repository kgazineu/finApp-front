import '../../global.css';

import { AuthProvider, useAuth, type TokenStorage } from '@finapp/shared';
import { Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import { Loading } from '@/components';

const TOKEN_KEY = 'finapp.token';

// token no chaveiro do aparelho (Keychain/Keystore), nunca em AsyncStorage.
// ponytail: SecureStore não existe na web; o fallback só serve para `npm run web` (prévia sem simulador)
const storage: TokenStorage =
  Platform.OS === 'web'
    ? {
        get: async () => localStorage.getItem(TOKEN_KEY),
        set: async (token) => localStorage.setItem(TOKEN_KEY, token),
        remove: async () => localStorage.removeItem(TOKEN_KEY),
      }
    : {
        get: () => SecureStore.getItemAsync(TOKEN_KEY),
        set: (token) => SecureStore.setItemAsync(TOKEN_KEY, token),
        remove: () => SecureStore.deleteItemAsync(TOKEN_KEY),
      };

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

export default function RootLayout() {
  return (
    <AuthProvider baseUrl={API_URL} storage={storage}>
      <StatusBar style="dark" />
      <RootStack />
    </AuthProvider>
  );
}

function RootStack() {
  const { state } = useAuth();

  if (state.status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <Loading />
      </View>
    );
  }

  // trocar o estado de login troca a pilha inteira: sair leva ao login, entrar leva às abas
  const signedIn = state.status === 'signedIn';
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
