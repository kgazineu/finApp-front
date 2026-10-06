import { useAction, useAuth } from '@finapp/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { AuthScreen, Button, Field, FormError } from '@/components';

export default function ForgotPassword() {
  const { api } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const action = useAction(async () => {
    const res = await api.passwordReset.request(email.trim());
    router.push({ pathname: '/codigo', params: { email: email.trim(), notice: res.message } });
  });

  return (
    <AuthScreen
      title="Recuperar senha"
      description="Informe o e-mail da sua conta. Vamos enviar um código de 6 dígitos para você criar uma senha nova."
    >
      <Field label="E-mail" type="email" autoComplete="email" value={email} onChange={setEmail} onSubmit={() => action.run()} />
      <FormError error={action.error} />
      <Button busy={action.busy} onPress={() => action.run()}>
        Enviar código
      </Button>
    </AuthScreen>
  );
}
