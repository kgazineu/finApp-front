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
import { useState, type FormEvent } from 'react';
import { Actions, Badge, Button, Card, Checkbox, Empty, Field, FormError, ItemActions, Loading, Modal, NoticeBar, Row, Segmented, confirmAction } from '../components';
import { PageHeader } from '../layouts';

const kindOptions: { value: AccountKind; label: string }[] = [
  { value: 'asset', label: 'Ativo (soma)' },
  { value: 'liability', label: 'Passivo (subtrai)' },
];

export function AccountsPage() {
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

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void save.run();
  };

  const form = editing?.form;
  const setForm = (changes: Partial<AccountForm>) => editing && setEditing({ ...editing, form: { ...editing.form, ...changes } });

  return (
    <>
      <PageHeader
        title="Contas"
        description="Onde está o seu dinheiro. Ativos (banco, carteira) somam no total; passivos (fatura do cartão) subtraem."
        action={<Button onClick={() => (save.clearError(), setEditing({ form: emptyAccountForm() }))}>+ Nova conta</Button>}
      />
      <NoticeBar notice={a.notice} onClose={a.clear} />

      <Card title="Contas ativas">
        {a.loading && !a.data ? (
          <Loading />
        ) : a.data?.length ? (
          a.data.map((account) => (
            <Row key={account.id}>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className={ui.strong}>{account.name}</p>
                <div className="flex flex-wrap gap-1">
                  <Badge tone={account.kind === 'asset' ? 'income' : 'expense'}>{accountKindLabel[account.kind]}</Badge>
                  {account.hasYield && <Badge>Rende</Badge>}
                </div>
              </div>
              <ItemActions
                name={account.name}
                onEdit={() => (save.clearError(), setEditing({ id: account.id, form: accountToForm(account) }))}
                onRemove={() => remove(account)}
              />
            </Row>
          ))
        ) : (
          <Empty>Nenhuma conta ainda. Cadastre suas contas para registrar saldos.</Empty>
        )}
        {a.error && <FormError error={a.error} />}
      </Card>

      <Modal open={!!form} title={editing?.id ? 'Editar conta' : 'Nova conta'} onClose={() => setEditing(null)}>
        {form && (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Nome" placeholder="Nubank, Inter, Fatura do cartão..." value={form.name} onChange={(name) => setForm({ name })} autoFocus />
            <Segmented label="Tipo" value={form.kind} options={kindOptions} onChange={(kind) => setForm({ kind })} />
            {form.kind === 'asset' ? (
              <Checkbox checked={form.hasYield} onChange={(hasYield) => setForm({ hasYield })} label="Esta conta rende (conta remunerada)" />
            ) : (
              <p className={ui.small}>Passivo não tem rendimento. Informe a fatura como valor positivo nos registros de saldo.</p>
            )}
            <FormError error={save.error} />
            <Actions>
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button type="submit" busy={save.busy}>
                Salvar
              </Button>
            </Actions>
          </form>
        )}
      </Modal>
    </>
  );
}
