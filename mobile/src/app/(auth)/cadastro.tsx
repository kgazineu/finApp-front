import { PASSWORD_HINT, passwordsMatch, useAction, useAuth } from '@finapp/shared';
import { useState } from 'react';
import { AuthScreen, Button, Field, FormError } from '@/components';

export default function Register() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const action = useAction(async () => {
    passwordsMatch(password, confirmation);
    await signUp(name, email, password);
  });

  return (
    <AuthScreen title="Criar conta">
      <Field label="Nome" autoComplete="name" value={name} onChange={setName} />
      <Field label="E-mail" type="email" autoComplete="email" value={email} onChange={setEmail} />
      <Field label="Senha" type="password" autoComplete="new-password" value={password} onChange={setPassword} hint={PASSWORD_HINT} />
      <Field label="Confirmar senha" type="password" autoComplete="new-password" value={confirmation} onChange={setConfirmation} />
      <FormError error={action.error} />
      <Button busy={action.busy} onPress={() => action.run()}>
        Criar conta
      </Button>
    </AuthScreen>
  );
}
