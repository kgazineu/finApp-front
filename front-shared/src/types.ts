// Contratos da API (finApp-back). Dinheiro sempre em centavos; datas como a API devolve.

export type User = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type Session = {
  token: string;
  tokenType: 'Bearer';
  expiresAt: string;
};

export type AccountKind = 'asset' | 'liability';

export type Account = {
  id: number;
  name: string;
  kind: AccountKind;
  hasYield: boolean;
  createdAt: string;
};

export type AccountInput = Pick<Account, 'name' | 'kind' | 'hasYield'>;

export type BillingEntry = {
  id: number;
  accountId: number;
  accountName: string;
  amount: number;
};

export type BillingRegistration = {
  id: number;
  delta: number;
  total: number;
  entries: BillingEntry[];
  createdAt: string;
};

export type BillingEntryInput = { accountId: number; amount: number };

export type TransactionKind = 'income' | 'expense';

export type RecurringTransaction = {
  id: number;
  description: string;
  kind: TransactionKind;
  isFixed: boolean;
  amount: number;
  startMonth: string; // AAAA-MM
  intervalMonths: number;
  endMonth: string | null;
  dayOfMonth: number | null;
  createdAt: string;
};

export type RecurringCreateInput = {
  description: string;
  kind: TransactionKind;
  isFixed: boolean;
  amount: number;
  startMonth: string;
  intervalMonths?: number;
  installments?: number;
  dayOfMonth?: number;
};

export type RecurringUpdateInput = {
  description: string;
  amount: number;
  dayOfMonth: number | null;
  endMonth: string | null;
};

export type Installment = {
  id: number;
  number: number;
  amount: number;
  dueDate: string; // AAAA-MM-DD
  paidAt: string | null;
  overdue: boolean;
};

export type TransactionInstallment = Installment & {
  transactionId: number;
  description: string;
  kind: TransactionKind;
  isFixed: boolean;
};

export type ReceivableKind = 'split' | 'loan';

export type Receivable = {
  id: number;
  kind: ReceivableKind;
  debtor: string;
  description: string;
  amount: number;
  interestRate: number;
  installments: Installment[];
  createdAt: string;
};

export type ReceivableCreateInput = {
  kind: ReceivableKind;
  debtor: string;
  description: string;
  amount: number;
  interestRate: number;
  installments: number;
  firstDueDate: string;
};

export type ReceivableInstallment = Installment & {
  receivableId: number;
  debtor: string;
  description: string;
};

export type Projection = {
  billingRegistrations: BillingRegistration[];
  projectedFor: string;
  projectedAmount: number;
  pendingTransactions: TransactionInstallment[];
  pendingReceivables: ReceivableInstallment[];
};

export type Message = { message: string };
