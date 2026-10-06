import { formatMonth } from './format';
import type { AccountKind, ReceivableKind, RecurringTransaction, TransactionKind } from './types';

export const transactionKindLabel: Record<TransactionKind, string> = { income: 'Entrada', expense: 'Despesa' };
export const accountKindLabel: Record<AccountKind, string> = { asset: 'Ativo', liability: 'Passivo' };
export const receivableKindLabel: Record<ReceivableKind, string> = { loan: 'Empréstimo', split: 'Conta dividida' };

/** entrada soma, despesa subtrai */
export const signedAmount = (i: { kind: TransactionKind; amount: number }) => (i.kind === 'income' ? i.amount : -i.amount);

/** "todo mês, dia 5, de 10/2026 sem fim" */
export function scheduleText(t: RecurringTransaction): string {
  const day = t.dayOfMonth ? `dia ${t.dayOfMonth}` : 'sem dia certo';
  if (t.endMonth === t.startMonth) return `Uma vez, em ${formatMonth(t.startMonth)}, ${day}`;
  const every = t.intervalMonths === 1 ? 'Todo mês' : `A cada ${t.intervalMonths} meses`;
  const until = t.endMonth ? `até ${formatMonth(t.endMonth)}` : 'sem fim';
  return `${every}, ${day}, de ${formatMonth(t.startMonth)} ${until}`;
}

/** mesma política de senha da API (internal/user/validation.go) */
export const PASSWORD_HINT = 'Mínimo de 8 caracteres, com letra maiúscula, minúscula, número e caractere especial.';
