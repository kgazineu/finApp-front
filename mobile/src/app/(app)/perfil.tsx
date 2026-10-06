import { PASSWORD_HINT, digits, formatDateTime, passwordsMatch, ui, useAction, useAuth } from '@finapp/shared';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Field, FormError, Modal, NoticeBar, Screen, confirmAction } from '@/components';

export default function Profile() {
  const { state, updateProfile, signOut, api } = useAuth();
  const user = state.status === 'signedIn' ? state.user : null;
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [saved, setSaved] = useState(false);
  const save = useAction(async () => {
    await updateProfile({ name, email });
    setSaved(true);
  });

  // trocar a senha usa o mesmo fluxo da recuperação: código por e-mail + senha nova
  const [changing, setChanging] = useState<'closed' | 'send' | 'confirm'>('closed');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const send = useAction(async () => {
    await api.passwordReset.request(user!.email);
    setChanging('confirm');
  });
  const change = useAction(async () => {
    passwordsMatch(password, confirmation);
    await api.passwordReset.confirm(user!.email, code, password);
    await signOut(); // a troca encerra todas as sessões
  });

  if (!user) return null;
  const initials = user.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <Screen>
      <NoticeBar notice={saved ? { text: 'Perfil atualizado.', error: false } : null} onClose={() => setSaved(false)} />

      <Card>
        <View className="flex-row items-center gap-4">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <Text className="text-lg font-bold text-emerald-700">{initials}</Text>
          </View>
          <View className="flex-1">
            <Text className={ui.subtitle}>{user.name}</Text>
            <Text className={ui.muted}>{user.email}</Text>
            <Text className={ui.small}>Conta criada em {formatDateTime(user.createdAt)}</Text>
          </View>
        </View>
      </Card>

      <Card title="Dados pessoais">
        <Field label="Nome" autoComplete="name" value={name} onChange={(v) => (setSaved(false), setName(v))} />
        <Field label="E-mail" type="email" autoComplete="email" value={email} onChange={(v) => (setSaved(false), setEmail(v))} />
        <FormError error={save.error} />
        <Button busy={save.busy} onPress={() => save.run()}>
          Salvar alterações
        </Button>
      </Card>

      <Card title="Segurança">
        <Button variant="secondary" onPress={() => (setCode(''), setPassword(''), setConfirmation(''), setChanging('send'))}>
          Alterar senha
        </Button>
        <Button variant="danger" onPress={async () => (await confirmAction('Sair da sua conta neste aparelho?', 'Sair')) && signOut()}>
          Sair
        </Button>
      </Card>

      <Modal open={changing !== 'closed'} title="Alterar senha" onClose={() => setChanging('closed')}>
        {changing === 'send' ? (
          <>
            <Text className={ui.muted}>Vamos enviar um código de 6 dígitos para {user.email} para confirmar que é você.</Text>
            <FormError error={send.error} />
            <Button busy={send.busy} onPress={() => send.run()}>
              Enviar código
            </Button>
          </>
        ) : (
          <>
            <Text className={ui.muted}>Digite o código enviado para {user.email}. Depois de trocar, você vai precisar entrar de novo.</Text>
            <Field
              label="Código"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={code}
              mask={(v) => digits(v).slice(0, 6)}
              onChange={setCode}
              inputClassName="text-center font-mono text-2xl tracking-widest"
            />
            <Field label="Nova senha" type="password" autoComplete="new-password" value={password} onChange={setPassword} hint={PASSWORD_HINT} />
            <Field label="Confirmar nova senha" type="password" autoComplete="new-password" value={confirmation} onChange={setConfirmation} />
            <FormError error={change.error} />
            <Button busy={change.busy} disabled={code.length !== 6} onPress={() => change.run()}>
              Alterar senha
            </Button>
          </>
        )}
      </Modal>
    </Screen>
  );
}
