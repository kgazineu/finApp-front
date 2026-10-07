import {
  cx,
  digits,
  emptyRecurringForm,
  frequencyOf,
  maskMoney,
  money,
  parseDate,
  recurringEnded,
  recurringToEditForm,
  scheduleText,
  signedAmount,
  signedMoney,
  today,
  ui,
  useAction,
  useRecurring,
  type RecurringEditForm,
  type RecurringForm,
  type RecurringFrequency,
  type RecurringTransaction,
  type TransactionKind,
} from '@finapp/shared';
import { useState, type FormEvent } from 'react';
import {
  Actions,
  Button,
  Card,
  Checkbox,
  DateField,
  Disclosure,
  Empty,
  Field,
  FormError,
  ListButton,
  Loading,
  Modal,
  MonthField,
  MoreOptions,
  NoticeBar,
  Segmented,
  confirmAction,
} from '../components';
import { PageHeader } from '../layouts';

const kindOptions: { value: TransactionKind; label: string }[] = [
  { value: 'expense', label: 'Despesa' },
  { value: 'income', label: 'Entrada' },
];

const frequencyOptions: { value: RecurringFrequency; label: string }[] = [
  { value: 'once', label: 'Uma vez' },
  { value: 'monthly', label: 'Todo mês' },
  { value: 'installments', label: 'Parcelado' },
];

const dateLabel: Record<RecurringFrequency, string> = { once: 'Data', monthly: 'Primeiro vencimento', installments: 'Vencimento da 1ª parcela' };

export function TransactionsPage() {
  const t = useRecurring();
  const [creating, setCreating] = useState<RecurringForm | null>(null);
  const [editing, setEditing] = useState<{ item: RecurringTransaction; form: RecurringEditForm } | null>(null);
  const create = useAction(async () => {
    await t.create(creating!);
    setCreating(null);
  });
  const update = useAction(async () => {
    await t.update(editing!.item, editing!.form);
    setEditing(null);
  });

  async function remove(item: RecurringTransaction) {
    if (!(await confirmAction(`Excluir "${item.description}"? As parcelas já pagas ficam guardadas no histórico.`))) return;
    setEditing(null);
    await t.remove(item);
  }

  const submit = (run: () => Promise<boolean>) => (e: FormEvent) => {
    e.preventDefault();
    void run();
  };
  const set = (changes: Partial<RecurringForm>) => creating && setCreating({ ...creating, ...changes });
  const setEdit = (changes: Partial<RecurringEditForm>) => editing && setEditing({ ...editing, form: { ...editing.form, ...changes } });
  const open = (item: RecurringTransaction) => (update.clearError(), setEditing({ item, form: recurringToEditForm(item) }));

  const items = t.data ?? [];
  const active = items.filter((i) => !recurringEnded(i));
  const monthly = active.filter((i) => i.isFixed);
  const others = active.filter((i) => !i.isFixed);
  const ended = items.filter((i) => recurringEnded(i));
  // o que entra e sai todo mês (só as mensais; "a cada N meses" fica fora do resumo)
  const perMonth = (kind: TransactionKind) => monthly.filter((i) => i.kind === kind && i.intervalMonths === 1).reduce((total, i) => total + i.amount, 0);
  const firstDue = creating ? parseDate(creating.firstDueDate) : null;
  const past = !!firstDue && firstDue < (parseDate(today()) ?? '');

  return (
    <>
      <PageHeader
        title="Transações"
        help="Tudo que você já sabe que vai entrar ou sair: salário, aluguel, assinaturas, compras parceladas. Elas entram na projeção da tela inicial, onde você marca o que já pagou ou recebeu."
        action={<Button onClick={() => (create.clearError(), setCreating(emptyRecurringForm()))}>+ Nova transação</Button>}
      />
      <NoticeBar notice={t.notice} onClose={t.clear} />
      <FormError error={t.error} />

      {t.loading && !t.data ? (
        <Card>
          <Loading />
        </Card>
      ) : !items.length ? (
        <Card>
          <Empty>Nenhuma transação ainda. Comece pelo salário e pelas contas fixas, como o aluguel.</Empty>
        </Card>
      ) : (
        <>
          <Card
            title="Todo mês"
            action={
              monthly.length > 0 && (
                <p className="text-right text-xs leading-tight font-semibold whitespace-nowrap">
                  <span className="text-emerald-700">{signedMoney(perMonth('income'))}</span>
                  <br />
                  <span className="text-rose-700">{signedMoney(-perMonth('expense'))}</span>
                </p>
              )
            }
          >
            {monthly.length ? <List items={monthly} onOpen={open} /> : <Empty>Nada que se repete todo mês.</Empty>}
          </Card>
          <Card title="Parceladas e avulsas">
            {others.length ? <List items={others} onOpen={open} /> : <Empty>Nenhuma compra parcelada ou avulsa.</Empty>}
          </Card>
          {ended.length > 0 && (
            <Disclosure title="Encerradas" summary={<span className={ui.small}>{ended.length}</span>}>
              <List items={ended} onOpen={open} />
            </Disclosure>
          )}
        </>
      )}

      <Modal open={!!creating} title="Nova transação" onClose={() => setCreating(null)}>
        {creating && (
          <form onSubmit={submit(create.run)} className="flex flex-col gap-4">
            <Segmented value={creating.kind} options={kindOptions} onChange={(kind) => set({ kind })} />
            <Field label="Descrição" placeholder="Aluguel, salário, celular…" value={creating.description} onChange={(description) => set({ description })} autoFocus />
            <Segmented label="Repete?" value={creating.frequency} options={frequencyOptions} onChange={(frequency) => set({ frequency })} />
            <div className={cx('grid items-end gap-3', creating.frequency === 'installments' && 'grid-cols-2')}>
              <Field
                label={creating.frequency === 'installments' ? 'Valor da parcela' : 'Valor'}
                prefix="R$"
                inputMode="numeric"
                value={creating.amount}
                mask={maskMoney}
                onChange={(amount) => set({ amount })}
              />
              {creating.frequency === 'installments' && (
                <Field label="Parcelas" placeholder="10" inputMode="numeric" value={creating.installments} mask={(v) => digits(v).slice(0, 3)} onChange={(installments) => set({ installments })} />
              )}
            </div>
            <DateField
              label={dateLabel[creating.frequency]}
              value={creating.firstDueDate}
              onChange={(firstDueDate) => set({ firstDueDate })}
              hint={past ? 'No passado: o que já venceu aparece como atrasado, e você marca o que já pagou.' : undefined}
            />
            <MoreOptions>
              <Checkbox checked={creating.noDay} onChange={(noDay) => set({ noDay })} label="Sem dia certo (vence no fim do mês)" />
              {creating.frequency !== 'once' && (
                <Field
                  label="Repetir a cada quantos meses"
                  placeholder="1"
                  inputMode="numeric"
                  value={creating.intervalMonths}
                  mask={(v) => digits(v).slice(0, 3)}
                  onChange={(intervalMonths) => set({ intervalMonths })}
                  hint="Ex.: 12 para algo anual, como o IPVA."
                />
              )}
            </MoreOptions>
            <FormError error={create.error} />
            <Actions>
              <Button type="submit" busy={create.busy}>
                Salvar
              </Button>
            </Actions>
          </form>
        )}
      </Modal>

      <Modal open={!!editing} title="Editar transação" onClose={() => setEditing(null)}>
        {editing && (
          <form onSubmit={submit(update.run)} className="flex flex-col gap-4">
            <p className={ui.small}>{scheduleText(editing.item)}</p>
            <Field label="Descrição" value={editing.form.description} onChange={(description) => setEdit({ description })} />
            <Field label="Valor" prefix="R$" inputMode="numeric" value={editing.form.amount} mask={maskMoney} onChange={(amount) => setEdit({ amount })} />
            <div className="grid grid-cols-2 items-end gap-3">
              <Field
                label="Dia do vencimento"
                placeholder="fim do mês"
                inputMode="numeric"
                value={editing.form.dayOfMonth}
                mask={(v) => digits(v).slice(0, 2)}
                onChange={(dayOfMonth) => setEdit({ dayOfMonth })}
              />
              {frequencyOf(editing.item) !== 'once' && (
                <MonthField label="Termina em" placeholder="Sem fim" value={editing.form.endMonth} onChange={(endMonth) => setEdit({ endMonth })} />
              )}
            </div>
            <p className={ui.small}>Parcelas já pagas não mudam. Para trocar o tipo ou a repetição, exclua e cadastre de novo.</p>
            <FormError error={update.error} />
            <Actions>
              <Button variant="ghostDanger" onClick={() => remove(editing.item)}>
                Excluir
              </Button>
              <Button type="submit" busy={update.busy}>
                Salvar
              </Button>
            </Actions>
          </form>
        )}
      </Modal>
    </>
  );
}

function List({ items, onOpen }: { items: RecurringTransaction[]; onOpen(item: RecurringTransaction): void }) {
  return (
    <div className="flex flex-col">
      {items.map((item) => (
        <ListButton key={item.id} onClick={() => onOpen(item)}>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className={cx(ui.strong, 'truncate')}>{item.description}</p>
            <p className={ui.small}>{scheduleText(item)}</p>
          </div>
          <p className={cx('text-sm font-semibold whitespace-nowrap', ui.amount(signedAmount(item)))}>{money(signedAmount(item))}</p>
        </ListButton>
      ))}
    </div>
  );
}
