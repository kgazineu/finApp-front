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
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Empty, Field, FormError, Loading, Modal, NoticeBar, PageHeader, Screen, Segmented, confirmAction } from '@/components';

type Item = ReturnType<typeof useTargets>['items'][number];

export default function Targets() {
  const t = useTargets();
  const [editing, setEditing] = useState<{ id?: number; form: TargetForm } | null>(null);
  const save = useAction(async () => {
    await t.save(editing!.form, editing!.id);
    setEditing(null);
  });
  const open = (id: number | undefined, form: TargetForm) => (save.clearError(), setEditing({ id, form }));
  const remove = async (item: Item) => {
    if (await confirmAction(`Apagar a meta "${item.target.name}"?`, 'Apagar')) await t.remove(item.target);
  };

  return (
    <Screen onRefresh={t.reload} refreshing={t.loading && !!t.data}>
      <PageHeader
        description="Quanto você quer ter até uma data. O progresso vem do seu saldo registrado: o total ou o de uma conta."
        action={<Button onPress={() => open(undefined, emptyTargetForm())}>+ Nova meta</Button>}
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
        {t.data ? (
          <Text className={ui.small}>
            {t.hasBalance
              ? `Previsão pelo crescimento por mês (${signedMoney(t.growth)}: entradas fixas − despesas fixas), como se todo ele fosse para a meta.`
              : 'O progresso vem do último registro de saldos, e você ainda não tem nenhum: registre na tela Início.'}
          </Text>
        ) : null}
      </Card>

      <Modal open={!!editing} title={editing?.id ? 'Editar meta' : 'Nova meta'} onClose={() => setEditing(null)}>
        {editing && (
          <>
            <Field
              label="Nome"
              placeholder="Viagem, reserva de emergência…"
              value={editing.form.name}
              onChange={(name) => setEditing({ ...editing, form: { ...editing.form, name } })}
            />
            <View className="flex-row gap-3">
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
            </View>
            <Segmented
              label="Acompanhar"
              value={editing.form.accountId ?? 0}
              options={[{ value: 0, label: 'Saldo total' }, ...t.accounts.map((a) => ({ value: a.id, label: a.name }))]}
              onChange={(id) => setEditing({ ...editing, form: { ...editing.form, accountId: id || null } })}
            />
            <Text className={ui.small}>Saldo total é a soma das contas menos as faturas. Fatura não pode ser meta.</Text>
            <FormError error={save.error} />
            <Button busy={save.busy} onPress={() => save.run()}>
              {editing.id ? 'Salvar' : 'Criar meta'}
            </Button>
          </>
        )}
      </Modal>
    </Screen>
  );
}

function TargetItem({ item, onEdit, onRemove }: { item: Item; onEdit(): void; onRemove(): void }) {
  const behind = item.status === 'late' || item.status === 'expired';
  return (
    <View className={cx('gap-2 py-3', ui.divider)}>
      <View className={ui.row}>
        <Text className={cx(ui.strong, 'flex-1')}>{item.target.name}</Text>
        <Text className={cx('text-sm font-bold', item.status === 'done' ? 'text-emerald-700' : 'text-slate-900')}>{item.percent}%</Text>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-slate-100">
        <View className={cx('h-2 rounded-full', behind ? 'bg-amber-500' : 'bg-emerald-600')} style={{ width: `${item.percent}%` }} />
      </View>
      <Text className={ui.small}>
        {money(item.current)} de {money(item.target.amount)} · {item.base} · prazo {formatDate(item.target.deadline)}
      </Text>
      <Text className={cx('text-sm font-medium', item.status === 'done' || item.status === 'onTime' ? 'text-emerald-700' : behind ? 'text-amber-700' : 'text-slate-700')}>
        {item.message}
        {item.perMonth !== null && item.status !== 'onTime' ? ` Para chegar no prazo: ${money(item.perMonth)} por mês.` : ''}
      </Text>
      <View className="flex-row gap-2">
        <Button variant="ghost" onPress={onEdit}>
          Editar
        </Button>
        <Button variant="ghostDanger" onPress={onRemove}>
          Remover
        </Button>
      </View>
    </View>
  );
}
