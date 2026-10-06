import { ui, useAction, useAuth } from '@finapp/shared';
import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { AuthScreen, Button, Field, FormError, NoticeBar } from '@/components';

export default function Login() {
  const { signIn } = useAuth();
  const params = useLocalSearchParams<{ email?: string; notice?: string }>();
  const [notice, setNotice] = useState(params.notice ?? null);
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const action = useAction(() => signIn(email, password));

  return (
    <AuthScreen title="Entrar" description="Acompanhe seu saldo e veja quanto vai ter no mês que vem.">
      <NoticeBar notice={notice ? { text: notice, error: false } : null} onClose={() => setNotice(null)} />
      <Field label="E-mail" type="email" autoComplete="email" value={email} onChange={setEmail} />
      <Field label="Senha" type="password" autoComplete="current-password" value={password} onChange={setPassword} onSubmit={() => action.run()} />
      <FormError error={action.error} />
      <Button busy={action.busy} onPress={() => action.run()}>
        Entrar
      </Button>
      <View className="items-center gap-3 pt-2">
        <Link href={{ pathname: '/recuperar-senha', params: { email } }} className={ui.link}>
          Esqueci minha senha
        </Link>
        <Text className={ui.muted}>
          Não tem conta?{' '}
          <Link href="/cadastro" className={ui.link}>
            Criar conta
          </Link>
        </Text>
      </View>
    </AuthScreen>
  );
}
