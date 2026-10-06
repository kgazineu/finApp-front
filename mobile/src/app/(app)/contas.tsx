import {
  accountKindLabel,
  accountToForm,
  emptyAccountForm,
  ui,
  useAccounts,
  useAction,
  type Account,
  type AccountForm,
  type AccountKind,
} from '@finapp/shared';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, Button, Card, Checkbox, Empty, Field, FormError, Loading, Modal, NoticeBar, PageHeader, Row, Screen, Segmented, confirmAction } from '@/components';

const kindOptions: { value: AccountKind; label: string }[] = [
  { value: 'asset', label: 'Ativo (soma)' },
  { value: 'liability', label: 'Passivo (subtrai)' },
];

export default function Accounts() {
  const a = useAccounts();
  const [editing, setEditing] = useState<{ id?: number; form: AccountForm } | null>(null);
  const save = useAction(async () => {
    await a.save(editing!.form, editing!.id);
    setEditing(null);
  });

  async function remove(account: Account) {
    const ok = await confirmAction(
      `Remover "${account.name}"? Se ela já aparece em algum registro de saldo, será arquivada e o histórico fica guardado.`,
    );
    if (ok) await a.remove(account);
  }

  const form = editing?.form;
  const setForm = (changes: Partial<AccountForm>) => editing && setEditing({ ...editing, form: { ...editing.form, ...changes } });

  return (
    <Screen onRefresh={a.reload} refreshing={a.loading && !!a.data}>
      <PageHeader
        description="Onde está o seu dinheiro. Ativos (banco, carteira) somam no total; passivos (fatura do cartão) subtraem."
        action={<Button onPress={() => (save.clearError(), setEditing({ form: emptyAccountForm() }))}>+ Nova conta</Button>}
      />
      <NoticeBar notice={a.notice} onClose={a.clear} />

      <Card title="Contas ativas">
        {a.loading && !a.data ? (
          <Loading />
        ) : a.data?.length ? (
          a.data.map((account) => (
            <Row key={account.id}>
              <View className="flex-1 gap-1">
                <Text className={ui.strong}>{account.name}</Text>
                <View className="flex-row flex-wrap gap-1">
                  <Badge tone={account.kind === 'asset' ? 'income' : 'expense'}>{accountKindLabel[account.kind]}</Badge>
                  {account.hasYield && <Badge>Rende</Badge>}
                </View>
              </View>
              <View className="flex-row">
                <Button variant="ghost" onPress={() => (save.clearError(), setEditing({ id: account.id, form: accountToForm(account) }))}>
                  Editar
                </Button>
                <Button variant="ghostDanger" onPress={() => remove(account)}>
                  Remover
                </Button>
              </View>
            </Row>
          ))
        ) : (
          <Empty>Nenhuma conta ainda. Cadastre suas contas para registrar saldos.</Empty>
        )}
        <FormError error={a.error} />
      </Card>

      <Modal open={!!form} title={editing?.id ? 'Editar conta' : 'Nova conta'} onClose={() => setEditing(null)}>
        {form && (
          <>
            <Field label="Nome" placeholder="Nubank, Inter, Fatura do cartão..." value={form.name} onChange={(name) => setForm({ name })} />
            <Segmented label="Tipo" value={form.kind} options={kindOptions} onChange={(kind) => setForm({ kind })} />
            {form.kind === 'asset' ? (
              <Checkbox checked={form.hasYield} onChange={(hasYield) => setForm({ hasYield })} label="Esta conta rende (conta remunerada)" />
            ) : (
              <Text className={ui.small}>Passivo não tem rendimento. Informe a fatura como valor positivo nos registros de saldo.</Text>
            )}
            <FormError error={save.error} />
            <Button busy={save.busy} onPress={() => save.run()}>
              Salvar
            </Button>
          </>
        )}
      </Modal>
    </Screen>
  );
}
