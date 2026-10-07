import {
  ApiError,
  PASSWORD_HINT,
  digits,
  formatDateTime,
  maskMoney,
  passwordsMatch,
  savingsGoalToForm,
  ui,
  useAction,
  useAuth,
  useNotice,
  useSavingsGoal,
  type SavingsGoalForm,
} from '@finapp/shared';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Button, Card, Field, FormError, Modal, NoticeBar, Segmented, confirmAction } from '../components';
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

  // backup: baixa um JSON com todos os dados; importar numa conta com dados troca tudo (com confirmação)
  const dataNotice = useNotice();
  const fileInput = useRef<HTMLInputElement>(null);
  const exportData = useAction(async () => {
    const file = await api.data.export();
    const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `finapp-dados-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    dataNotice.ok('Arquivo baixado. Guarde-o: ele tem todos os seus dados do FinApp.');
  });
  const importData = useAction(async (file: File) => {
    let content: unknown;
    try {
      content = JSON.parse(await file.text());
    } catch {
      throw new Error('Arquivo inválido: escolha o .json gerado por "Exportar dados"');
    }
    try {
      dataNotice.ok((await api.data.import(content)).message); // conta vazia: importa direto
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 409)) throw err;
      const replace = await confirmAction(
        'Você já tem dados cadastrados. Importar este arquivo vai APAGAR tudo o que você tem hoje (contas, registros de saldo, ' +
          'transações, valores a receber, lançamentos e metas) e colocar o conteúdo do arquivo no lugar. Não dá para desfazer: ' +
          'se quiser guardar o que tem agora, cancele e use "Exportar dados" antes.\n\nSubstituir seus dados pelos do arquivo?',
      );
      if (replace) dataNotice.ok((await api.data.import(content, true)).message);
    }
  });
  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite escolher o mesmo arquivo de novo
    if (file) void importData.run(file);
  };

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

      <SavingsGoalCard />

      <Card title="Seus dados">
        <p className={ui.muted}>
          Baixe um arquivo com tudo o que você cadastrou: contas, registros de saldo, transações, valores a receber, lançamentos e
          metas, com o histórico de pagamentos. "Importar dados" grava o conteúdo de um arquivo desses nesta conta: se ela já tiver
          dados, tudo o que existe é substituído pelo arquivo (você confirma antes).
        </p>
        <NoticeBar notice={dataNotice.notice} onClose={dataNotice.clear} />
        <FormError error={exportData.error ?? importData.error} />
        <div className="flex flex-wrap gap-2">
          <Button busy={exportData.busy} onClick={() => (importData.clearError(), exportData.run())}>
            Exportar dados
          </Button>
          <Button variant="secondary" busy={importData.busy} onClick={() => (exportData.clearError(), fileInput.current?.click())}>
            Importar dados
          </Button>
          <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
        </div>
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

/** reserva mensal (quanto guardar por mês): só um número para a tela inicial (quanto guardar e quanto sobra para gastar) */
function SavingsGoalCard() {
  const goal = useSavingsGoal();
  const [form, setForm] = useState<SavingsGoalForm>(() => savingsGoalToForm(goal.data));
  useEffect(() => {
    if (goal.data) setForm(savingsGoalToForm(goal.data));
  }, [goal.data]);
  const save = useAction(() => goal.save(form));
  const remove = useAction(() => goal.remove());
  const hasGoal = goal.data?.percent != null || goal.data?.amount != null;

  return (
    <Card title="Reserva mensal">
      <p className={ui.muted}>Quanto você quer guardar todo mês. A tela inicial mostra a reserva e quanto sobra para gastar; a projeção não muda.</p>
      <NoticeBar notice={goal.notice} onClose={goal.clear} />
      <Segmented
        value={form.kind}
        options={[
          { value: 'percent', label: '% do que sobra' },
          { value: 'amount', label: 'Valor fixo' },
        ]}
        onChange={(kind) => setForm({ kind, value: '' })}
      />
      {form.kind === 'percent' ? (
        <Field
          label="Porcentagem do que sobra no mês"
          placeholder="50"
          inputMode="numeric"
          value={form.value}
          mask={(v) => digits(v).slice(0, 3)}
          onChange={(value) => setForm({ ...form, value })}
          hint="O que sobra = o crescimento por mês: entradas fixas − despesas fixas."
        />
      ) : (
        <Field label="Quanto guardar por mês" prefix="R$" inputMode="numeric" value={form.value} mask={maskMoney} onChange={(value) => setForm({ ...form, value })} />
      )}
      <FormError error={save.error ?? remove.error} />
      <div className="flex flex-wrap gap-2">
        <Button busy={save.busy} onClick={() => (remove.clearError(), save.run())}>
          Salvar reserva
        </Button>
        {hasGoal && (
          <Button variant="secondary" busy={remove.busy} onClick={() => (save.clearError(), remove.run())}>
            Remover reserva
          </Button>
        )}
      </div>
    </Card>
  );
}
