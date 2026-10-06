import {
  cx,
  digits,
  emptyRecurringForm,
  maskMoney,
  maskMonth,
  money,
  recurringToEditForm,
  scheduleText,
  signedAmount,
  transactionKindLabel,
  ui,
  useAction,
  useRecurring,
  type RecurringEditForm,
  type RecurringForm,
  type RecurringTransaction,
  type TransactionKind,
} from '@finapp/shared';
import { useState, type FormEvent } from 'react';
import { Badge, Button, Card, Checkbox, Empty, Field, FormError, Loading, Modal, NoticeBar, Row, Segmented, confirmAction } from '../components';
import { PageHeader } from '../layouts';

const kindOptions: { value: TransactionKind; label: string }[] = [
  { value: 'expense', label: 'Despesa' },
  { value: 'income', label: 'Entrada' },
];

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
    if (await confirmAction(`Remover "${item.description}"? Se já tiver parcela paga, ela fica arquivada.`)) await t.remove(item);
  }

  const submit = (run: () => Promise<boolean>) => (e: FormEvent) => {
    e.preventDefault();
    void run();
  };

  return (
    <>
      <PageHeader
        title="Transações"
        description="Entradas e despesas planejadas: salário, aluguel, assinaturas, compras parceladas."
        action={<Button onClick={() => (create.clearError(), setCreating(emptyRecurringForm()))}>+ Nova transação</Button>}
      />
      <NoticeBar notice={t.notice} onClose={t.clear} />

      <Card title="Cadastradas">
        {t.loading && !t.data ? (
          <Loading />
        ) : t.data?.length ? (
          t.data.map((item) => (
            <Row key={item.id}>
              <div className="flex flex-col gap-1">
                <p className={ui.strong}>{item.description}</p>
                <div className="flex flex-wrap gap-1">
                  <Badge tone={item.kind}>{transactionKindLabel[item.kind]}</Badge>
                  <Badge>{item.isFixed ? 'Fixa' : 'Variável'}</Badge>
                </div>
                <p className={ui.small}>{scheduleText(item)}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <p className={cx('text-sm font-semibold', ui.amount(signedAmount(item)))}>{money(signedAmount(item))}</p>
                <div className="flex">
                  <Button variant="ghost" onClick={() => (update.clearError(), setEditing({ item, form: recurringToEditForm(item) }))}>
                    Editar
                  </Button>
                  <Button variant="ghostDanger" onClick={() => remove(item)}>
                    Remover
                  </Button>
                </div>
              </div>
            </Row>
          ))
        ) : (
          <Empty>Nenhuma transação cadastrada.</Empty>
        )}
        {t.error && <FormError error={t.error} />}
      </Card>

      <Modal open={!!creating} title="Nova transação" onClose={() => setCreating(null)}>
        {creating && (
          <form onSubmit={submit(create.run)} className="flex flex-col gap-4">
            <Field label="Descrição" value={creating.description} onChange={(description) => setCreating({ ...creating, description })} autoFocus />
            <Segmented label="Tipo" value={creating.kind} options={kindOptions} onChange={(kind) => setCreating({ ...creating, kind })} />
            <Checkbox
              checked={creating.isFixed}
              onChange={(isFixed) => setCreating({ ...creating, isFixed })}
              label="Fixa (repete sem data para acabar, como salário e aluguel)"
            />
            <Field label="Valor" prefix="R$" inputMode="numeric" value={creating.amount} mask={maskMoney} onChange={(amount) => setCreating({ ...creating, amount })} />
            <div className="flex gap-3">
              <Field className="flex-1" label="Começa em" placeholder="MM/AAAA" inputMode="numeric" value={creating.startMonth} mask={maskMonth} onChange={(startMonth) => setCreating({ ...creating, startMonth })} />
              <Field className="flex-1" label="Dia do mês" placeholder="sem dia certo" inputMode="numeric" value={creating.dayOfMonth} mask={(v) => digits(v).slice(0, 2)} onChange={(dayOfMonth) => setCreating({ ...creating, dayOfMonth })} />
            </div>
            <div className="flex gap-3">
              <Field className="flex-1" label="A cada quantos meses" placeholder="1" inputMode="numeric" value={creating.intervalMonths} mask={(v) => digits(v).slice(0, 3)} onChange={(intervalMonths) => setCreating({ ...creating, intervalMonths })} />
              <Field className="flex-1" label="Quantas vezes" inputMode="numeric" value={creating.installments} mask={(v) => digits(v).slice(0, 3)} onChange={(installments) => setCreating({ ...creating, installments })} />
            </div>
            <p className={ui.small}>"Quantas vezes" vazio: fixa repete sem fim, variável acontece uma vez só.</p>
            <FormError error={create.error} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCreating(null)}>
                Cancelar
              </Button>
              <Button type="submit" busy={create.busy}>
                Cadastrar
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!editing} title="Editar transação" onClose={() => setEditing(null)}>
        {editing && (
          <form onSubmit={submit(update.run)} className="flex flex-col gap-4">
            <Field label="Descrição" value={editing.form.description} onChange={(description) => setEditing({ ...editing, form: { ...editing.form, description } })} />
            <Field label="Valor" prefix="R$" inputMode="numeric" value={editing.form.amount} mask={maskMoney} onChange={(amount) => setEditing({ ...editing, form: { ...editing.form, amount } })} />
            <div className="flex gap-3">
              <Field className="flex-1" label="Dia do mês" placeholder="sem dia certo" inputMode="numeric" value={editing.form.dayOfMonth} mask={(v) => digits(v).slice(0, 2)} onChange={(dayOfMonth) => setEditing({ ...editing, form: { ...editing.form, dayOfMonth } })} />
              <Field className="flex-1" label="Termina em" placeholder="sem fim" inputMode="numeric" value={editing.form.endMonth} mask={maskMonth} onChange={(endMonth) => setEditing({ ...editing, form: { ...editing.form, endMonth } })} />
            </div>
            <p className={ui.small}>
              Vazio = sem dia certo / sem fim. Parcelas já pagas não mudam. Tipo, fixa, início e intervalo não podem ser editados: para isso, remova e cadastre de novo.
            </p>
            <FormError error={update.error} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button type="submit" busy={update.busy}>
                Salvar
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
