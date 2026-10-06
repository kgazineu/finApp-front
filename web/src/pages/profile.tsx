import { PASSWORD_HINT, digits, formatDateTime, passwordsMatch, ui, useAction, useAuth } from '@finapp/shared';
import { useState, type FormEvent } from 'react';
import { Button, Card, Field, FormError, Modal, NoticeBar } from '../components';
import { PageHeader } from '../layouts';

export function ProfilePage() {
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

  const submit = (run: () => Promise<boolean>) => (e: FormEvent) => {
    e.preventDefault();
    void run();
  };

  return (
    <>
      <PageHeader title="Perfil" />
      <NoticeBar notice={saved ? { text: 'Perfil atualizado.', error: false } : null} onClose={() => setSaved(false)} />

      <Card>
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">{initials}</span>
          <div>
            <p className={ui.subtitle}>{user.name}</p>
            <p className={ui.muted}>{user.email}</p>
            <p className={ui.small}>Conta criada em {formatDateTime(user.createdAt)}</p>
          </div>
        </div>
      </Card>

      <Card title="Dados pessoais">
        <form onSubmit={submit(save.run)} className="flex flex-col gap-4">
          <Field label="Nome" autoComplete="name" value={name} onChange={(v) => (setSaved(false), setName(v))} />
          <Field label="E-mail" type="email" inputMode="email" autoComplete="email" value={email} onChange={(v) => (setSaved(false), setEmail(v))} />
          <FormError error={save.error} />
          <div className="flex justify-end">
            <Button type="submit" busy={save.busy}>
              Salvar alterações
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Segurança">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => (setCode(''), setPassword(''), setConfirmation(''), setChanging('send'))}>
            Alterar senha
          </Button>
          <Button variant="danger" onClick={() => signOut()}>
            Sair
          </Button>
        </div>
      </Card>

      <Modal open={changing !== 'closed'} title="Alterar senha" onClose={() => setChanging('closed')}>
        {changing === 'send' ? (
          <div className="flex flex-col gap-4">
            <p className={ui.muted}>Vamos enviar um código de 6 dígitos para {user.email} para confirmar que é você.</p>
            <FormError error={send.error} />
            <Button busy={send.busy} onClick={() => send.run()}>
              Enviar código
            </Button>
          </div>
        ) : (
          <form onSubmit={submit(change.run)} className="flex flex-col gap-4">
            <p className={ui.muted}>Digite o código enviado para {user.email}. Depois de trocar, você vai precisar entrar de novo.</p>
            <Field
              label="Código"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={code}
              mask={(v) => digits(v).slice(0, 6)}
              onChange={setCode}
              inputClassName="text-center font-mono text-2xl tracking-[0.5em]"
            />
            <Field label="Nova senha" type="password" autoComplete="new-password" value={password} onChange={setPassword} hint={PASSWORD_HINT} />
            <Field label="Confirmar nova senha" type="password" autoComplete="new-password" value={confirmation} onChange={setConfirmation} />
            <FormError error={change.error} />
            <Button type="submit" busy={change.busy} disabled={code.length !== 6}>
              Alterar senha
            </Button>
          </form>
        )}
      </Modal>
    </>
  );
}
