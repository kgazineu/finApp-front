import { formatMonth, money, signedMoney } from './format';
import type { AccountKind, Receivable, ReceivableKind, RecurringTransaction, TransactionKind } from './types';

export const transactionKindLabel: Record<TransactionKind, string> = { income: 'Entrada', expense: 'Despesa' };
export const accountKindLabel: Record<AccountKind, string> = { asset: 'Conta', liability: 'Cartão ou dívida' };
export const receivableKindLabel: Record<ReceivableKind, string> = { loan: 'Empréstimo', split: 'Conta dividida' };

/** delta do registro de saldo; o primeiro não tem com o que comparar */
export const deltaText = (delta: number | null) => (delta === null ? 'primeiro registro' : signedMoney(delta));

/** soma das parcelas: vale mesmo depois de editar valores */
export const receivableTotal = (r: Receivable) => r.installments.reduce((total, i) => total + i.amount, 0);

/** "3x de R$ 300,00" (pelos valores atuais), com os juros quando há; vazio com uma parcela só */
export function receivableSummary(r: Receivable): string {
  const values = r.installments.map((i) => i.amount);
  if (values.length < 2) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const parcels = `${values.length}x de ${min === max ? money(min) : `${money(min)} a ${money(max)}`}`;
  return r.amountMode === 'total' && r.interestRate ? `${money(r.amount)} + ${r.interestRate}% · ${parcels}` : parcels;
}

/** entrada soma, despesa subtrai */
export const signedAmount = (i: { kind: TransactionKind; amount: number }) => (i.kind === 'income' ? i.amount : -i.amount);

export type Frequency = 'once' | 'monthly' | 'installments';

/** como a regra se repete, em palavras do dia a dia */
export function frequencyOf(t: Pick<RecurringTransaction, 'isFixed' | 'startMonth' | 'endMonth'>): Frequency {
  // variável sem mês final não deveria existir; se vier, aparece como recorrente em vez de quebrar a tela
  return t.isFixed || !t.endMonth ? 'monthly' : t.endMonth === t.startMonth ? 'once' : 'installments';
}

const monthsBetween = (from: string, to: string) => {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
};

/** "Todo mês · dia 5", "10x · dia 15 · 08/2026 a 05/2027", "Uma vez · 10/2026 · fim do mês" */
export function scheduleText(t: RecurringTransaction): string {
  const day = t.dayOfMonth ? `dia ${t.dayOfMonth}` : 'fim do mês';
  const frequency = frequencyOf(t);
  if (frequency === 'once') return `Uma vez · ${formatMonth(t.startMonth)} · ${day}`;
  if (frequency === 'installments') {
    const count = Math.floor(monthsBetween(t.startMonth, t.endMonth!) / t.intervalMonths) + 1;
    return `${count}x · ${day} · ${formatMonth(t.startMonth)} a ${formatMonth(t.endMonth!)}`;
  }
  const every = t.intervalMonths === 1 ? 'Todo mês' : `A cada ${t.intervalMonths} meses`;
  return `${every} · ${day}${t.endMonth ? ` · até ${formatMonth(t.endMonth)}` : ''}`;
}

/** regra que já acabou (o último mês ficou para trás) */
export const recurringEnded = (t: Pick<RecurringTransaction, 'endMonth'>, now = new Date()) =>
  t.endMonth !== null && t.endMonth < `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

/** mesma política de senha da API (internal/user/validation.go) */
export const PASSWORD_HINT = 'Mínimo de 8 caracteres, com letra maiúscula, minúscula, número e caractere especial.';
