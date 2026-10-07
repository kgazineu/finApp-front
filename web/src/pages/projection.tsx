import {
  billingFormFrom,
  cx,
  deltaText,
  formatDate,
  formatDateTime,
  maskMoney,
  money,
  parseMoney,
  signedAmount,
  signedMoney,
  ui,
  useAccounts,
  useAction,
  useApi,
  useAuth,
  useProjection,
  useRecurring,
  type Account,
  type BillingForm,
  type ReceivableInstallment,
  type TransactionInstallment,
} from '@finapp/shared';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Actions, Badge, Button, Card, Checkbox, Collapsible, Disclosure, Empty, Field, FormError, Loading, Modal, NoticeBar, Row, Segmented } from '../components';
import { Icon } from '../icons';
import { PageHeader } from '../layouts';

const monthOptions = [
  { value: 1, label: '1 mês' },
  { value: 3, label: '3 meses' },
  { value: 6, label: '6 meses' },
  { value: 12, label: '12 meses' },
];

/** pendência de transação ou de valor a receber, no mesmo formato para uma lista só */
type Pending = {
  key: string;
  label: string;
  detail: string | null;
  amount: number;
  dueDate: string;
  overdue: boolean;
  /** marca/desmarca na API */
  toggle(paid: boolean): Promise<unknown>;
};

/** passo 1: o que já saiu/entrou (evita contar duas vezes) · passo 2: o saldo de cada conta */
type Update = { step: 1 | 2; accounts: Account[]; form: BillingForm; pending: Pending[]; marked: string[] };

const DAY = 24 * 60 * 60 * 1000;

/** "15/11" no ano corrente, "15/11/27" nos outros */
const shortDate = (iso: string) => {
  const date = formatDate(iso);
  return iso.startsWith(String(new Date().getFullYear())) ? date.slice(0, 5) : `${date.slice(0, 6)}${date.slice(8)}`;
};

export function ProjectionPage() {
  const p = useProjection();
  const api = useApi();
  const { state } = useAuth();
  const firstName = state.status === 'signedIn' ? state.user.name.split(/\s+/)[0] : '';

  const fromTransaction = (i: TransactionInstallment): Pending => ({
    key: `t${i.id}`,
    label: i.description,
    detail: i.isFixed ? null : `parcela ${i.number}`,
    amount: signedAmount(i),
    dueDate: i.dueDate,
    overdue: i.overdue,
    toggle: (paid) => api.recurring.setPaid(i.id, paid),
  });
  const fromReceivable = (i: ReceivableInstallment): Pending => ({
    key: `r${i.id}`,
    label: i.description,
    detail: `${i.debtor} · parcela ${i.number}`,
    amount: i.amount,
    dueDate: i.dueDate,
    overdue: i.overdue,
    toggle: (paid) => api.receivables.setPaid(i.id, paid),
  });
  const byDate = (a: Pending, b: Pending) => a.dueDate.localeCompare(b.dueDate);
  const current = [...p.current.transactions.map(fromTransaction), ...p.current.receivables.map(fromReceivable)].sort(byDate);
  const upcoming = [...p.upcoming.transactions.map(fromTransaction), ...p.upcoming.receivables.map(fromReceivable)].sort(byDate);
  const currentTotal = current.reduce((total, i) => total + i.amount, 0);
  const pay = (i: Pending) => p.setPaid(i.toggle, true, `"${i.label}" marcada como ${i.key.startsWith('r') ? 'recebida' : 'paga'}.`);

  // ---------- atualizar saldos ----------
  const [update, setUpdate] = useState<Update | null>(null);
  const start = useAction(async () => {
    const accounts = await p.loadAccounts();
    setUpdate({ step: current.length ? 1 : 2, accounts, form: billingFormFrom(accounts, p.last), pending: current, marked: [] });
  });
  const save = useAction(async () => {
    await p.createBilling(update!.accounts, update!.form);
    setUpdate(null);
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void save.run();
  };
  async function mark(i: Pending, paid: boolean) {
    setUpdate((u) => u && { ...u, marked: paid ? [...u.marked, i.key] : u.marked.filter((k) => k !== i.key) });
    await p.setPaid(i.toggle, paid);
  }

  const previous = new Map(p.last?.entries.map((e) => [e.accountId, e.amount]));
  const newTotal = update?.accounts.reduce((total, a) => total + (a.kind === 'asset' ? 1 : -1) * (parseMoney(update.form[a.id] ?? '') ?? 0), 0) ?? 0;

  const showOnboarding = !!p.projection && !p.balance;

  return (
    <>
      <PageHeader
        title={firstName ? `Olá, ${firstName}` : 'Início'}
        help="Seu saldo de hoje (da última vez que você atualizou os saldos) e quanto vai ter, contando tudo que ainda vai entrar e sair. Atualize os saldos de vez em quando para a conta continuar certa."
        action={
          <Button busy={start.busy} onClick={() => (save.clearError(), start.run())}>
            <Icon name="wallet" className="h-4 w-4" />
            Atualizar saldos
          </Button>
        }
      />
      <NoticeBar notice={p.notice ?? (start.error ? { text: start.error, error: true } : null)} onClose={() => (p.clear(), start.clearError())} />
      {p.error && <NoticeBar notice={{ text: p.error, error: true }} onClose={() => p.reload()} />}

      {showOnboarding && <Onboarding onUpdate={() => start.run()} />}

      {p.balance && p.projection ? (
        <Hero
          today={p.balance.total}
          delta={p.balance.delta}
          updatedAt={p.balance.createdAt}
          projectedFor={p.projection.projectedFor}
          projected={p.projection.projectedAmount}
          monthly={p.monthly}
        />
      ) : (
        !p.projection && (
          <Card>
            <Loading />
          </Card>
        )
      )}

      {p.projection && (!showOnboarding || current.length > 0) && (
        <Card
          title="Este mês"
          help="O que venceu ou vence até o fim do mês. Marque quando pagar ou receber: sai da lista e da projeção."
          action={current.length > 0 && <p className={cx('text-sm font-semibold whitespace-nowrap', ui.amount(currentTotal))}>{signedMoney(currentTotal)}</p>}
        >
          {current.length ? (
            <Collapsible visible={4} phoneOnly>
              {current.map((i) => (
                <PendingRow key={i.key} item={i} onPay={() => pay(i)} />
              ))}
            </Collapsible>
          ) : (
            <Empty>Tudo em dia até o fim do mês.</Empty>
          )}
        </Card>
      )}

      {p.projection && p.breakdown && !showOnboarding && (
        <Disclosure title="Projeção detalhada">
          <Segmented label="Projetar para" value={p.months} options={monthOptions} onChange={p.setMonths} />
          <div>
            <p className={ui.muted}>Em {formatDate(p.projection.projectedFor)} você terá</p>
            <p className={cx(p.projection.projectedAmount < 0 ? ui.bigNegative : ui.big, 'text-3xl tracking-tight')}>{money(p.projection.projectedAmount)}</p>
          </div>
          {/* último saldo + entradas − despesas + a receber = valor projetado */}
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <Breakdown label="Saldo de hoje" cents={p.breakdown.lastTotal} />
            <Breakdown label="Entradas" cents={p.breakdown.incomes} />
            <Breakdown label="Despesas fixas" cents={-p.breakdown.fixedExpenses} />
            <Breakdown label="Parceladas e avulsas" cents={-p.breakdown.variableExpenses} />
            <Breakdown label="A receber" cents={p.breakdown.receivables} />
            <Breakdown label="Diferença" cents={p.breakdown.growth} />
          </dl>
          <p className={ui.small}>Tudo que vence até o fim do mês conta como pago no dia 1, atrasados incluídos.</p>

          {p.monthly && (
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-3">
              <Checkbox checked={p.simulation.on} onChange={p.simulation.setOn} label="Simular um gasto por mês" />
              {p.simulation.on && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-6">
                  <Field className="sm:w-60" label="Quanto vou gastar por mês" prefix="R$" inputMode="numeric" value={p.simulation.spend} mask={maskMoney} onChange={p.simulation.setSpend} />
                  <dl className="grid flex-1 grid-cols-2 gap-2 text-sm">
                    <Breakdown label={`Em ${formatDate(p.projection.projectedFor)}`} cents={p.simulation.projectedAmount} />
                    <Breakdown label="Sobraria por mês" cents={p.simulation.growth} />
                  </dl>
                </div>
              )}
              {p.monthly.goal === null && (
                <p className={ui.small}>
                  Quer saber quanto pode gastar por mês?{' '}
                  <Link to="/perfil" className={ui.link}>
                    Defina sua reserva mensal
                  </Link>
                  .
                </p>
              )}
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="flex flex-col gap-1 border-t border-slate-100 pt-3">
              <p className={ui.label}>Vencem depois deste mês</p>
              <p className={ui.small}>Pagou ou recebeu adiantado? Marque.</p>
              <Collapsible>
                {upcoming.map((i) => (
                  <PendingRow key={i.key} item={i} onPay={() => pay(i)} />
                ))}
              </Collapsible>
            </div>
          )}
        </Disclosure>
      )}

      {p.projection && (p.registrations.length > 0 || p.paid.length > 0) && (
        <Disclosure title="Histórico">
          {p.registrations.length > 0 && (
            <div className="flex flex-col">
              <p className={ui.label}>Atualizações de saldo</p>
              <Collapsible visible={3}>
                {p.registrations.map((r) => (
                  <div key={r.id} className={cx('flex items-start gap-3 py-3 last:border-b-0', ui.divider)}>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className={ui.strong}>{formatDateTime(r.createdAt)}</p>
                      <p className={ui.small}>{r.entries.map((e) => `${e.accountName}: ${money(e.amount)}`).join(' · ')}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end">
                      <p className={ui.strong}>{money(r.total)}</p>
                      <p className={cx('text-sm font-semibold', ui.amount(r.delta ?? 0))}>{deltaText(r.delta)}</p>
                    </div>
                  </div>
                ))}
              </Collapsible>
            </div>
          )}
          {p.paid.length > 0 && (
            <div className="flex flex-col border-t border-slate-100 pt-3">
              <p className={ui.label}>Marcadas nos últimos 30 dias</p>
              <p className={ui.small}>Marcou errado? Desmarque e ela volta para as pendentes.</p>
              <Collapsible>
                {p.paid.map((i) => (
                  <Row key={i.key}>
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <Checkbox checked onChange={() => p.setPaid(i.toggle, false)} ariaLabel={`Desmarcar ${i.label}`} />
                      <div className="flex min-w-0 flex-col gap-1">
                        <p className={ui.strong}>{i.label}</p>
                        <p className={ui.small}>Marcada em {formatDateTime(i.paidAt)}</p>
                      </div>
                    </div>
                    <Amount cents={i.amount} date={i.dueDate} />
                  </Row>
                ))}
              </Collapsible>
            </div>
          )}
        </Disclosure>
      )}

      <Modal open={!!update} title="Atualizar saldos" onClose={() => setUpdate(null)}>
        {update?.step === 1 && (
          <div className="flex flex-col gap-4">
            <Steps step={1} />
            <p className={ui.muted}>Primeiro, marque o que já saiu ou entrou nas suas contas. Assim nada é contado duas vezes.</p>
            <div className="flex flex-col">
              {update.pending.map((i) => (
                <PendingRow key={i.key} item={i} checked={update.marked.includes(i.key)} onPay={(paid) => mark(i, paid)} />
              ))}
            </div>
            <Actions>
              <Button onClick={() => setUpdate({ ...update, step: 2 })}>Continuar</Button>
            </Actions>
          </div>
        )}
        {update?.step === 2 && (
          <form onSubmit={submit} className="flex flex-col gap-4">
            {update.pending.length > 0 && <Steps step={2} />}
            {update.accounts.length ? (
              <>
                <p className={ui.muted}>Quanto tem hoje em cada conta. Nos cartões, o valor da fatura.</p>
                {update.accounts.map((a) => {
                  const before = previous.get(a.id);
                  const now = parseMoney(update.form[a.id] ?? '');
                  const diff = before !== undefined && now !== null ? now - before : 0;
                  return (
                    <Field
                      key={a.id}
                      label={a.kind === 'asset' || /fatura/i.test(a.name) ? a.name : `${a.name} (fatura)`}
                      prefix="R$"
                      inputMode="numeric"
                      value={update.form[a.id] ?? ''}
                      mask={maskMoney}
                      onChange={(v) => setUpdate({ ...update, form: { ...update.form, [a.id]: v } })}
                      hint={before === undefined ? undefined : diff ? `Antes ${money(before)} · ${signedMoney(diff)}` : `Antes ${money(before)}`}
                    />
                  );
                })}
                <div className="flex items-baseline justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <span className={ui.label}>Novo total</span>
                  <span className="flex flex-col items-end">
                    <span className={cx('text-lg font-bold', newTotal < 0 ? 'text-rose-700' : 'text-slate-900')}>{money(newTotal)}</span>
                    {p.last && newTotal !== p.last.total && (
                      <span className={cx('text-xs font-semibold', ui.amount(newTotal - p.last.total))}>{signedMoney(newTotal - p.last.total)}</span>
                    )}
                  </span>
                </div>
              </>
            ) : (
              <p className={ui.text}>
                Nenhuma conta ainda.{' '}
                <Link to="/contas" className={ui.link} onClick={() => setUpdate(null)}>
                  Cadastre suas contas
                </Link>{' '}
                primeiro.
              </p>
            )}
            <FormError error={save.error} />
            <Actions>
              {update.pending.length > 0 && (
                <Button variant="secondary" onClick={() => setUpdate({ ...update, step: 1 })}>
                  Voltar
                </Button>
              )}
              <Button type="submit" busy={save.busy} disabled={!update.accounts.length}>
                Salvar saldos
              </Button>
            </Actions>
          </form>
        )}
      </Modal>
    </>
  );
}

/** os dois números que importam: quanto tem hoje e quanto vai ter */
function Hero({
  today,
  delta,
  updatedAt,
  projectedFor,
  projected,
  monthly,
}: {
  today: number;
  delta: number | null;
  updatedAt: string;
  projectedFor: string;
  projected: number;
  monthly: ReturnType<typeof useProjection>['monthly'];
}) {
  const days = Math.floor((Date.now() - new Date(updatedAt).getTime()) / DAY);
  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-linear-to-br from-slate-900 via-slate-900 to-emerald-900 p-5 text-white shadow-lg shadow-slate-900/10">
      <div className="grid grid-cols-2 gap-4">
        <HeroValue label="Hoje você tem" cents={today}>
          {delta !== null && delta !== 0 && <p className={cx('text-xs font-semibold', delta > 0 ? 'text-emerald-300' : 'text-rose-300')}>{signedMoney(delta)}</p>}
        </HeroValue>
        <HeroValue label={`Em ${formatDate(projectedFor).slice(0, 5)} terá`} cents={projected} />
      </div>
      {monthly && (
        <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-3">
          <HeroSmall label="Sobra por mês" cents={monthly.growth} />
          {monthly.goal !== null && <HeroSmall label="Para gastar no mês" cents={monthly.toSpend ?? 0} />}
        </div>
      )}
      <p className={cx('text-xs', days >= 7 ? 'font-medium text-amber-300' : 'text-slate-400')}>
        {days >= 7 ? `Saldos atualizados há ${days} dias: atualize para a conta ficar certa.` : `Saldos de ${formatDateTime(updatedAt)}`}
      </p>
    </section>
  );
}

function HeroValue({ label, cents, children }: { label: string; cents: number; children?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <p className="text-xs font-medium text-slate-300">{label}</p>
      {/* encolhe com a tela: R$ 128.760,00 ainda cabe lado a lado num celular pequeno */}
      <p className={cx('text-[clamp(1.125rem,5.6vw,1.875rem)] font-bold tracking-tight', cents < 0 ? 'text-rose-300' : 'text-white')}>{money(cents)}</p>
      {children}
    </div>
  );
}

function HeroSmall({ label, cents }: { label: string; cents: number }) {
  return (
    <div className="flex flex-col">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={cx('text-sm font-semibold', cents < 0 ? 'text-rose-300' : 'text-emerald-300')}>{signedMoney(cents)}</p>
    </div>
  );
}

/** primeiro acesso: os três passos que fazem a tela inicial funcionar */
function Onboarding({ onUpdate }: { onUpdate(): void }) {
  const accounts = useAccounts();
  const recurring = useRecurring();
  const steps = [
    { done: !!accounts.data?.length, title: 'Cadastre suas contas', text: 'Banco, carteira e cartão de crédito.', to: '/contas', cta: 'Cadastrar contas' },
    { done: !!recurring.data?.length, title: 'Cadastre o que entra e sai', text: 'Salário, aluguel, assinaturas e parcelas.', to: '/transacoes', cta: 'Cadastrar transações' },
    { done: false, title: 'Atualize seus saldos', text: 'Quanto você tem hoje em cada conta.', cta: 'Atualizar saldos' },
  ];
  const currentStep = steps.findIndex((s) => !s.done);
  const buttonClass = cx(ui.button.base, ui.button.primary, ui.buttonText.base, ui.buttonText.primary, 'min-h-11 self-start shadow-sm');

  return (
    <Card title="Primeiros passos">
      <ol className="flex flex-col gap-1">
        {steps.map((s, index) => {
          const active = index === currentStep;
          return (
            <li key={s.title} className={cx('flex gap-3 rounded-2xl p-3', active && 'bg-emerald-50')}>
              <span
                className={cx(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                  s.done ? 'bg-emerald-600 text-white' : active ? 'bg-white text-emerald-700 ring-2 ring-emerald-600' : 'bg-slate-100 text-slate-400',
                )}
              >
                {s.done ? <Icon name="check" className="h-4 w-4 stroke-[3]" /> : index + 1}
              </span>
              <div className="flex flex-1 flex-col gap-2">
                <div>
                  <p className={cx(ui.strong, s.done && 'text-slate-400 line-through')}>{s.title}</p>
                  {!s.done && <p className={ui.small}>{s.text}</p>}
                </div>
                {active &&
                  (s.to ? (
                    <Link to={s.to} className={buttonClass}>
                      {s.cta}
                    </Link>
                  ) : (
                    <button type="button" onClick={onUpdate} className={cx(buttonClass, 'cursor-pointer')}>
                      {s.cta}
                    </button>
                  ))}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function Steps({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2].map((n) => (
        <span key={n} className={cx('h-1.5 flex-1 rounded-full', n <= step ? 'bg-emerald-600' : 'bg-slate-200')} />
      ))}
      <span className={cx(ui.small, 'whitespace-nowrap')}>Passo {step} de 2</span>
    </div>
  );
}

function PendingRow({ item: i, onPay, checked = false }: { item: Pending; onPay(paid: boolean): void; checked?: boolean }) {
  const income = i.key.startsWith('r') || i.amount > 0;
  return (
    <div className={cx('flex items-center gap-3 py-2.5 last:border-b-0', ui.divider)}>
      <Checkbox checked={checked} onChange={onPay} ariaLabel={`Marcar ${i.label} como ${income ? 'recebida' : 'paga'}`} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <p className={cx(i.overdue ? ui.strongOverdue : ui.strong, 'truncate', checked && 'text-slate-400 line-through')}>{i.label}</p>
          {i.overdue && !checked && <Badge tone="danger">Atrasada</Badge>}
        </div>
        {i.detail && <p className={cx(ui.small, 'truncate')}>{i.detail}</p>}
      </div>
      <Amount cents={i.amount} date={i.dueDate} overdue={i.overdue && !checked} />
    </div>
  );
}

function Breakdown({ label, cents }: { label: string; cents: number }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-slate-50 px-3 py-2.5">
      <dt className={ui.small}>{label}</dt>
      <dd className={cx('font-semibold', ui.amount(cents))}>{signedMoney(cents)}</dd>
    </div>
  );
}

function Amount({ cents, date, overdue }: { cents: number; date: string; overdue?: boolean }) {
  return (
    <div className="flex shrink-0 flex-col items-end">
      <p className={cx('text-sm font-semibold', ui.amount(cents))}>{money(cents)}</p>
      <p className={overdue ? ui.smallOverdue : ui.small}>
        {overdue ? 'venceu' : 'vence'} {shortDate(date)}
      </p>
    </div>
  );
}
