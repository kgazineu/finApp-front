import { PASSWORD_HINT, passwordsMatch, useAction, useAuth } from '@finapp/shared';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { AuthScreen, Button, Field, FormError } from '@/components';

export default function NewPassword() {
  const { api } = useAuth();
  const { email, code } = useLocalSearchParams<{ email?: string; code?: string }>();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const action = useAction(async () => {
    passwordsMatch(password, confirmation);
    const res = await api.passwordReset.confirm(email!, code!, password);
    router.dismissTo({ pathname: '/entrar', params: { email: email!, notice: res.message } });
  });

  if (!email || !code) return <Redirect href="/recuperar-senha" />;

  return (
    <AuthScreen title="Nova senha" description="Crie a senha nova. Por segurança, todas as sessões abertas serão encerradas.">
      <Field label="Nova senha" type="password" autoComplete="new-password" value={password} onChange={setPassword} hint={PASSWORD_HINT} />
      <Field label="Confirmar nova senha" type="password" autoComplete="new-password" value={confirmation} onChange={setConfirmation} />
      <FormError error={action.error} />
      <Button busy={action.busy} onPress={() => action.run()}>
        Salvar nova senha
      </Button>
    </AuthScreen>
  );
}
