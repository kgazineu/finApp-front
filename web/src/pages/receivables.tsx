import {
  cx,
  digits,
  emptyReceivableForm,
  formatDate,
  maskDate,
  maskMoney,
  money,
  receivableKindLabel,
  ui,
  useAction,
  useReceivables,
  type Receivable,
  type ReceivableEditForm,
  type ReceivableForm,
  type ReceivableKind,
} from '@finapp/shared';
import { useState, type FormEvent } from 'react';
import { Badge, Button, Card, Checkbox, Empty, Field, FormError, Loading, Modal, NoticeBar, Row, Segmented, confirmAction } from '../components';
import { PageHeader } from '../layouts';

const kindOptions: { value: ReceivableKind; label: string }[] = [
  { value: 'loan', label: 'Empréstimo' },
  { value: 'split', label: 'Conta dividida' },
];

export function ReceivablesPage() {
  const r = useReceivables();
  const [creating, setCreating] = useState<ReceivableForm | null>(null);
  const [editing, setEditing] = useState<{ item: Receivable; form: ReceivableEditForm } | null>(null);
  const create = useAction(async () => {
    await r.create(creating!);
    setCreating(null);
  });
  const update = useAction(async () => {
    await r.update(editing!.item, editing!.form);
    setEditing(null);
  });

  async function remove(item: Receivable) {
    if (await confirmAction(`Remover "${item.description}" (${item.debtor})? Se já tiver parcela recebida, ele fica arquivado.`)) await r.remove(item);
  }

  const submit = (run: () => Promise<boolean>) => (e: FormEvent) => {
    e.preventDefault();
    void run();
  };

  return (
    <>
      <PageHeader
        title="A receber"
        description="Dinheiro que te devem: contas divididas e empréstimos, com as parcelas já calculadas."
        action={<Button onClick={() => (create.clearError(), setCreating(emptyReceivableForm()))}>+ Novo</Button>}
      />
      <NoticeBar notice={r.notice} onClose={r.clear} />

      <Card title="Cadastrados">
        {r.loading && !r.data ? (
          <Loading />
        ) : r.data?.length ? (
          r.data.map((item) => {
            const overdue = item.installments.some((i) => i.overdue);
            return (
              <Row key={item.id}>
                <div className="flex flex-col gap-1">
                  <p className={overdue ? ui.strongOverdue : ui.strong}>{item.description}</p>
                  <p className={ui.small}>{item.debtor}</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge>{receivableKindLabel[item.kind]}</Badge>
                    {item.interestRate > 0 && <Badge>{item.interestRate}% de juros</Badge>}
                    {overdue && <Badge tone="danger">Atrasado</Badge>}
                  </div>
                  <ul className="flex flex-col gap-1 pt-1">
                    {item.installments.map((i) => (
                      <li key={i.id}>
                        <Checkbox
                          checked={!!i.paidAt}
                          onChange={(paid) => r.setPaid(i.id, paid)}
                          label={
                            <span className={cx(i.overdue && ui.overdue)}>
                              {i.number}ª · {money(i.amount)} · vence {formatDate(i.dueDate)}
                            </span>
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className={cx('text-sm font-semibold', ui.amount(item.amount))}>{money(item.amount)}</p>
                  <div className="flex">
                    <Button variant="ghost" onClick={() => (update.clearError(), setEditing({ item, form: { debtor: item.debtor, description: item.description } }))}>
                      Editar
                    </Button>
                    <Button variant="ghostDanger" onClick={() => remove(item)}>
                      Remover
                    </Button>
                  </div>
                </div>
              </Row>
            );
          })
        ) : (
          <Empty>Ninguém te deve nada.</Empty>
        )}
        {r.error && <FormError error={r.error} />}
      </Card>

      <Modal open={!!creating} title="Novo valor a receber" onClose={() => setCreating(null)}>
        {creating && (
          <form onSubmit={submit(create.run)} className="flex flex-col gap-4">
            <Segmented label="Tipo" value={creating.kind} options={kindOptions} onChange={(kind) => setCreating({ ...creating, kind })} />
            <Field label="Quem deve" value={creating.debtor} onChange={(debtor) => setCreating({ ...creating, debtor })} autoFocus />
            <Field label="Descrição" placeholder="pizza, bicicleta..." value={creating.description} onChange={(description) => setCreating({ ...creating, description })} />
            <Field label="Valor (sem juros)" prefix="R$" inputMode="numeric" value={creating.amount} mask={maskMoney} onChange={(amount) => setCreating({ ...creating, amount })} />
            {creating.kind === 'loan' && (
              <div className="flex gap-3">
                <Field className="flex-1" label="Juros (%)" placeholder="0" inputMode="numeric" value={creating.interestRate} mask={(v) => digits(v).slice(0, 4)} onChange={(interestRate) => setCreating({ ...creating, interestRate })} />
                <Field className="flex-1" label="Parcelas" placeholder="1" inputMode="numeric" value={creating.installments} mask={(v) => digits(v).slice(0, 3)} onChange={(installments) => setCreating({ ...creating, installments })} />
              </div>
            )}
            <Field label="Primeiro vencimento" placeholder="DD/MM/AAAA" inputMode="numeric" value={creating.firstDueDate} mask={maskDate} onChange={(firstDueDate) => setCreating({ ...creating, firstDueDate })} />
            <p className={ui.small}>
              {creating.kind === 'split'
                ? 'Conta dividida: sem juros e em uma parcela.'
                : 'Juros simples sobre o total; as parcelas vencem mês a mês a partir do primeiro vencimento.'}
            </p>
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

      <Modal open={!!editing} title="Editar valor a receber" onClose={() => setEditing(null)}>
        {editing && (
          <form onSubmit={submit(update.run)} className="flex flex-col gap-4">
            <Field label="Quem deve" value={editing.form.debtor} onChange={(debtor) => setEditing({ ...editing, form: { ...editing.form, debtor } })} />
            <Field label="Descrição" value={editing.form.description} onChange={(description) => setEditing({ ...editing, form: { ...editing.form, description } })} />
            <p className={ui.small}>Valor, juros e parcelas não mudam: para isso, remova e cadastre de novo.</p>
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
