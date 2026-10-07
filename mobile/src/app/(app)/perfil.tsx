import {
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
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { Button, Card, Field, FormError, Modal, NoticeBar, Screen, Segmented, confirmAction } from '@/components';

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

  // backup: gera o JSON com todos os dados e abre o compartilhar (salvar em Arquivos, Drive, e-mail...)
  const dataNotice = useNotice();
  const exportData = useAction(async () => {
    const content = JSON.stringify(await api.data.export(), null, 2);
    const name = `finapp-dados-${new Date().toISOString().slice(0, 10)}.json`;

    if (Platform.OS === 'web') {
      // prévia no navegador (expo start --web): não há compartilhar de arquivo, então baixa
      const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
      dataNotice.ok('Arquivo baixado. Guarde-o: ele tem todos os seus dados do FinApp.');
      return;
    }

    if (!(await Sharing.isAvailableAsync())) throw new Error('Este aparelho não permite compartilhar arquivos');
    const file = new File(Paths.cache, name);
    file.create({ overwrite: true });
    file.write(content);
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Exportar dados do FinApp' });
    dataNotice.ok('Arquivo gerado. Guarde-o (Arquivos, Drive, e-mail): ele tem todos os seus dados do FinApp.');
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

      <SavingsGoalCard />

      <Card title="Seus dados">
        <Text className={ui.muted}>
          Gere um arquivo com tudo o que você cadastrou: contas, registros de saldo, transações, valores a receber, lançamentos e metas.
          Para importar um arquivo desses (outro servidor ou backup), use o site: Perfil → Importar dados.
        </Text>
        <NoticeBar notice={dataNotice.notice} onClose={dataNotice.clear} />
        <FormError error={exportData.error} />
        <Button busy={exportData.busy} onPress={() => exportData.run()}>
          Exportar dados
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

/** meta de guardar por mês: só um número para a tela inicial (quanto guardar e quanto sobra para gastar) */
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
    <Card title="Meta de guardar por mês">
      <Text className={ui.muted}>Quanto você quer guardar todo mês. A tela inicial mostra a meta e quanto sobra para gastar; a projeção não muda.</Text>
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
      <Button busy={save.busy} onPress={() => (remove.clearError(), save.run())}>
        Salvar meta
      </Button>
      {hasGoal ? (
        <Button variant="secondary" busy={remove.busy} onPress={() => (save.clearError(), remove.run())}>
          Remover meta
        </Button>
      ) : null}
    </Card>
  );
}
