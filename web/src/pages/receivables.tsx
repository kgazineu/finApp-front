import {
  cx,
  digits,
  emptyReceivableForm,
  formatDate,
  installmentToEditForm,
  maskDate,
  maskMoney,
  money,
  receivableKindLabel,
  receivableSummary,
  receivableTotal,
  ui,
  useAction,
  useReceivables,
  type Installment,
  type InstallmentEditForm,
  type Receivable,
  type ReceivableAmountMode,
  type ReceivableEditForm,
  type ReceivableForm,
  type ReceivableKind,
} from '@finapp/shared';
import { useState, type FormEvent } from 'react';
import { Actions, Badge, Button, Card, Checkbox, Empty, Field, FormError, IconButton, ItemActions, Loading, Modal, NoticeBar, Segmented, confirmAction } from '../components';
import { PageHeader } from '../layouts';

const kindOptions: { value: ReceivableKind; label: string }[] = [
  { value: 'loan', label: 'Empréstimo' },
  { value: 'split', label: 'Conta dividida' },
];

const amountModeOptions: { value: ReceivableAmountMode; label: string }[] = [
  { value: 'total', label: 'Valor total' },
  { value: 'installment', label: 'Valor por parcela' },
];

export function ReceivablesPage() {
  const r = useReceivables();
  const [creating, setCreating] = useState<ReceivableForm | null>(null);
  const [editing, setEditing] = useState<{ item: Receivable; form: ReceivableEditForm } | null>(null);
  const [editingInstallment, setEditingInstallment] = useState<{ item: Receivable; installment: Installment; form: InstallmentEditForm } | null>(null);
  const create = useAction(async () => {
    await r.create(creating!);
    setCreating(null);
  });
  const update = useAction(async () => {
    await r.update(editing!.item, editing!.form);
    setEditing(null);
  });
  const updateInstallment = useAction(async () => {
    await r.updateInstallment(editingInstallment!.installment, editingInstallment!.form);
    setEditingInstallment(null);
  });

  async function remove(item: Receivable) {
    if (await confirmAction(`Remover "${item.description}" (${item.debtor})? Se já tiver parcela recebida, ele fica arquivado.`)) await r.remove(item);
  }

  const submit = (run: () => Promise<boolean>) => (e: FormEvent) => {
    e.preventDefault();
    void run();
  };

  const perInstallment = creating?.kind === 'loan' && creating.amountMode === 'installment';
  const setInstallmentForm = (changes: Partial<InstallmentEditForm>) =>
    editingInstallment && setEditingInstallment({ ...editingInstallment, form: { ...editingInstallment.form, ...changes } });
  const followingOpen = editingInstallment
    ? editingInstallment.item.installments.filter((i) => i.number > editingInstallment.installment.number && !i.paidAt).length
    : 0;

  return (
    <>
      <PageHeader
        title="A receber"
        description="Dinheiro que te devem: contas divididas, empréstimos e valores fixos por mês, com as parcelas já calculadas."
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
              <div key={item.id} className={cx('flex flex-col gap-2 py-3 last:border-b-0', ui.divider)}>
                <div className="flex items-start gap-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className={overdue ? ui.strongOverdue : ui.strong}>{item.description}</p>
                    <p className={ui.small}>
                      {item.debtor} · {receivableSummary(item)}
                    </p>
                  </div>
                  <p className={cx('pt-0.5 text-sm font-semibold whitespace-nowrap', ui.amount(receivableTotal(item)))}>{money(receivableTotal(item))}</p>
                  <ItemActions
                    name={item.description}
                    onEdit={() => (update.clearError(), setEditing({ item, form: { debtor: item.debtor, description: item.description } }))}
                    onRemove={() => remove(item)}
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge>{receivableKindLabel[item.kind]}</Badge>
                  {item.amountMode === 'installment' && <Badge>Valor fixo por parcela</Badge>}
                  {overdue && <Badge tone="danger">Atrasado</Badge>}
                </div>
                {/* parcelas em largura total: no celular a lista não fica espremida ao lado do valor */}
                <ul className="flex flex-col rounded-xl bg-slate-50 px-3 py-1">
                  {item.installments.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-2 py-1">
                      <Checkbox
                        checked={!!i.paidAt}
                        onChange={(paid) => r.setPaid(i.id, paid)}
                        ariaLabel={`Parcela ${i.number} de ${item.description} recebida`}
                        label={
                          <span className="flex flex-col">
                            <span className={cx('font-medium', i.overdue && ui.overdue)}>
                              {i.number}ª · {money(i.amount)}
                            </span>
                            <span className={i.overdue ? ui.smallOverdue : ui.small}>vence {formatDate(i.dueDate)}</span>
                          </span>
                        }
                      />
                      <IconButton
                        icon="pencil"
                        label={`Editar ${i.number}ª parcela de ${item.description}`}
                        className="-mr-2"
                        onClick={() => (updateInstallment.clearError(), setEditingInstallment({ item, installment: i, form: installmentToEditForm(i) }))}
                      />
                    </li>
                  ))}
                </ul>
              </div>
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
            <Field label="Descrição" placeholder="pizza, bicicleta, assinatura..." value={creating.description} onChange={(description) => setCreating({ ...creating, description })} />
            {creating.kind === 'loan' && (
              <Segmented label="O valor informado é" value={creating.amountMode} options={amountModeOptions} onChange={(amountMode) => setCreating({ ...creating, amountMode })} />
            )}
            <Field
              label={perInstallment ? 'Valor de cada parcela' : creating.kind === 'loan' ? 'Valor total (sem juros)' : 'Valor'}
              prefix="R$"
              inputMode="numeric"
              value={creating.amount}
              mask={maskMoney}
              onChange={(amount) => setCreating({ ...creating, amount })}
              hint={perInstallment ? 'Cada parcela vale exatamente isso (ex.: assinatura mensal).' : creating.kind === 'loan' ? 'Será dividido entre as parcelas.' : undefined}
            />
            {creating.kind === 'loan' && (
              <div className="flex items-end gap-3">
                {!perInstallment && (
                  <Field className="flex-1" label="Juros (%)" placeholder="0" inputMode="numeric" value={creating.interestRate} mask={(v) => digits(v).slice(0, 4)} onChange={(interestRate) => setCreating({ ...creating, interestRate })} />
                )}
                <Field className="flex-1" label="Parcelas" placeholder="1" inputMode="numeric" value={creating.installments} mask={(v) => digits(v).slice(0, 3)} onChange={(installments) => setCreating({ ...creating, installments })} />
              </div>
            )}
            <Field
              label="Data de início (1º vencimento)"
              placeholder="DD/MM/AAAA"
              inputMode="numeric"
              value={creating.firstDueDate}
              mask={maskDate}
              onChange={(firstDueDate) => setCreating({ ...creating, firstDueDate })}
              hint="Pode ser no passado: as parcelas já vencidas aparecem como atrasadas e você marca as que já recebeu."
            />
            <p className={ui.small}>
              {creating.kind === 'split'
                ? 'Conta dividida: sem juros e em uma parcela.'
                : perInstallment
                  ? 'As parcelas vencem mês a mês a partir da data de início. Para juros, informe a parcela já com eles.'
                  : 'Juros simples sobre o total; as parcelas vencem mês a mês a partir da data de início.'}
            </p>
            <FormError error={create.error} />
            <Actions>
              <Button variant="secondary" onClick={() => setCreating(null)}>
                Cancelar
              </Button>
              <Button type="submit" busy={create.busy}>
                Cadastrar
              </Button>
            </Actions>
          </form>
        )}
      </Modal>

      <Modal open={!!editing} title="Editar valor a receber" onClose={() => setEditing(null)}>
        {editing && (
          <form onSubmit={submit(update.run)} className="flex flex-col gap-4">
            <Field label="Quem deve" value={editing.form.debtor} onChange={(debtor) => setEditing({ ...editing, form: { ...editing.form, debtor } })} />
            <Field label="Descrição" value={editing.form.description} onChange={(description) => setEditing({ ...editing, form: { ...editing.form, description } })} />
            <p className={ui.small}>Para mudar valor ou vencimento, use o lápis da parcela: dá para aplicar às próximas em aberto.</p>
            <FormError error={update.error} />
            <Actions>
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button type="submit" busy={update.busy}>
                Salvar
              </Button>
            </Actions>
          </form>
        )}
      </Modal>

      <Modal
        open={!!editingInstallment}
        title={editingInstallment ? `Editar ${editingInstallment.installment.number}ª parcela` : ''}
        onClose={() => setEditingInstallment(null)}
      >
        {editingInstallment && (
          <form onSubmit={submit(updateInstallment.run)} className="flex flex-col gap-4">
            <p className={ui.muted}>
              {editingInstallment.item.description} · {editingInstallment.item.debtor}
            </p>
            <Field label="Valor" prefix="R$" inputMode="numeric" value={editingInstallment.form.amount} mask={maskMoney} onChange={(amount) => setInstallmentForm({ amount })} />
            <Field label="Vencimento" placeholder="DD/MM/AAAA" inputMode="numeric" value={editingInstallment.form.dueDate} mask={maskDate} onChange={(dueDate) => setInstallmentForm({ dueDate })} />
            {followingOpen > 0 && (
              <Checkbox
                checked={editingInstallment.form.applyToFollowing}
                onChange={(applyToFollowing) => setInstallmentForm({ applyToFollowing })}
                label={`Aplicar também às próximas ${followingOpen} parcela(s) em aberto (mesmo valor, vencimentos mês a mês a partir desta data)`}
              />
            )}
            <p className={ui.small}>Parcelas já recebidas não mudam. Use isso, por exemplo, quando o valor de uma assinatura aumentar.</p>
            <FormError error={updateInstallment.error} />
            <Actions>
              <Button variant="secondary" onClick={() => setEditingInstallment(null)}>
                Cancelar
              </Button>
              <Button type="submit" busy={updateInstallment.busy}>
                Salvar
              </Button>
            </Actions>
          </form>
        )}
      </Modal>
    </>
  );
}
