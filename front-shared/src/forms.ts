// Estado dos formulários (sempre texto, igual em web e mobile) e conversão para o corpo da API.
// As funções *Payload validam e lançam Error com a mensagem para o usuário.

import { centsToInput, digits, endOfThisMonth, formatDate, formatMonth, parseDate, parseMoney, parseMonth, thisMonth } from './format';
import type {
  Account,
  AccountInput,
  AccountKind,
  BillingEntryInput,
  BillingRegistration,
  Installment,
  InstallmentUpdateInput,
  ReceivableAmountMode,
  ReceivableCreateInput,
  ReceivableKind,
  RecurringCreateInput,
  RecurringTransaction,
  RecurringUpdateInput,
  SavingsGoal,
  Target,
  TargetInput,
  TransactionKind,
} from './types';

const fail = (message: string): never => {
  throw new Error(message);
};

const required = (value: string, label: string) => value.trim() || fail(`Informe ${label}`);

function positiveMoney(text: string, label = 'o valor'): number {
  const cents = parseMoney(text);
  return cents && cents > 0 ? cents : fail(`Informe ${label}`);
}

/** campo numérico opcional: vazio → undefined */
function optionalInt(text: string, label: string, min: number, max: number): number | undefined {
  if (!digits(text)) return undefined;
  const n = Number(digits(text));
  return n >= min && n <= max ? n : fail(`${label} deve estar entre ${min} e ${max}`);
}

// ---------- conta ----------

export type AccountForm = { name: string; kind: AccountKind; hasYield: boolean };

export const emptyAccountForm = (): AccountForm => ({ name: '', kind: 'asset', hasYield: false });

export const accountToForm = (a: Account): AccountForm => ({ name: a.name, kind: a.kind, hasYield: a.hasYield });

export const accountPayload = (f: AccountForm): AccountInput => ({
  name: required(f.name, 'o nome da conta'),
  kind: f.kind,
  hasYield: f.kind === 'asset' && f.hasYield, // passivo nunca rende
});

// ---------- meta ----------

export type TargetForm = { name: string; amount: string; deadline: string; accountId: number | null };

export const emptyTargetForm = (): TargetForm => ({ name: '', amount: '', deadline: '', accountId: null });

export const targetToForm = (t: Target): TargetForm => ({ name: t.name, amount: centsToInput(t.amount), deadline: formatDate(t.deadline), accountId: t.accountId });

export const targetPayload = (f: TargetForm): TargetInput => ({
  name: required(f.name, 'o nome da meta'),
  amount: positiveMoney(f.amount, 'quanto quer juntar'),
  deadline: parseDate(f.deadline) ?? fail('Informe o prazo como DD/MM/AAAA'),
  accountId: f.accountId,
});

// ---------- reserva mensal ----------

export type SavingsGoalForm = { kind: 'percent' | 'amount'; value: string };

export const savingsGoalToForm = (g: SavingsGoal | null): SavingsGoalForm =>
  g?.amount != null ? { kind: 'amount', value: centsToInput(g.amount) } : { kind: 'percent', value: g?.percent != null ? String(g.percent) : '' };

export function savingsGoalPayload(f: SavingsGoalForm): SavingsGoal {
  if (f.kind === 'amount') return { percent: null, amount: positiveMoney(f.value, 'quanto quer guardar por mês') };
  const percent = optionalInt(f.value, 'A porcentagem', 1, 100);
  return percent === undefined ? fail('Informe a porcentagem') : { percent, amount: null };
}

// ---------- transação planejada ----------

export type RecurringForm = {
  description: string;
  kind: TransactionKind;
  isFixed: boolean;
  amount: string;
  startMonth: string; // MM/AAAA
  intervalMonths: string;
  installments: string;
  dayOfMonth: string;
};

export const emptyRecurringForm = (): RecurringForm => ({
  description: '',
  kind: 'expense',
  isFixed: false,
  amount: '',
  startMonth: thisMonth(),
  intervalMonths: '',
  installments: '',
  dayOfMonth: '',
});

export function recurringPayload(f: RecurringForm): RecurringCreateInput {
  return {
    description: required(f.description, 'a descrição'),
    kind: f.kind,
    isFixed: f.isFixed,
    amount: positiveMoney(f.amount),
    startMonth: parseMonth(f.startMonth) ?? fail('Mês de início deve estar no formato MM/AAAA'),
    intervalMonths: optionalInt(f.intervalMonths, 'O intervalo de meses', 1, 120),
    installments: optionalInt(f.installments, 'A quantidade de vezes', 1, 600),
    dayOfMonth: optionalInt(f.dayOfMonth, 'O dia do mês', 1, 31),
  };
}

export type RecurringEditForm = { description: string; amount: string; dayOfMonth: string; endMonth: string };

export const recurringToEditForm = (t: RecurringTransaction): RecurringEditForm => ({
  description: t.description,
  amount: centsToInput(t.amount),
  dayOfMonth: t.dayOfMonth ? String(t.dayOfMonth) : '',
  endMonth: t.endMonth ? formatMonth(t.endMonth) : '',
});

/** na edição, campo vazio vai como null: sem dia certo / sem fim */
export function recurringUpdatePayload(f: RecurringEditForm): RecurringUpdateInput {
  return {
    description: required(f.description, 'a descrição'),
    amount: positiveMoney(f.amount),
    dayOfMonth: optionalInt(f.dayOfMonth, 'O dia do mês', 1, 31) ?? null,
    endMonth: f.endMonth.trim() ? (parseMonth(f.endMonth) ?? fail('Mês final deve estar no formato MM/AAAA')) : null,
  };
}

// ---------- valor a receber ----------

export type ReceivableForm = {
  kind: ReceivableKind;
  debtor: string;
  description: string;
  amountMode: ReceivableAmountMode;
  amount: string;
  interestRate: string;
  installments: string;
  firstDueDate: string; // DD/MM/AAAA
};

export const emptyReceivableForm = (): ReceivableForm => ({
  kind: 'loan',
  debtor: '',
  description: '',
  amountMode: 'total',
  amount: '',
  interestRate: '',
  installments: '',
  firstDueDate: endOfThisMonth(),
});

export function receivablePayload(f: ReceivableForm): ReceivableCreateInput {
  const split = f.kind === 'split'; // conta dividida: sem juros, uma parcela
  const perInstallment = !split && f.amountMode === 'installment'; // valor fixo por parcela: sem juros
  return {
    kind: f.kind,
    debtor: required(f.debtor, 'quem deve'),
    description: required(f.description, 'a descrição'),
    amount: positiveMoney(f.amount, perInstallment ? 'o valor de cada parcela' : 'o valor'),
    amountMode: perInstallment ? 'installment' : 'total',
    interestRate: split || perInstallment ? 0 : (optionalInt(f.interestRate, 'Os juros', 0, 1000) ?? 0),
    installments: split ? 1 : (optionalInt(f.installments, 'As parcelas', 1, 120) ?? 1),
    firstDueDate: parseDate(f.firstDueDate) ?? fail('Vencimento deve ser uma data válida no formato DD/MM/AAAA'),
  };
}

export type ReceivableEditForm = { debtor: string; description: string };

/** edição de uma parcela; applyToFollowing leva valor e dia às próximas ainda não recebidas */
export type InstallmentEditForm = { amount: string; dueDate: string; applyToFollowing: boolean };

export const installmentToEditForm = (i: Installment): InstallmentEditForm => ({
  amount: centsToInput(i.amount),
  dueDate: formatDate(i.dueDate),
  applyToFollowing: false,
});

export const installmentEditPayload = (f: InstallmentEditForm): InstallmentUpdateInput => ({
  amount: positiveMoney(f.amount),
  dueDate: parseDate(f.dueDate) ?? fail('Vencimento deve ser uma data válida no formato DD/MM/AAAA'),
  applyToFollowing: f.applyToFollowing,
});

export const receivableEditPayload = (f: ReceivableEditForm) => ({
  debtor: required(f.debtor, 'quem deve'),
  description: required(f.description, 'a descrição'),
});

// ---------- registro de saldos ----------

/** saldo de cada conta ativa, por id; já vem com os valores do último registro */
export type BillingForm = Record<number, string>;

export function billingFormFrom(accounts: Account[], last: BillingRegistration | null): BillingForm {
  const previous = new Map(last?.entries.map((e) => [e.accountId, e.amount]));
  return Object.fromEntries(accounts.map((a) => [a.id, previous.has(a.id) ? centsToInput(previous.get(a.id)!) : '']));
}

export function billingPayload(accounts: Account[], form: BillingForm): BillingEntryInput[] {
  if (!accounts.length) fail('Cadastre uma conta antes de registrar saldos');
  return accounts.map((a) => ({
    accountId: a.id,
    amount: parseMoney(form[a.id] ?? '') ?? fail(`Informe o saldo de ${a.name} (pode ser 0,00)`),
  }));
}

// ---------- autenticação ----------

export function passwordsMatch(password: string, confirmation: string) {
  if (password !== confirmation) fail('As senhas não conferem');
}
