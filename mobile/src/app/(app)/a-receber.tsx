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
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, Button, Card, Checkbox, Empty, Field, FormError, Loading, Modal, NoticeBar, PageHeader, Row, Screen, Segmented, confirmAction } from '@/components';

const kindOptions: { value: ReceivableKind; label: string }[] = [
  { value: 'loan', label: 'Empréstimo' },
  { value: 'split', label: 'Conta dividida' },
];

export default function Receivables() {
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

  return (
    <Screen onRefresh={r.reload} refreshing={r.loading && !!r.data}>
      <PageHeader
        description="Dinheiro que te devem: contas divididas e empréstimos, com as parcelas já calculadas."
        action={<Button onPress={() => (create.clearError(), setCreating(emptyReceivableForm()))}>+ Novo</Button>}
      />
      <NoticeBar notice={r.notice} onClose={r.clear} />

      <Card title="Cadastrados">
        {r.loading && !r.data ? (
          <Loading />
        ) : r.data?.length ? (
          r.data.map((item) => {
            const overdue = item.installments.some((i) => i.overdue);
            return (
              <View key={item.id} className={cx('gap-2 py-3', ui.divider)}>
                <View className={ui.row}>
                  <View className="flex-1 gap-1">
                    <Text className={overdue ? ui.strongOverdue : ui.strong}>{item.description}</Text>
                    <Text className={ui.small}>{item.debtor}</Text>
                  </View>
                  <Text className={cx('text-sm font-semibold', ui.amount(item.amount))}>{money(item.amount)}</Text>
                </View>
                <View className="flex-row flex-wrap gap-1">
                  <Badge>{receivableKindLabel[item.kind]}</Badge>
                  {item.interestRate > 0 && <Badge>{`${item.interestRate}% de juros`}</Badge>}
                  {overdue && <Badge tone="danger">Atrasado</Badge>}
                </View>
                {item.installments.map((i) => (
                  <Checkbox
                    key={i.id}
                    checked={!!i.paidAt}
                    onChange={(paid) => r.setPaid(i.id, paid)}
                    label={`${i.number}ª · ${money(i.amount)} · vence ${formatDate(i.dueDate)}`}
                    ariaLabel={`Parcela ${i.number} de ${item.description} recebida`}
                  />
                ))}
                <View className="flex-row justify-end">
                  <Button variant="ghost" onPress={() => (update.clearError(), setEditing({ item, form: { debtor: item.debtor, description: item.description } }))}>
                    Editar
                  </Button>
                  <Button variant="ghostDanger" onPress={() => remove(item)}>
                    Remover
                  </Button>
                </View>
              </View>
            );
          })
        ) : (
          <Empty>Ninguém te deve nada.</Empty>
        )}
        <FormError error={r.error} />
      </Card>

      <Modal open={!!creating} title="Novo valor a receber" onClose={() => setCreating(null)}>
        {creating && (
          <>
            <Segmented label="Tipo" value={creating.kind} options={kindOptions} onChange={(kind) => setCreating({ ...creating, kind })} />
            <Field label="Quem deve" value={creating.debtor} onChange={(debtor) => setCreating({ ...creating, debtor })} />
            <Field label="Descrição" placeholder="pizza, bicicleta..." value={creating.description} onChange={(description) => setCreating({ ...creating, description })} />
            <Field label="Valor (sem juros)" prefix="R$" inputMode="numeric" value={creating.amount} mask={maskMoney} onChange={(amount) => setCreating({ ...creating, amount })} />
            {creating.kind === 'loan' && (
              <View className="flex-row gap-3">
                <Field className="flex-1" label="Juros (%)" placeholder="0" inputMode="numeric" value={creating.interestRate} mask={(v) => digits(v).slice(0, 4)} onChange={(interestRate) => setCreating({ ...creating, interestRate })} />
                <Field className="flex-1" label="Parcelas" placeholder="1" inputMode="numeric" value={creating.installments} mask={(v) => digits(v).slice(0, 3)} onChange={(installments) => setCreating({ ...creating, installments })} />
              </View>
            )}
            <Field label="Primeiro vencimento" placeholder="DD/MM/AAAA" inputMode="numeric" value={creating.firstDueDate} mask={maskDate} onChange={(firstDueDate) => setCreating({ ...creating, firstDueDate })} />
            <Text className={ui.small}>
              {creating.kind === 'split'
                ? 'Conta dividida: sem juros e em uma parcela.'
                : 'Juros simples sobre o total; as parcelas vencem mês a mês a partir do primeiro vencimento.'}
            </Text>
            <FormError error={create.error} />
            <Button busy={create.busy} onPress={() => create.run()}>
              Cadastrar
            </Button>
          </>
        )}
      </Modal>

      <Modal open={!!editing} title="Editar valor a receber" onClose={() => setEditing(null)}>
        {editing && (
          <>
            <Field label="Quem deve" value={editing.form.debtor} onChange={(debtor) => setEditing({ ...editing, form: { ...editing.form, debtor } })} />
            <Field label="Descrição" value={editing.form.description} onChange={(description) => setEditing({ ...editing, form: { ...editing.form, description } })} />
            <Text className={ui.small}>Valor, juros e parcelas não mudam: para isso, remova e cadastre de novo.</Text>
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
