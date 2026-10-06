import { Stack } from 'expo-router';

export const unstable_settings = { initialRouteName: 'entrar' };

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        title: '',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#f8fafc' },
        headerTintColor: '#047857',
        headerBackTitle: 'Voltar',
      }}
    >
      <Stack.Screen name="entrar" />
      <Stack.Screen name="cadastro" />
      <Stack.Screen name="recuperar-senha" />
      <Stack.Screen name="codigo" />
      <Stack.Screen name="nova-senha" />
    </Stack>
  );
}
