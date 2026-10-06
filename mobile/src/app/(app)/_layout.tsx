import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

type Icon = keyof typeof Ionicons.glyphMap;

// mesmas seções da navegação da web (web/src/layouts.tsx)
const tabs: { name: string; title: string; icon: Icon }[] = [
  { name: 'index', title: 'Início', icon: 'trending-up' },
  { name: 'transacoes', title: 'Transações', icon: 'swap-vertical' },
  { name: 'a-receber', title: 'A receber', icon: 'cash-outline' },
  { name: 'contas', title: 'Contas', icon: 'wallet-outline' },
  { name: 'perfil', title: 'Perfil', icon: 'person-circle-outline' },
];

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#64748b',
        headerTitleStyle: { fontWeight: '700', color: '#0f172a' },
        headerShadowVisible: false,
      }}
    >
      {tabs.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{ title: t.title, tabBarIcon: ({ color, size }) => <Ionicons name={t.icon} color={color} size={size} /> }}
        />
      ))}
    </Tabs>
  );
}
