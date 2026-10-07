import {
  accountToForm,
  cx,
  emptyAccountForm,
  formatDateTime,
  money,
  ui,
  useAccounts,
  useAction,
  type Account,
  type AccountForm,
  type AccountKind,
} from '@finapp/shared';
import { useState, type FormEvent } from 'react';
import { Actions, Badge, Button, Card, Checkbox, Empty, Field, FormError, ListButton, Loading, Modal, NoticeBar, Segmented, confirmAction } from '../components';
import { PageHeader } from '../layouts';

const kindOptions: { value: AccountKind; label: string }[] = [
  { value: 'asset', label: 'Conta ou carteira' },
  { value: 'liability', label: 'Cartão ou dívida' },
];

const groups: { kind: AccountKind; title: string; empty: string }[] = [
  { kind: 'asset', title: 'Contas e carteiras', empty: 'Nenhuma conta ainda. Cadastre o banco e a carteira onde fica seu dinheiro.' },
  { kind: 'liability', title: 'Cartões e dívidas', empty: 'Nenhum cartão. Cadastre a fatura do cartão para ela descontar do total.' },
];

export function AccountsPage() {
  const a = useAccounts();
  const [editing, setEditing] = useState<{ id?: number; form: AccountForm } | null>(null);
  const save = useAction(async () => {
    await a.save(editing!.form, editing!.id);
    setEditing(null);
  });

  async function remove(account: Account) {
    if (!(await confirmAction(`Excluir "${account.name}"? Se ela já aparece nos seus saldos, fica arquivada e o histórico é mantido.`))) return;
    setEditing(null);
    await a.remove(account);
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void save.run();
  };

  const form = editing?.form;
  const setForm = (changes: Partial<AccountForm>) => editing && setEditing({ ...editing, form: { ...editing.form, ...changes } });
  const open = (id: number | undefined, form: AccountForm) => (save.clearError(), setEditing({ id, form }));
  const accounts = a.data ?? [];
  const editingAccount = editing?.id ? accounts.find((x) => x.id === editing.id) : undefined;
  // fatura é guardada positiva; na tela ela aparece negativa, como desconta do total
  const shown = (account: Account, cents: number) => (account.kind === 'asset' ? cents : -cents);

  return (
    <>
      <PageHeader
        title="Contas"
        help="Contas e carteiras somam no seu total; cartões e dívidas subtraem. O saldo de cada uma é o da última vez que você atualizou os saldos, na tela inicial."
        action={<Button onClick={() => open(undefined, emptyAccountForm())}>+ Nova conta</Button>}
      />
      <NoticeBar notice={a.notice} onClose={a.clear} />
      <FormError error={a.error} />

      {a.loading && !a.data ? (
        <Card>
          <Loading />
        </Card>
      ) : (
        groups.map((g) => {
          const items = accounts.filter((x) => x.kind === g.kind);
          const total = items.reduce((sum, x) => sum + (a.balanceOf(x.id) ?? 0), 0);
          return (
            <Card
              key={g.kind}
              title={g.title}
              action={
                a.last &&
                items.length > 0 && <p className={cx('text-sm font-semibold', ui.amount(g.kind === 'asset' ? total : -total))}>{money(g.kind === 'asset' ? total : -total)}</p>
              }
            >
              {items.length ? (
                <div className="flex flex-col">
                  {items.map((account) => {
                    const balance = a.balanceOf(account.id);
                    return (
                      <ListButton key={account.id} onClick={() => open(account.id, accountToForm(account))}>
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <p className={cx(ui.strong, 'truncate')}>{account.name}</p>
                          {account.hasYield && <Badge tone="income">Rende</Badge>}
                        </div>
                        {balance === null ? (
                          <p className={ui.small}>sem saldo</p>
                        ) : (
                          <p className={cx('text-sm font-semibold whitespace-nowrap', ui.amount(shown(account, balance)))}>{money(shown(account, balance))}</p>
                        )}
                      </ListButton>
                    );
                  })}
                </div>
              ) : (
                <Empty>{g.empty}</Empty>
              )}
            </Card>
          );
        })
      )}
      {a.last && <p className={cx(ui.small, 'text-center')}>Saldos de {formatDateTime(a.last.createdAt)}</p>}

      <Modal open={!!form} title={editing?.id ? 'Editar conta' : 'Nova conta'} onClose={() => setEditing(null)}>
        {form && (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Nome" placeholder="Nubank, carteira, cartão…" value={form.name} onChange={(name) => setForm({ name })} autoFocus={!editing?.id} />
            <div className="flex flex-col gap-1.5">
              <Segmented label="Tipo" value={form.kind} options={kindOptions} onChange={(kind) => setForm({ kind })} />
              <p className={ui.small}>{form.kind === 'asset' ? 'Soma no seu total.' : 'Subtrai do seu total. Ao atualizar os saldos, informe o valor da fatura.'}</p>
            </div>
            {form.kind === 'asset' && <Checkbox checked={form.hasYield} onChange={(hasYield) => setForm({ hasYield })} label="Rende (conta remunerada)" />}
            <FormError error={save.error} />
            <Actions>
              {editingAccount && (
                <Button variant="ghostDanger" onClick={() => remove(editingAccount)}>
                  Excluir
                </Button>
              )}
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
