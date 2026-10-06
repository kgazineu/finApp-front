import {
  billingFormFrom,
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
  type BillingForm,
} from '@finapp/shared';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Badge, Button, Card, Checkbox, Empty, Field, FormError, Loading, Modal, NoticeBar, Row, Segmented } from '../components';
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
        title="Projeção"
        description="Quanto você vai ter, contando o último saldo registrado e tudo que ainda vai entrar e sair."
        action={
          <Button busy={open.busy} onClick={() => open.run()}>
            + Novo registro de saldos
          </Button>
        }
      />
      <NoticeBar notice={p.notice ?? (open.error ? { text: open.error, error: true } : null)} onClose={() => (p.clear(), open.clearError())} />
      {p.error && <NoticeBar notice={{ text: p.error, error: true }} onClose={() => p.reload()} />}

      <Card>
        <Segmented label="Projetar para" value={p.months} options={monthOptions} onChange={p.setMonths} />
        {p.projection && p.breakdown ? (
          <div className="flex flex-col gap-3 pt-2">
            <div>
              <p className={ui.muted}>Em {formatDate(p.projection.projectedFor)} você terá</p>
              <p className={p.projection.projectedAmount < 0 ? ui.bigNegative : ui.big}>{money(p.projection.projectedAmount)}</p>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
              <Breakdown label="Último registro" cents={p.breakdown.lastTotal} />
              <Breakdown label="Entradas pendentes" cents={p.breakdown.incomes} />
              <Breakdown label="Despesas pendentes" cents={-p.breakdown.expenses} />
              <Breakdown label="A receber" cents={p.breakdown.receivables} />
            </dl>
          </div>
        ) : (
          <Loading />
        )}
      </Card>

      <Card title="Transações pendentes">
        <p className={ui.small}>Em vermelho: atrasadas. Marque quando pagar ou receber.</p>
        {p.projection?.pendingTransactions.length ? (
          p.projection.pendingTransactions.map((i) => (
            <Row key={i.id}>
              <div className="flex items-start gap-3">
                <Checkbox checked={false} onChange={() => p.payTransaction(i.id, true)} ariaLabel={`Marcar ${i.description} como paga`} />
                <div className="flex flex-col gap-1">
                  <p className={i.overdue ? ui.strongOverdue : ui.strong}>
                    {i.description} {!i.isFixed && <span className={ui.small}>· parcela {i.number}</span>}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge tone={i.kind}>{transactionKindLabel[i.kind]}</Badge>
                    <Badge>{i.isFixed ? 'Fixa' : 'Variável'}</Badge>
                    {i.overdue && <Badge tone="danger">Atrasada</Badge>}
                  </div>
                </div>
              </div>
              <Amount cents={signedAmount(i)} date={i.dueDate} overdue={i.overdue} />
            </Row>
          ))
        ) : (
          <Empty>Nada pendente até o fim do período.</Empty>
        )}
      </Card>

      <Card title="A receber pendentes">
        {p.projection?.pendingReceivables.length ? (
          p.projection.pendingReceivables.map((i) => (
            <Row key={i.id}>
              <div className="flex items-start gap-3">
                <Checkbox checked={false} onChange={() => p.payReceivable(i.id, true)} ariaLabel={`Marcar ${i.description} como recebida`} />
                <div className="flex flex-col gap-1">
                  <p className={i.overdue ? ui.strongOverdue : ui.strong}>{i.description}</p>
                  <p className={ui.small}>
                    {i.debtor} · parcela {i.number}
                  </p>
                  {i.overdue && <Badge tone="danger">Atrasada</Badge>}
                </div>
              </div>
              <Amount cents={i.amount} date={i.dueDate} overdue={i.overdue} />
            </Row>
          ))
        ) : (
          <Empty>Ninguém te deve nada até o fim do período.</Empty>
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
                <p className={cx('text-sm font-semibold', ui.amount(r.delta))}>{signedMoney(r.delta)}</p>
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
    <div className="flex flex-col items-end">
      <p className={cx('text-sm font-semibold', ui.amount(cents))}>{money(cents)}</p>
      <p className={overdue ? ui.smallOverdue : ui.small}>vence {formatDate(date)}</p>
    </div>
  );
}
