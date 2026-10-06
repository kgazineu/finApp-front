import { formatMonth, money, signedMoney } from './format';
import type { AccountKind, Receivable, ReceivableKind, RecurringTransaction, TransactionKind } from './types';

export const transactionKindLabel: Record<TransactionKind, string> = { income: 'Entrada', expense: 'Despesa' };
export const accountKindLabel: Record<AccountKind, string> = { asset: 'Ativo', liability: 'Passivo' };
export const receivableKindLabel: Record<ReceivableKind, string> = { loan: 'Empréstimo', split: 'Conta dividida' };

/** delta do registro de saldo; o primeiro não tem com o que comparar */
export const deltaText = (delta: number | null) => (delta === null ? 'primeiro registro' : signedMoney(delta));

/** soma das parcelas: vale mesmo depois de editar valores */
export const receivableTotal = (r: Receivable) => r.installments.reduce((total, i) => total + i.amount, 0);

/** "5 parcelas de R$ 50,00 a R$ 60,00" (pelos valores atuais) e, no modo total, o valor combinado */
export function receivableSummary(r: Receivable): string {
  const values = r.installments.map((i) => i.amount);
  if (!values.length) return money(r.amount);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const parcels = `${values.length === 1 ? '1 parcela' : `${values.length} parcelas`} de ${min === max ? money(min) : `${money(min)} a ${money(max)}`}`;
  if (r.amountMode === 'installment') return parcels;
  return `${money(r.amount)}${r.interestRate ? ` + ${r.interestRate}% de juros` : ''} · ${parcels}`;
}

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
