// Progresso e previsão das metas. Puro (sem React e sem imports), para web e mobile e para testar direto.

export type TargetStatus = 'done' | 'onTime' | 'late' | 'noForecast' | 'expired';

export type TargetProgress = {
  /** saldo de hoje na base da meta (total ou uma conta), pelo último registro */
  current: number;
  /** 0 a 100 */
  percent: number;
  remaining: number;
  status: TargetStatus;
  /** AAAA-MM em que deve chegar no ritmo do crescimento por mês */
  eta: string | null;
  /** quanto guardar por mês para chegar no prazo */
  perMonth: number | null;
};

type Balance = { total: number; entries: { accountId: number; amount: number }[] };

const monthIndex = (year: number, month0: number) => year * 12 + month0;
const monthIso = (index: number) => `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;

/**
 * O crescimento por mês começa a contar no mês que vem: faltando R$ 1.000 com crescimento de R$ 500,
 * chega em 2 meses. A previsão considera que todo o crescimento vai para esta meta.
 */
export function targetProgress(
  target: { amount: number; deadline: string; accountId: number | null },
  last: Balance | null,
  growth: number,
  now = new Date(),
): TargetProgress {
  const current = !last ? 0 : target.accountId === null ? last.total : (last.entries.find((e) => e.accountId === target.accountId)?.amount ?? 0);
  const remaining = Math.max(0, target.amount - current);
  const percent = Math.min(100, Math.max(0, Math.floor((current / target.amount) * 100)));
  if (remaining === 0) return { current, percent: 100, remaining, status: 'done', eta: null, perMonth: null };

  const thisMonth = monthIndex(now.getFullYear(), now.getMonth());
  const [year, month] = target.deadline.split('-').map(Number);
  const monthsLeft = monthIndex(year, month - 1) - thisMonth; // meses de crescimento até o mês do prazo
  const perMonth = monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : null;

  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (target.deadline < today) return { current, percent, remaining, status: 'expired', eta: null, perMonth: null };
  if (growth <= 0) return { current, percent, remaining, status: 'noForecast', eta: null, perMonth };

  const months = Math.ceil(remaining / growth);
  return { current, percent, remaining, status: months <= monthsLeft ? 'onTime' : 'late', eta: monthIso(thisMonth + months), perMonth };
}
