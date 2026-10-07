import {
  cx,
  digits,
  emptyReceivableForm,
  formatDate,
  installmentToEditForm,
  maskMoney,
  money,
  parseDate,
  parseMoney,
  receivableSummary,
  receivableTotal,
  today,
  ui,
  useAction,
  useReceivables,
  type Installment,
  type InstallmentEditForm,
  type Receivable,
  type ReceivableEditForm,
  type ReceivableForm,
} from '@finapp/shared';
import { useState, type FormEvent } from 'react';
import {
  Actions,
  Badge,
  Button,
  Card,
  Checkbox,
  DateField,
  Disclosure,
  Empty,
  Field,
  FormError,
  IconButton,
  ListButton,
  Loading,
  Modal,
  MoreOptions,
  NoticeBar,
  confirmAction,
} from '../components';
import { PageHeader } from '../layouts';

type EditingInstallment = { item: Receivable; installment: Installment; form: InstallmentEditForm };

export function ReceivablesPage() {
  const r = useReceivables();
  const [creating, setCreating] = useState<ReceivableForm | null>(null);
  const [editing, setEditing] = useState<{ item: Receivable; form: ReceivableEditForm } | null>(null);
  const [editingInstallment, setEditingInstallment] = useState<EditingInstallment | null>(null);
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
    if (!(await confirmAction(`Excluir "${item.description}" (${item.debtor})? As parcelas já recebidas ficam guardadas no histórico.`))) return;
    setEditing(null);
    await r.remove(item);
  }

  const submit = (run: () => Promise<boolean>) => (e: FormEvent) => {
    e.preventDefault();
    void run();
  };

  const set = (changes: Partial<ReceivableForm>) => creating && setCreating({ ...creating, ...changes });
  const setInstallmentForm = (changes: Partial<InstallmentEditForm>) =>
    editingInstallment && setEditingInstallment({ ...editingInstallment, form: { ...editingInstallment.form, ...changes } });
  const followingOpen = editingInstallment
    ? editingInstallment.item.installments.filter((i) => i.number > editingInstallment.installment.number && !i.paidAt).length
    : 0;

  const items = r.data ?? [];
  const open = items.filter((i) => i.installments.some((x) => !x.paidAt));
  const settled = items.filter((i) => i.installments.every((x) => x.paidAt));
  const itemProps = {
    onEdit: (item: Receivable) => (update.clearError(), setEditing({ item, form: { debtor: item.debtor, description: item.description } })),
    onPaid: (installment: Installment, paid: boolean) => r.setPaid(installment.id, paid),
    onEditInstallment: (item: Receivable, installment: Installment) => (
      updateInstallment.clearError(), setEditingInstallment({ item, installment, form: installmentToEditForm(installment) })
    ),
  };

  // prévia das parcelas enquanto preenche: "3x de R$ 300,00"
  const count = Number(digits(creating?.installments ?? '')) || 1;
  const cents = parseMoney(creating?.amount ?? '') ?? 0;
  const perInstallment = !!creating?.perInstallment && count > 1;
  const rate = perInstallment ? 0 : Number(digits(creating?.interestRate ?? '')) || 0;
  const each = perInstallment ? cents : (cents * (1 + rate / 100)) / count;
  const preview = count > 1 && cents > 0 ? `${count}x de ${Number.isInteger(each) ? '' : '~'}${money(Math.round(each))}` : null;
  const firstDue = creating ? parseDate(creating.firstDueDate) : null;
  const past = !!firstDue && firstDue < (parseDate(today()) ?? '');

  return (
    <>
      <PageHeader
        title="A receber"
        help="Dinheiro que te devem: uma conta dividida, um empréstimo ou um valor por mês. As parcelas entram na projeção da tela inicial e você marca quando receber."
        action={<Button onClick={() => (create.clearError(), setCreating(emptyReceivableForm()))}>+ Novo</Button>}
      />
      <NoticeBar notice={r.notice} onClose={r.clear} />
      <FormError error={r.error} />

      <Card title="Em aberto">
        {r.loading && !r.data ? (
          <Loading />
        ) : open.length ? (
          open.map((item) => <ReceivableItem key={item.id} item={item} {...itemProps} />)
        ) : (
          <Empty>Ninguém te deve nada.</Empty>
        )}
      </Card>

      {settled.length > 0 && (
        <Disclosure title="Quitados" summary={<span className={ui.small}>{settled.length}</span>}>
          {settled.map((item) => (
            <ReceivableItem key={item.id} item={item} {...itemProps} />
          ))}
        </Disclosure>
      )}

      <Modal open={!!creating} title="Novo valor a receber" onClose={() => setCreating(null)}>
        {creating && (
          <form onSubmit={submit(create.run)} className="flex flex-col gap-4">
            <Field label="Quem deve" value={creating.debtor} onChange={(debtor) => set({ debtor })} autoFocus />
            <Field label="O que foi" placeholder="Pizza, empréstimo, assinatura…" value={creating.description} onChange={(description) => set({ description })} />
            <div className="grid grid-cols-[1fr_6rem] items-end gap-3">
              <Field
                label={perInstallment ? 'Valor de cada parcela' : 'Valor'}
                prefix="R$"
                inputMode="numeric"
                value={creating.amount}
                mask={maskMoney}
                onChange={(amount) => set({ amount })}
              />
              <Field label="Parcelas" placeholder="1" inputMode="numeric" value={creating.installments} mask={(v) => digits(v).slice(0, 3)} onChange={(installments) => set({ installments })} />
            </div>
            {preview && <p className={cx(ui.small, '-mt-2')}>{preview}, mês a mês</p>}
            <DateField
              label={count > 1 ? 'Vencimento da 1ª parcela' : 'Vencimento'}
              value={creating.firstDueDate}
              onChange={(firstDueDate) => set({ firstDueDate })}
              hint={past ? 'No passado: o que já venceu aparece como atrasado, e você marca o que já recebeu.' : undefined}
            />
            <MoreOptions>
              {!perInstallment && (
                <Field
                  label="Juros (%)"
                  placeholder="0"
                  inputMode="numeric"
                  value={creating.interestRate}
                  mask={(v) => digits(v).slice(0, 4)}
                  onChange={(interestRate) => set({ interestRate })}
                  hint="Juros simples sobre o total."
                />
              )}
              <Checkbox
                checked={creating.perInstallment}
                onChange={(perInstallment) => set({ perInstallment })}
                disabled={count < 2}
                label="O valor é de cada parcela, não do total (ex.: assinatura dividida)"
              />
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

      <Modal open={!!editing} title="Editar valor a receber" onClose={() => setEditing(null)}>
        {editing && (
          <form onSubmit={submit(update.run)} className="flex flex-col gap-4">
            <Field label="Quem deve" value={editing.form.debtor} onChange={(debtor) => setEditing({ ...editing, form: { ...editing.form, debtor } })} />
            <Field label="O que foi" value={editing.form.description} onChange={(description) => setEditing({ ...editing, form: { ...editing.form, description } })} />
            <p className={ui.small}>Para mudar valor ou vencimento, toque no lápis da parcela.</p>
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

      <Modal
        open={!!editingInstallment}
        title={editingInstallment ? `${editingInstallment.installment.number}ª parcela · ${editingInstallment.item.description}` : ''}
        onClose={() => setEditingInstallment(null)}
      >
        {editingInstallment && (
          <form onSubmit={submit(updateInstallment.run)} className="flex flex-col gap-4">
            <Field label="Valor" prefix="R$" inputMode="numeric" value={editingInstallment.form.amount} mask={maskMoney} onChange={(amount) => setInstallmentForm({ amount })} />
            <DateField label="Vencimento" value={editingInstallment.form.dueDate} onChange={(dueDate) => setInstallmentForm({ dueDate })} />
            {followingOpen > 0 && (
              <Checkbox
                checked={editingInstallment.form.applyToFollowing}
                onChange={(applyToFollowing) => setInstallmentForm({ applyToFollowing })}
                label={`Aplicar também às próximas ${followingOpen} em aberto (mesmo valor, mês a mês)`}
              />
            )}
            <FormError error={updateInstallment.error} />
            <Actions>
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

/** um valor a receber: o topo abre a edição; as parcelas em aberto ficam à mostra e as recebidas, recolhidas */
function ReceivableItem({
  item,
  onEdit,
  onPaid,
  onEditInstallment,
}: {
  item: Receivable;
  onEdit(item: Receivable): void;
  onPaid(installment: Installment, paid: boolean): void;
  onEditInstallment(item: Receivable, installment: Installment): void;
}) {
  const [showPaid, setShowPaid] = useState(false);
  const overdue = item.installments.some((i) => i.overdue);
  const pending = item.installments.filter((i) => !i.paidAt);
  const paid = item.installments.filter((i) => i.paidAt);
  const remaining = pending.reduce((total, i) => total + i.amount, 0);
  const shown = showPaid || !pending.length ? item.installments : pending;

  return (
    <div className={cx('flex flex-col gap-1 py-2 last:border-b-0', ui.divider)}>
      <ListButton onClick={() => onEdit(item)}>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className={cx(overdue ? ui.strongOverdue : ui.strong, 'truncate')}>{item.description}</p>
            {overdue && <Badge tone="danger">Atrasado</Badge>}
          </div>
          <p className={ui.small}>{[item.debtor, receivableSummary(item)].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="flex flex-col items-end">
          <p className={cx('text-sm font-semibold whitespace-nowrap', ui.amount(remaining || receivableTotal(item)))}>{money(remaining || receivableTotal(item))}</p>
          {remaining > 0 && remaining !== receivableTotal(item) && <p className={ui.small}>falta</p>}
        </div>
      </ListButton>
      <ul className="flex flex-col rounded-xl bg-slate-50 px-3 py-1">
        {shown.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-2 py-1">
            <Checkbox
              checked={!!i.paidAt}
              onChange={(value) => onPaid(i, value)}
              ariaLabel={`${i.number}ª parcela de ${item.description} recebida`}
              label={
                <span className="flex flex-col">
                  <span className={cx('font-medium', i.overdue && ui.overdue, i.paidAt && 'text-slate-400 line-through')}>
                    {item.installments.length > 1 && `${i.number}ª · `}
                    {money(i.amount)}
                  </span>
                  <span className={i.overdue ? ui.smallOverdue : ui.small}>
                    {i.paidAt ? 'recebida' : `vence ${formatDate(i.dueDate)}`}
                  </span>
                </span>
              }
            />
            {!i.paidAt && <IconButton icon="pencil" label={`Editar ${i.number}ª parcela de ${item.description}`} className="-mr-2" onClick={() => onEditInstallment(item, i)} />}
          </li>
        ))}
        {paid.length > 0 && pending.length > 0 && (
          <li>
            <button type="button" onClick={() => setShowPaid(!showPaid)} className={cx(ui.link, 'cursor-pointer py-2 text-xs')}>
              {showPaid ? 'Esconder recebidas' : `Mostrar ${paid.length} recebida${paid.length > 1 ? 's' : ''}`}
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
