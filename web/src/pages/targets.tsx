import {
  cx,
  emptyTargetForm,
  formatDate,
  maskDate,
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
import { Actions, Button, Card, Empty, Field, FormError, ItemActions, Loading, Modal, NoticeBar, Segmented, confirmAction } from '../components';
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
  const remove = async (item: Item) => {
    if (await confirmAction(`Apagar a meta "${item.target.name}"?`)) await t.remove(item.target);
  };

  return (
    <>
      <PageHeader
        title="Metas"
        description="Quanto você quer ter até uma data. O progresso vem do seu saldo registrado: o total ou o de uma conta."
        action={<Button onClick={() => open(undefined, emptyTargetForm())}>+ Nova meta</Button>}
      />
      <NoticeBar notice={t.notice} onClose={t.clear} />
      {t.error && <NoticeBar notice={{ text: t.error, error: true }} onClose={() => t.reload()} />}

      <Card>
        {t.loading && !t.data ? (
          <Loading />
        ) : t.items.length ? (
          t.items.map((i) => <TargetItem key={i.target.id} item={i} onEdit={() => open(i.target.id, targetToForm(i.target))} onRemove={() => remove(i)} />)
        ) : (
          <Empty>Nenhuma meta ainda. Crie uma com o valor que quer juntar e o prazo.</Empty>
        )}
        {t.data && (
          <p className={ui.small}>
            {t.hasBalance ? (
              <>
                Previsão pelo crescimento por mês ({signedMoney(t.growth)}: entradas fixas − despesas fixas), como se todo ele fosse para a
                meta.
              </>
            ) : (
              <>
                O progresso vem do último registro de saldos, e você ainda não tem nenhum: registre na{' '}
                <Link to="/" className={ui.link}>
                  tela inicial
                </Link>
                .
              </>
            )}
          </p>
        )}
      </Card>

      <Modal open={!!editing} title={editing?.id ? 'Editar meta' : 'Nova meta'} onClose={() => setEditing(null)}>
        {editing && (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field
              label="Nome"
              placeholder="Viagem, reserva de emergência…"
              value={editing.form.name}
              onChange={(name) => setEditing({ ...editing, form: { ...editing.form, name } })}
            />
            <div className="grid grid-cols-2 items-end gap-3">
              <Field
                className="flex-1"
                label="Quanto quer juntar"
                prefix="R$"
                inputMode="numeric"
                value={editing.form.amount}
                mask={maskMoney}
                onChange={(amount) => setEditing({ ...editing, form: { ...editing.form, amount } })}
              />
              <Field
                className="flex-1"
                label="Prazo"
                placeholder="DD/MM/AAAA"
                inputMode="numeric"
                value={editing.form.deadline}
                mask={maskDate}
                onChange={(deadline) => setEditing({ ...editing, form: { ...editing.form, deadline } })}
              />
            </div>
            <Segmented
              label="Acompanhar"
              value={editing.form.accountId ?? 0}
              options={[{ value: 0, label: 'Saldo total' }, ...t.accounts.map((a) => ({ value: a.id, label: a.name }))]}
              onChange={(id) => setEditing({ ...editing, form: { ...editing.form, accountId: id || null } })}
            />
            <p className={ui.small}>Saldo total é a soma das contas menos as faturas. Fatura não pode ser meta.</p>
            <FormError error={save.error} />
            <Actions>
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
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

function TargetItem({ item, onEdit, onRemove }: { item: Item; onEdit(): void; onRemove(): void }) {
  const behind = item.status === 'late' || item.status === 'expired';
  return (
    <div className={cx('flex flex-col gap-2 py-3 first:pt-0 last:border-b-0', ui.divider)}>
      <div className="flex items-center gap-3">
        <p className={cx(ui.strong, 'min-w-0 flex-1')}>{item.target.name}</p>
        <p className={cx('text-sm font-bold', item.status === 'done' ? 'text-emerald-700' : 'text-slate-900')}>{item.percent}%</p>
        <ItemActions name={item.target.name} onEdit={onEdit} onRemove={onRemove} />
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={cx('h-full rounded-full transition-[width] duration-500', behind ? 'bg-amber-500' : 'bg-emerald-600')} style={{ width: `${item.percent}%` }} />
      </div>
      <p className={ui.small}>
        {money(item.current)} de {money(item.target.amount)} · {item.base} · prazo {formatDate(item.target.deadline)}
      </p>
      <p className={cx('text-sm font-medium', item.status === 'done' || item.status === 'onTime' ? 'text-emerald-700' : behind ? 'text-amber-700' : 'text-slate-700')}>
        {item.message}
        {item.perMonth !== null && item.status !== 'onTime' && ` Para chegar no prazo: ${money(item.perMonth)} por mês.`}
      </p>
    </div>
  );
}
