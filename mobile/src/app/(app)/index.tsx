import {
  billingFormFrom,
  deltaText,
  cx,
  formatDate,
  formatDateTime,
  maskMoney,
  money,
  signedAmount,
  signedMoney,
  transactionKindLabel,
  ui,
  useAction,
  useProjection,
  type Account,
  type BillingEntry,
  type BillingForm,
  type ReceivableInstallment,
  type TransactionInstallment,
} from '@finapp/shared';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, Button, Card, Checkbox, Empty, Field, FormError, Loading, Modal, NoticeBar, PageHeader, Row, Screen, Segmented } from '@/components';

const monthOptions = [
  { value: 1, label: '1 mês' },
  { value: 3, label: '3 meses' },
  { value: 6, label: '6 meses' },
  { value: 12, label: '12 meses' },
];

export default function Projection() {
  const p = useProjection();
  const [billing, setBilling] = useState<{ accounts: Account[]; form: BillingForm } | null>(null);
  const open = useAction(async () => {
    const accounts = await p.loadAccounts();
    setBilling({ accounts, form: billingFormFrom(accounts, p.last) });
  });
  const save = useAction(async () => {
    await p.createBilling(billing!.accounts, billing!.form);
    setBilling(null);
  });

  return (
    <Screen onRefresh={p.reload} refreshing={p.loading && !!p.data}>
      <PageHeader
        description="Quanto você tem agora, pelo último registro de saldos, e quanto vai ter contando tudo que ainda vai entrar e sair."
        action={
          <Button busy={open.busy} onPress={() => open.run()}>
            + Novo registro de saldos
          </Button>
        }
      />
      <NoticeBar notice={p.notice ?? (open.error ? { text: open.error, error: true } : null)} onClose={() => (p.clear(), open.clearError())} />
      {p.error && <NoticeBar notice={{ text: p.error, error: true }} onClose={() => p.reload()} />}

      <Card title="Saldo atual">
        {p.balance ? (
          <View className="gap-4">
            <View>
              <Text className={ui.muted}>No registro de {formatDateTime(p.balance.createdAt)} você tinha</Text>
              <Text className={p.balance.total < 0 ? ui.bigNegative : ui.big}>{money(p.balance.total)}</Text>
              {p.balance.delta !== null && (
                <Text className={cx('text-sm font-semibold', ui.amount(p.balance.delta))}>{signedMoney(p.balance.delta)} desde o registro anterior</Text>
              )}
            </View>
            <Entries title="Contas" entries={p.balance.accounts} total={p.balance.accountsTotal} empty="Nenhuma conta com saldo." />
            <Entries title="Faturas" entries={p.balance.bills} total={-p.balance.billsTotal} empty="Nenhuma fatura." bill />
          </View>
        ) : p.projection ? (
          <Empty>Nenhum registro ainda. Use "+ Novo registro de saldos" para anotar quanto tem em cada conta e em cada fatura.</Empty>
        ) : (
          <Loading />
        )}
      </Card>

      <Card>
        <Segmented label="Projetar para" value={p.months} options={monthOptions} onChange={p.setMonths} />
        {p.projection && p.breakdown ? (
          <View className="gap-3 pt-2">
            <View>
              <Text className={ui.muted}>Em {formatDate(p.projection.projectedFor)} você terá</Text>
              <Text className={p.projection.projectedAmount < 0 ? ui.bigNegative : ui.big}>{money(p.projection.projectedAmount)}</Text>
              <Text className={ui.small}>Conta como pago nesse dia 1 tudo que vence até o fim do mês, atrasados incluídos.</Text>
            </View>
            <View className="flex-row flex-wrap gap-y-2">
              <Breakdown label="Último registro" cents={p.breakdown.lastTotal} />
              <Breakdown label="Entradas" cents={p.breakdown.incomes} />
              <Breakdown label="Despesas" cents={-p.breakdown.expenses} />
              <Breakdown label="A receber" cents={p.breakdown.receivables} />
            </View>
            {p.upcoming.transactions.length + p.upcoming.receivables.length > 0 && (
              <View className="gap-1 border-t border-slate-100 pt-3">
                <View className={ui.row}>
                  <Text className={ui.label}>Vencem depois deste mês</Text>
                  <Total cents={p.upcoming.total} />
                </View>
                <Text className={ui.small}>Ainda não estão pendentes: só entram na conta da projeção. Se pagar ou receber adiantado, marque.</Text>
                {p.upcoming.transactions.map((i) => (
                  <TransactionRow key={`t${i.id}`} item={i} onPay={() => p.payTransaction(i.id, true)} />
                ))}
                {p.upcoming.receivables.map((i) => (
                  <ReceivableRow key={`r${i.id}`} item={i} onPay={() => p.payReceivable(i.id, true)} />
                ))}
              </View>
            )}
          </View>
        ) : (
          <Loading />
        )}
      </Card>

      <Card title="Transações pendentes" action={p.projection && <Total cents={p.current.transactionsTotal} />}>
        <Text className={ui.small}>Vencidas e deste mês. Em vermelho: atrasadas. Marque quando pagar ou receber.</Text>
        {p.current.transactions.length ? (
          p.current.transactions.map((i) => <TransactionRow key={i.id} item={i} onPay={() => p.payTransaction(i.id, true)} />)
        ) : (
          <Empty>Nada pendente até o fim deste mês.</Empty>
        )}
      </Card>

      <Card title="A receber pendentes" action={p.projection && <Total cents={p.current.receivablesTotal} />}>
        {p.current.receivables.length ? (
          p.current.receivables.map((i) => <ReceivableRow key={i.id} item={i} onPay={() => p.payReceivable(i.id, true)} />)
        ) : (
          <Empty>Ninguém te deve nada até o fim deste mês.</Empty>
        )}
      </Card>

      <Card title="Registros de saldo">
        {p.registrations.length ? (
          p.registrations.map((r) => (
            <Row key={r.id}>
              <View className="flex-1 gap-1">
                <Text className={ui.strong}>
                  #{r.id} · {formatDateTime(r.createdAt)}
                </Text>
                <Text className={ui.small}>{r.entries.map((e) => `${e.accountName}: ${money(e.amount)}`).join(' · ')}</Text>
              </View>
              <View className="items-end">
                <Text className={ui.strong}>{money(r.total)}</Text>
                <Text className={cx('text-sm font-semibold', ui.amount(r.delta ?? 0))}>{deltaText(r.delta)}</Text>
              </View>
            </Row>
          ))
        ) : (
          <Empty>Nenhum registro ainda. Registre o saldo das suas contas para começar.</Empty>
        )}
      </Card>

      <Card title="Marcadas nos últimos 30 dias">
        <Text className={ui.small}>Marcou errado? Desmarque e ela volta para as pendentes.</Text>
        {p.paid.length ? (
          p.paid.map((i) => (
            <Row key={i.key}>
              <View className="flex-1 flex-row items-start gap-3">
                <Checkbox checked onChange={() => p.setPaid(i.toggle, false)} ariaLabel={`Desmarcar ${i.label}`} />
                <View className="flex-1 gap-1">
                  <Text className={ui.strong}>{i.label}</Text>
                  <Text className={ui.small}>Marcada em {formatDateTime(i.paidAt)}</Text>
                </View>
              </View>
              <Amount cents={i.amount} date={i.dueDate} />
            </Row>
          ))
        ) : (
          <Empty>Nada marcado nos últimos 30 dias.</Empty>
        )}
      </Card>

      <Modal open={!!billing} title="Novo registro de saldos" onClose={() => setBilling(null)}>
        {billing && (
          <>
            <Text className={ui.muted}>
              Quanto tem em cada conta agora (nas faturas, o valor da fatura). Já vem com os valores do último registro. Antes, marque como pagas as
              parcelas que já saíram da conta.
            </Text>
            {billing.accounts.length ? (
              billing.accounts.map((a) => (
                <Field
                  key={a.id}
                  label={`${a.name} (${a.kind === 'asset' ? 'soma' : 'subtrai'})`}
                  prefix="R$"
                  inputMode="numeric"
                  value={billing.form[a.id] ?? ''}
                  mask={maskMoney}
                  onChange={(v) => setBilling({ ...billing, form: { ...billing.form, [a.id]: v } })}
                />
              ))
            ) : (
              <Text className={ui.text}>
                Nenhuma conta cadastrada.{' '}
                <Link href="/contas" className={ui.link} onPress={() => setBilling(null)}>
                  Cadastre suas contas
                </Link>{' '}
                primeiro.
              </Text>
            )}
            <FormError error={save.error} />
            <Button busy={save.busy} disabled={!billing.accounts.length} onPress={() => save.run()}>
              Registrar
            </Button>
          </>
        )}
      </Modal>
    </Screen>
  );
}

function Entries({ title, entries, total, empty, bill }: { title: string; entries: BillingEntry[]; total: number; empty: string; bill?: boolean }) {
  return (
    <View className="gap-1">
      <Text className={ui.label}>{title}</Text>
      {entries.length ? (
        <>
          {entries.map((e) => (
            <View key={e.id} className="flex-row justify-between gap-3">
              <Text className={cx(ui.text, 'flex-1')}>{e.accountName}</Text>
              <Text className={cx('text-sm font-semibold', ui.amount(bill ? -e.amount : e.amount))}>{money(bill ? -e.amount : e.amount)}</Text>
            </View>
          ))}
          <View className="flex-row justify-between gap-3 border-t border-slate-100 pt-1">
            <Text className={ui.strong}>Total</Text>
            <Text className={cx('text-sm font-semibold', ui.amount(total))}>{money(total)}</Text>
          </View>
        </>
      ) : (
        <Text className={ui.small}>{empty}</Text>
      )}
    </View>
  );
}

function TransactionRow({ item: i, onPay }: { item: TransactionInstallment; onPay(): void }) {
  return (
    <Row>
      <View className="flex-1 flex-row items-start gap-3">
        <Checkbox checked={false} onChange={onPay} ariaLabel={`Marcar ${i.description} como paga`} />
        <View className="flex-1 gap-1">
          <Text className={i.overdue ? ui.strongOverdue : ui.strong}>
            {i.description}
            {!i.isFixed && <Text className={ui.small}> · parcela {i.number}</Text>}
          </Text>
          <View className="flex-row flex-wrap gap-1">
            <Badge tone={i.kind}>{transactionKindLabel[i.kind]}</Badge>
            <Badge>{i.isFixed ? 'Fixa' : 'Variável'}</Badge>
            {i.overdue && <Badge tone="danger">Atrasada</Badge>}
          </View>
        </View>
      </View>
      <Amount cents={signedAmount(i)} date={i.dueDate} overdue={i.overdue} />
    </Row>
  );
}

function ReceivableRow({ item: i, onPay }: { item: ReceivableInstallment; onPay(): void }) {
  return (
    <Row>
      <View className="flex-1 flex-row items-start gap-3">
        <Checkbox checked={false} onChange={onPay} ariaLabel={`Marcar ${i.description} como recebida`} />
        <View className="flex-1 gap-1">
          <Text className={i.overdue ? ui.strongOverdue : ui.strong}>{i.description}</Text>
          <Text className={ui.small}>
            {i.debtor} · parcela {i.number}
          </Text>
          {i.overdue && (
            <View className="flex-row">
              <Badge tone="danger">Atrasada</Badge>
            </View>
          )}
        </View>
      </View>
      <Amount cents={i.amount} date={i.dueDate} overdue={i.overdue} />
    </Row>
  );
}

function Total({ cents }: { cents: number }) {
  return <Text className={cx('font-semibold', ui.amount(cents))}>Total {signedMoney(cents)}</Text>;
}

function Breakdown({ label, cents }: { label: string; cents: number }) {
  return (
    <View className="w-1/2">
      <Text className={ui.small}>{label}</Text>
      <Text className={cx('font-semibold', ui.amount(cents))}>{signedMoney(cents)}</Text>
    </View>
  );
}

function Amount({ cents, date, overdue }: { cents: number; date: string; overdue?: boolean }) {
  return (
    <View className="items-end">
      <Text className={cx('text-sm font-semibold', ui.amount(cents))}>{money(cents)}</Text>
      <Text className={overdue ? ui.smallOverdue : ui.small}>vence {formatDate(date)}</Text>
    </View>
  );
}
