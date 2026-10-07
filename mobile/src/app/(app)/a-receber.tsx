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
  type ReceivableEditForm,
  type ReceivableForm,
} from '@finapp/shared';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Badge, Button, Card, Checkbox, Empty, Field, FormError, Loading, Modal, NoticeBar, PageHeader, Screen, Segmented, confirmAction } from '@/components';

export default function Receivables() {
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

  const setInstallmentForm = (changes: Partial<InstallmentEditForm>) =>
    editingInstallment && setEditingInstallment({ ...editingInstallment, form: { ...editingInstallment.form, ...changes } });
  const followingOpen = editingInstallment
    ? editingInstallment.item.installments.filter((i) => i.number > editingInstallment.installment.number && !i.paidAt).length
    : 0;

  return (
    <Screen onRefresh={r.reload} refreshing={r.loading && !!r.data}>
      <PageHeader
        description="Dinheiro que te devem: contas divididas, empréstimos e valores fixos por mês, com as parcelas já calculadas."
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
                    <Text className={ui.small}>
                      {[item.debtor, receivableSummary(item)].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <Text className={cx('text-sm font-semibold', ui.amount(receivableTotal(item)))}>{money(receivableTotal(item))}</Text>
                </View>
                <View className="flex-row flex-wrap gap-1">
                  <Badge>{receivableKindLabel[item.kind]}</Badge>
                  {item.amountMode === 'installment' && <Badge>Valor fixo por parcela</Badge>}
                  {overdue && <Badge tone="danger">Atrasado</Badge>}
                </View>
                {item.installments.map((i) => (
                  <View key={i.id} className="flex-row items-center justify-between gap-2">
                    <View className="flex-1">
                      <Checkbox
                        checked={!!i.paidAt}
                        onChange={(paid) => r.setPaid(i.id, paid)}
                        label={`${i.number}ª · ${money(i.amount)} · vence ${formatDate(i.dueDate)}`}
                        ariaLabel={`Parcela ${i.number} de ${item.description} recebida`}
                      />
                    </View>
                    <Pressable
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Editar parcela ${i.number}`}
                      onPress={() => (updateInstallment.clearError(), setEditingInstallment({ item, installment: i, form: installmentToEditForm(i) }))}
                    >
                      <Text className={cx(ui.link, 'text-xs')}>editar</Text>
                    </Pressable>
                  </View>
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
            <Field label="Quem deve" value={creating.debtor} onChange={(debtor) => setCreating({ ...creating, debtor })} />
            <Field label="O que foi" placeholder="pizza, empréstimo, assinatura..." value={creating.description} onChange={(description) => setCreating({ ...creating, description })} />
            <View className="flex-row gap-3">
              <Field className="flex-1" label="Valor" prefix="R$" inputMode="numeric" value={creating.amount} mask={maskMoney} onChange={(amount) => setCreating({ ...creating, amount })} />
              <Field className="flex-1" label="Parcelas" placeholder="1" inputMode="numeric" value={creating.installments} mask={(v) => digits(v).slice(0, 3)} onChange={(installments) => setCreating({ ...creating, installments })} />
            </View>
            <Field label="Vencimento" placeholder="DD/MM/AAAA" inputMode="numeric" value={creating.firstDueDate} mask={maskDate} onChange={(firstDueDate) => setCreating({ ...creating, firstDueDate })} />
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
            <Text className={ui.small}>Para mudar valor ou vencimento, use "editar" na parcela: dá para aplicar às próximas em aberto.</Text>
            <FormError error={update.error} />
            <Button busy={update.busy} onPress={() => update.run()}>
              Salvar
            </Button>
          </>
        )}
      </Modal>

      <Modal
        open={!!editingInstallment}
        title={editingInstallment ? `Editar ${editingInstallment.installment.number}ª parcela` : ''}
        onClose={() => setEditingInstallment(null)}
      >
        {editingInstallment && (
          <>
            <Text className={ui.muted}>
              {editingInstallment.item.description} · {editingInstallment.item.debtor}
            </Text>
            <Field label="Valor" prefix="R$" inputMode="numeric" value={editingInstallment.form.amount} mask={maskMoney} onChange={(amount) => setInstallmentForm({ amount })} />
            <Field label="Vencimento" placeholder="DD/MM/AAAA" inputMode="numeric" value={editingInstallment.form.dueDate} mask={maskDate} onChange={(dueDate) => setInstallmentForm({ dueDate })} />
            {followingOpen > 0 && (
              <Checkbox
                checked={editingInstallment.form.applyToFollowing}
                onChange={(applyToFollowing) => setInstallmentForm({ applyToFollowing })}
                label={`Aplicar também às próximas ${followingOpen} parcela(s) em aberto (mesmo valor, vencimentos mês a mês a partir desta data)`}
              />
            )}
            <Text className={ui.small}>Parcelas já recebidas não mudam. Use isso, por exemplo, quando o valor de uma assinatura aumentar.</Text>
            <FormError error={updateInstallment.error} />
            <Button busy={updateInstallment.busy} onPress={() => updateInstallment.run()}>
              Salvar
            </Button>
          </>
        )}
      </Modal>
    </Screen>
  );
}
