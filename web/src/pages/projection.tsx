import {
  billingFormFrom,
  deltaText,
  cx,
  formatDate,
  formatDateTime,
  formatMonth,
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
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Badge, Button, Card, Checkbox, Collapsible, Empty, Field, FormError, Loading, Modal, NoticeBar, Row, Segmented } from '../components';
import { PageHeader } from '../layouts';

const monthOptions = [
  { value: 1, label: '1 mês' },
  { value: 3, label: '3 meses' },
  { value: 6, label: '6 meses' },
  { value: 12, label: '12 meses' },
];

export function ProjectionPage() {
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
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void save.run();
  };

  return (
    <>
      <PageHeader
        title="Início"
        description="Quanto você tem agora, pelo último registro de saldos, e quanto vai ter contando tudo que ainda vai entrar e sair."
        action={
          <Button busy={open.busy} onClick={() => open.run()}>
            + Novo registro de saldos
          </Button>
        }
      />
      <NoticeBar notice={p.notice ?? (open.error ? { text: open.error, error: true } : null)} onClose={() => (p.clear(), open.clearError())} />
      {p.error && <NoticeBar notice={{ text: p.error, error: true }} onClose={() => p.reload()} />}

      <Card title="Saldo atual">
        {p.balance ? (
          <div className="flex flex-col gap-4">
            <div>
              <p className={ui.muted}>No registro de {formatDateTime(p.balance.createdAt)} você tinha</p>
              <p className={p.balance.total < 0 ? ui.bigNegative : ui.big}>{money(p.balance.total)}</p>
              {p.balance.delta !== null && (
                <p className={cx('text-sm font-semibold', ui.amount(p.balance.delta))}>{signedMoney(p.balance.delta)} desde o registro anterior</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Entries title="Contas" entries={p.balance.accounts} total={p.balance.accountsTotal} empty="Nenhuma conta com saldo." />
              <Entries title="Faturas" entries={p.balance.bills} total={-p.balance.billsTotal} empty="Nenhuma fatura." bill />
            </div>
          </div>
        ) : p.projection ? (
          <Empty>Nenhum registro ainda. Use "+ Novo registro de saldos" para anotar quanto tem em cada conta e em cada fatura.</Empty>
        ) : (
          <Loading />
        )}
      </Card>

      <Card title="Transações pendentes" action={p.projection && <Total cents={p.current.transactionsTotal} />}>
        <p className={ui.small}>Vencidas e deste mês. Marque quando pagar ou receber.</p>
        {p.current.transactions.length ? (
          <Collapsible>
            {p.current.transactions.map((i) => (
              <TransactionRow key={i.id} item={i} onPay={() => p.payTransaction(i.id, true)} />
            ))}
          </Collapsible>
        ) : (
          <Empty>Nada pendente até o fim deste mês.</Empty>
        )}
      </Card>

      <Card title="A receber pendentes" action={p.projection && <Total cents={p.current.receivablesTotal} />}>
        {p.current.receivables.length ? (
          <div className="flex flex-col">
            {p.current.receivables.map((i) => (
              <ReceivableRow key={i.id} item={i} onPay={() => p.payReceivable(i.id, true)} />
            ))}
          </div>
        ) : (
          <Empty>Ninguém te deve nada até o fim deste mês.</Empty>
        )}
      </Card>

      <Card>
        <Segmented label="Projetar para" value={p.months} options={monthOptions} onChange={p.setMonths} />
        {p.projection && p.breakdown ? (
          <div className="flex flex-col gap-3 pt-2">
            <div>
              <p className={ui.muted}>Em {formatDate(p.projection.projectedFor)} você terá</p>
              <p className={p.projection.projectedAmount < 0 ? ui.bigNegative : ui.big}>{money(p.projection.projectedAmount)}</p>
              <p className={ui.small}>Conta como pago nesse dia 1 tudo que vence até o fim do mês, atrasados incluídos.</p>
            </div>
            {/* estes cinco somados dão o valor projetado */}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-5">
              <Breakdown label="Último registro" cents={p.breakdown.lastTotal} />
              <Breakdown label="Total de entradas" cents={p.breakdown.incomes} />
              <Breakdown label="Despesas fixas" cents={-p.breakdown.fixedExpenses} />
              <Breakdown label="Despesas variáveis" cents={-p.breakdown.variableExpenses} />
              <Breakdown label="Recebimento total" cents={p.breakdown.receivables} />
            </dl>
            {/* API antiga não manda os números por mês: somem em vez de quebrar a tela durante o deploy */}
            {p.monthly && (
              <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-5">
                  <Breakdown label="Recebimento por mês" cents={p.monthly.receivables} />
                  <Breakdown label="Crescimento por mês" cents={p.monthly.growth} />
                  {p.monthly.goal !== null && (
                    <>
                      <Breakdown label={p.monthly.goalPercent ? `Guardar (${p.monthly.goalPercent}%)` : 'Guardar por mês'} cents={p.monthly.goal} />
                      <Breakdown label="Para gastar no mês" cents={p.monthly.toSpend ?? 0} />
                    </>
                  )}
                </dl>
                <p className={ui.small}>
                  Por mês: {formatMonth(p.monthly.month)}, pelo que está cadastrado. Crescimento = entradas + recebimentos − despesas fixas e
                  variáveis, como na projeção.{' '}
                  {p.monthly.goal === null ? (
                    <>
                      Defina uma meta de guardar no{' '}
                      <Link to="/perfil" className={ui.link}>
                        Perfil
                      </Link>{' '}
                      para ver quanto sobra para gastar.
                    </>
                  ) : (
                    'A meta e o "para gastar" não mudam a projeção.'
                  )}
                </p>
                <Checkbox checked={p.simulation.on} onChange={p.simulation.setOn} label="Simular um gasto por mês (só na tela, não salva nada)" />
                {p.simulation.on && (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-6">
                    <Field
                      className="sm:w-60"
                      label="Quanto vou gastar por mês"
                      prefix="R$"
                      inputMode="numeric"
                      value={p.simulation.spend}
                      mask={maskMoney}
                      onChange={p.simulation.setSpend}
                    />
                    <div>
                      <p className={ui.small}>Em {formatDate(p.projection.projectedFor)} você teria</p>
                      <p className={cx('text-2xl font-bold', p.simulation.projectedAmount < 0 ? 'text-rose-700' : 'text-slate-900')}>
                        {money(p.simulation.projectedAmount)}
                      </p>
                    </div>
                    <dl className="text-sm">
                      <Breakdown label="Sobraria por mês" cents={p.simulation.growth} />
                    </dl>
                  </div>
                )}
                {p.simulation.on && (
                  <p className={ui.small}>
                    Tira o gasto de cada um dos {p.months} {p.months === 1 ? 'mês' : 'meses'} da projeção. A projeção de verdade continua a de cima.
                  </p>
                )}
              </div>
            )}
            {p.upcoming.transactions.length + p.upcoming.receivables.length > 0 && (
              <div className="flex flex-col gap-1 border-t border-slate-100 pt-3">
                <div className={ui.row}>
                  <p className={ui.label}>Vencem depois deste mês</p>
                  <Total cents={p.upcoming.total} />
                </div>
                <p className={ui.small}>Só entram na conta da projeção. Pagou ou recebeu adiantado? Marque.</p>
                <Collapsible>
                  {p.upcoming.transactions.map((i) => (
                    <TransactionRow key={`t${i.id}`} item={i} onPay={() => p.payTransaction(i.id, true)} />
                  ))}
                  {p.upcoming.receivables.map((i) => (
                    <ReceivableRow key={`r${i.id}`} item={i} onPay={() => p.payReceivable(i.id, true)} />
                  ))}
                </Collapsible>
              </div>
            )}
          </div>
        ) : (
          <Loading />
        )}
      </Card>

      <Card title="Registros de saldo">
        {p.registrations.length ? (
          p.registrations.map((r) => (
            <Row key={r.id}>
              <div className="flex flex-col gap-1">
                <p className={ui.strong}>
                  #{r.id} · {formatDateTime(r.createdAt)}
                </p>
                <p className={ui.small}>{r.entries.map((e) => `${e.accountName}: ${money(e.amount)}`).join(' · ')}</p>
              </div>
              <div className="flex flex-col items-end">
                <p className={ui.strong}>{money(r.total)}</p>
                <p className={cx('text-sm font-semibold', ui.amount(r.delta ?? 0))}>{deltaText(r.delta)}</p>
              </div>
            </Row>
          ))
        ) : (
          <Empty>Nenhum registro ainda. Registre o saldo das suas contas para começar.</Empty>
        )}
      </Card>

      <Card title="Marcadas nos últimos 30 dias">
        <p className={ui.small}>Marcou errado? Desmarque e ela volta para as pendentes.</p>
        {p.paid.length ? (
          p.paid.map((i) => (
            <Row key={i.key}>
              <div className="flex items-start gap-3">
                <Checkbox checked onChange={() => p.setPaid(i.toggle, false)} ariaLabel={`Desmarcar ${i.label}`} />
                <div className="flex flex-col gap-1">
                  <p className={ui.strong}>{i.label}</p>
                  <p className={ui.small}>Marcada em {formatDateTime(i.paidAt)}</p>
                </div>
              </div>
              <Amount cents={i.amount} date={i.dueDate} />
            </Row>
          ))
        ) : (
          <Empty>Nada marcado nos últimos 30 dias.</Empty>
        )}
      </Card>

      <Modal open={!!billing} title="Novo registro de saldos" onClose={() => setBilling(null)}>
        {billing && (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <p className={ui.muted}>
              Quanto tem em cada conta agora (nas faturas, o valor da fatura). Já vem com os valores do último registro.
              Antes, marque como pagas as parcelas que já saíram da conta.
            </p>
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
              <p className={ui.text}>
                Nenhuma conta cadastrada.{' '}
                <Link to="/contas" className={ui.link}>
                  Cadastre suas contas
                </Link>{' '}
                primeiro.
              </p>
            )}
            <FormError error={save.error} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setBilling(null)}>
                Cancelar
              </Button>
              <Button type="submit" busy={save.busy} disabled={!billing.accounts.length}>
                Registrar
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

function Entries({ title, entries, total, empty, bill }: { title: string; entries: BillingEntry[]; total: number; empty: string; bill?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <p className={ui.label}>{title}</p>
      {entries.length ? (
        <>
          {entries.map((e) => (
            <div key={e.id} className="flex justify-between gap-3 text-sm">
              <span className={ui.text}>{e.accountName}</span>
              <span className={cx('font-semibold', ui.amount(bill ? -e.amount : e.amount))}>{money(bill ? -e.amount : e.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between gap-3 border-t border-slate-100 pt-1 text-sm">
            <span className={ui.strong}>Total</span>
            <span className={cx('font-semibold', ui.amount(total))}>{money(total)}</span>
          </div>
        </>
      ) : (
        <p className={ui.small}>{empty}</p>
      )}
    </div>
  );
}

// linha compacta das pendências: badges ao lado da descrição e o valor sempre à direita (não quebra para baixo)
function PendingRow({ children, amount }: { children: ReactNode; amount: ReactNode }) {
  return (
    <div className={cx('flex items-center gap-3 py-2', ui.divider)}>
      {children}
      {amount}
    </div>
  );
}

function TransactionRow({ item: i, onPay }: { item: TransactionInstallment; onPay(): void }) {
  return (
    <PendingRow amount={<Amount cents={signedAmount(i)} date={i.dueDate} overdue={i.overdue} />}>
      <Checkbox checked={false} onChange={onPay} ariaLabel={`Marcar ${i.description} como paga`} />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
        <p className={i.overdue ? ui.strongOverdue : ui.strong}>
          {i.description} {!i.isFixed && <span className={ui.small}>· parcela {i.number}</span>}
        </p>
        <Badge tone={i.kind}>{transactionKindLabel[i.kind]}</Badge>
        <Badge>{i.isFixed ? 'Fixa' : 'Variável'}</Badge>
        {i.overdue && <Badge tone="danger">Atrasada</Badge>}
      </div>
    </PendingRow>
  );
}

function ReceivableRow({ item: i, onPay }: { item: ReceivableInstallment; onPay(): void }) {
  return (
    <PendingRow amount={<Amount cents={i.amount} date={i.dueDate} overdue={i.overdue} />}>
      <Checkbox checked={false} onChange={onPay} ariaLabel={`Marcar ${i.description} como recebida`} />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
        <p className={i.overdue ? ui.strongOverdue : ui.strong}>
          {i.description}{' '}
          <span className={ui.small}>
            · {i.debtor} · parcela {i.number}
          </span>
        </p>
        {i.overdue && <Badge tone="danger">Atrasada</Badge>}
      </div>
    </PendingRow>
  );
}

// no celular só o valor: a palavra "Total" fazia o cabeçalho quebrar em duas linhas
function Total({ cents }: { cents: number }) {
  return (
    <p className={cx('shrink-0 whitespace-nowrap font-semibold', ui.amount(cents))}>
      <span className="max-sm:hidden">Total </span>
      {signedMoney(cents)}
    </p>
  );
}

function Breakdown({ label, cents }: { label: string; cents: number }) {
  return (
    <div>
      <dt className={ui.small}>{label}</dt>
      <dd className={cx('font-semibold', ui.amount(cents))}>{signedMoney(cents)}</dd>
    </div>
  );
}

function Amount({ cents, date, overdue }: { cents: number; date: string; overdue?: boolean }) {
  return (
    <div className="flex shrink-0 flex-col items-end">
      <p className={cx('text-sm font-semibold', ui.amount(cents))}>{money(cents)}</p>
      <p className={overdue ? ui.smallOverdue : ui.small}>vence {formatDate(date)}</p>
    </div>
  );
}
