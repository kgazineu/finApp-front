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
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, Button, Card, Checkbox, Empty, Field, FormError, Loading, Modal, NoticeBar, PageHeader, Row, Screen, Segmented, confirmAction } from '@/components';

const kindOptions: { value: TransactionKind; label: string }[] = [
  { value: 'expense', label: 'Despesa' },
  { value: 'income', label: 'Entrada' },
];

export default function Transactions() {
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

  const setEdit = (changes: Partial<RecurringEditForm>) => editing && setEditing({ ...editing, form: { ...editing.form, ...changes } });

  return (
    <Screen onRefresh={t.reload} refreshing={t.loading && !!t.data}>
      <PageHeader
        description="Entradas e despesas planejadas: salário, aluguel, assinaturas, compras parceladas."
        action={<Button onPress={() => (create.clearError(), setCreating(emptyRecurringForm()))}>+ Nova transação</Button>}
      />
      <NoticeBar notice={t.notice} onClose={t.clear} />

      <Card title="Cadastradas">
        {t.loading && !t.data ? (
          <Loading />
        ) : t.data?.length ? (
          t.data.map((item) => (
            <Row key={item.id}>
              <View className="flex-1 gap-1">
                <Text className={ui.strong}>{item.description}</Text>
                <View className="flex-row flex-wrap gap-1">
                  <Badge tone={item.kind}>{transactionKindLabel[item.kind]}</Badge>
                  <Badge>{item.isFixed ? 'Fixa' : 'Variável'}</Badge>
                </View>
                <Text className={ui.small}>{scheduleText(item)}</Text>
              </View>
              <View className="items-end gap-1">
                <Text className={cx('text-sm font-semibold', ui.amount(signedAmount(item)))}>{money(signedAmount(item))}</Text>
                <View className="flex-row">
                  <Button variant="ghost" onPress={() => (update.clearError(), setEditing({ item, form: recurringToEditForm(item) }))}>
                    Editar
                  </Button>
                  <Button variant="ghostDanger" onPress={() => remove(item)}>
                    Remover
                  </Button>
                </View>
              </View>
            </Row>
          ))
        ) : (
          <Empty>Nenhuma transação cadastrada.</Empty>
        )}
        <FormError error={t.error} />
      </Card>

      <Modal open={!!creating} title="Nova transação" onClose={() => setCreating(null)}>
        {creating && (
          <>
            <Field label="Descrição" value={creating.description} onChange={(description) => setCreating({ ...creating, description })} />
            <Segmented label="Tipo" value={creating.kind} options={kindOptions} onChange={(kind) => setCreating({ ...creating, kind })} />
            <Checkbox
              checked={creating.isFixed}
              onChange={(isFixed) => setCreating({ ...creating, isFixed })}
              label="Fixa (repete sem data para acabar, como salário e aluguel)"
            />
            <Field label="Valor" prefix="R$" inputMode="numeric" value={creating.amount} mask={maskMoney} onChange={(amount) => setCreating({ ...creating, amount })} />
            <View className="flex-row gap-3">
              <Field className="flex-1" label="Começa em" placeholder="MM/AAAA" inputMode="numeric" value={creating.startMonth} mask={maskMonth} onChange={(startMonth) => setCreating({ ...creating, startMonth })} />
              <Field className="flex-1" label="Dia do mês" placeholder="sem dia certo" inputMode="numeric" value={creating.dayOfMonth} mask={(v) => digits(v).slice(0, 2)} onChange={(dayOfMonth) => setCreating({ ...creating, dayOfMonth })} />
            </View>
            <View className="flex-row gap-3">
              <Field className="flex-1" label="A cada quantos meses" placeholder="1" inputMode="numeric" value={creating.intervalMonths} mask={(v) => digits(v).slice(0, 3)} onChange={(intervalMonths) => setCreating({ ...creating, intervalMonths })} />
              <Field className="flex-1" label="Quantas vezes" inputMode="numeric" value={creating.installments} mask={(v) => digits(v).slice(0, 3)} onChange={(installments) => setCreating({ ...creating, installments })} />
            </View>
            <Text className={ui.small}>"Quantas vezes" vazio: fixa repete sem fim, variável acontece uma vez só. Pode começar no passado: as parcelas já vencidas aparecem como atrasadas e você marca as que já pagou ou recebeu.</Text>
            <FormError error={create.error} />
            <Button busy={create.busy} onPress={() => create.run()}>
              Cadastrar
            </Button>
          </>
        )}
      </Modal>

      <Modal open={!!editing} title="Editar transação" onClose={() => setEditing(null)}>
        {editing && (
          <>
            <Field label="Descrição" value={editing.form.description} onChange={(description) => setEdit({ description })} />
            <Field label="Valor" prefix="R$" inputMode="numeric" value={editing.form.amount} mask={maskMoney} onChange={(amount) => setEdit({ amount })} />
            <View className="flex-row gap-3">
              <Field className="flex-1" label="Dia do mês" placeholder="sem dia certo" inputMode="numeric" value={editing.form.dayOfMonth} mask={(v) => digits(v).slice(0, 2)} onChange={(dayOfMonth) => setEdit({ dayOfMonth })} />
              <Field className="flex-1" label="Termina em" placeholder="sem fim" inputMode="numeric" value={editing.form.endMonth} mask={maskMonth} onChange={(endMonth) => setEdit({ endMonth })} />
            </View>
            <Text className={ui.small}>
              Vazio = sem dia certo / sem fim. Parcelas já pagas não mudam. Tipo, fixa, início e intervalo não podem ser editados: para isso, remova e
              cadastre de novo.
            </Text>
            <FormError error={update.error} />
            <Button busy={update.busy} onPress={() => update.run()}>
              Salvar
            </Button>
          </>
        )}
      </Modal>
    </Screen>
  );
}
