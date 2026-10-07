import {
  cx,
  emptyTargetForm,
  formatDate,
  maskMoney,
  money,
  signedMoney,
  targetToForm,
  ui,
  useAction,
  useTargets,
  type TargetForm,
} from '@finapp/shared';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Actions, Button, Card, DateField, Empty, Field, FormError, ListButton, Loading, Modal, NoticeBar, Segmented, confirmAction } from '../components';
import { PageHeader } from '../layouts';

type Item = ReturnType<typeof useTargets>['items'][number];

export function TargetsPage() {
  const t = useTargets();
  const [editing, setEditing] = useState<{ id?: number; form: TargetForm } | null>(null);
  const save = useAction(async () => {
    await t.save(editing!.form, editing!.id);
    setEditing(null);
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void save.run();
  };
  const open = (id: number | undefined, form: TargetForm) => (save.clearError(), setEditing({ id, form }));
  const editingItem = editing?.id ? t.items.find((i) => i.target.id === editing.id) : undefined;
  const remove = async (item: Item) => {
    if (!(await confirmAction(`Excluir a meta "${item.target.name}"?`))) return;
    setEditing(null);
    await t.remove(item.target);
  };
  const setForm = (changes: Partial<TargetForm>) => editing && setEditing({ ...editing, form: { ...editing.form, ...changes } });

  return (
    <>
      <PageHeader
        title="Metas"
        help={
          <>
            Quanto você quer ter até uma data. O progresso vem do seu último saldo (o total ou o de uma conta), e a previsão usa a sua sobra por mês
            {t.hasBalance && <> ({signedMoney(t.growth)})</>}, como se toda ela fosse para a meta.
          </>
        }
        action={<Button onClick={() => open(undefined, emptyTargetForm())}>+ Nova meta</Button>}
      />
      <NoticeBar notice={t.notice} onClose={t.clear} />
      {t.error && <NoticeBar notice={{ text: t.error, error: true }} onClose={() => t.reload()} />}

      {t.data && !t.hasBalance && (
        <p className={cx(ui.notice.ok, ui.noticeText.ok)}>
          O progresso aparece depois que você{' '}
          <Link to="/" className={ui.link}>
            atualizar os saldos
          </Link>{' '}
          pela primeira vez.
        </p>
      )}

      <Card>
        {t.loading && !t.data ? (
          <Loading />
        ) : t.items.length ? (
          t.items.map((i) => <TargetItem key={i.target.id} item={i} onOpen={() => open(i.target.id, targetToForm(i.target))} />)
        ) : (
          <Empty>Nenhuma meta ainda. Crie uma com o valor que quer juntar e o prazo.</Empty>
        )}
      </Card>

      <Modal open={!!editing} title={editing?.id ? 'Editar meta' : 'Nova meta'} onClose={() => setEditing(null)}>
        {editing && (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Nome" placeholder="Viagem, reserva de emergência…" value={editing.form.name} onChange={(name) => setForm({ name })} autoFocus={!editing.id} />
            <Field label="Quanto quer juntar" prefix="R$" inputMode="numeric" value={editing.form.amount} mask={maskMoney} onChange={(amount) => setForm({ amount })} />
            <DateField label="Até quando" value={editing.form.deadline} onChange={(deadline) => setForm({ deadline })} />
            {t.accounts.length > 0 && (
              <Segmented
                label="Contar com"
                value={editing.form.accountId ?? 0}
                options={[{ value: 0, label: 'Saldo total' }, ...t.accounts.map((a) => ({ value: a.id, label: a.name }))]}
                onChange={(id) => setForm({ accountId: id || null })}
              />
            )}
            <FormError error={save.error} />
            <Actions>
              {editingItem && (
                <Button variant="ghostDanger" onClick={() => remove(editingItem)}>
                  Excluir
                </Button>
              )}
              <Button type="submit" busy={save.busy}>
                {editing.id ? 'Salvar' : 'Criar meta'}
              </Button>
            </Actions>
          </form>
        )}
      </Modal>
    </>
  );
}

function TargetItem({ item, onOpen }: { item: Item; onOpen(): void }) {
  const behind = item.status === 'late' || item.status === 'expired';
  const good = item.status === 'done' || item.status === 'onTime';
  return (
    <div className={cx('last:border-b-0', ui.divider)}>
      <ListButton onClick={onOpen}>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-baseline gap-3">
            <p className={cx(ui.strong, 'min-w-0 flex-1 truncate')}>{item.target.name}</p>
            <p className={cx('text-sm font-bold', item.status === 'done' ? 'text-emerald-700' : 'text-slate-900')}>{item.percent}%</p>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className={cx('h-full rounded-full transition-[width] duration-500', behind ? 'bg-amber-500' : 'bg-emerald-600')} style={{ width: `${item.percent}%` }} />
          </div>
          <p className={ui.small}>
            {money(item.current)} de {money(item.target.amount)} · até {formatDate(item.target.deadline)}
            {item.target.accountId !== null && ` · ${item.base}`}
          </p>
          <p className={cx('text-sm font-medium', good ? 'text-emerald-700' : behind ? 'text-amber-700' : 'text-slate-700')}>
            {item.message}
            {item.perMonth !== null && item.status !== 'onTime' && ` Guarde ${money(item.perMonth)} por mês para chegar no prazo.`}
          </p>
        </div>
      </ListButton>
    </div>
  );
}
