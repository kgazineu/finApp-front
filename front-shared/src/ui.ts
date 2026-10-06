// Tokens visuais: as mesmas classes Tailwind servem para a web (Tailwind 4) e para o
// mobile (NativeWind/Tailwind 3). No mobile o texto é estilizado no <Text>, por isso
// container e texto são separados; na web o componente junta os dois.
// Só use utilitários que existem nas duas versões (nada de grid, hover obrigatório ou shadow-xs).

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'ghostDanger';
export type Tone = 'ok' | 'error';

export const ui = {
  page: 'bg-slate-50',
  card: 'rounded-2xl border border-slate-200 bg-white p-4',
  title: 'text-2xl font-bold text-slate-900',
  subtitle: 'text-lg font-semibold text-slate-900',
  text: 'text-sm text-slate-700',
  strong: 'text-sm font-semibold text-slate-900',
  muted: 'text-sm text-slate-500',
  small: 'text-xs text-slate-500',
  label: 'text-sm font-medium text-slate-700',
  input: 'rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900',
  error: 'text-sm text-rose-600',
  big: 'text-4xl font-bold text-slate-900',
  row: 'flex flex-row items-center justify-between gap-3',
  divider: 'border-b border-slate-100',
  link: 'text-sm font-semibold text-emerald-700',

  /** valor com sinal: positivo verde, negativo vermelho */
  amount: (cents: number) => (cents > 0 ? 'text-emerald-700' : cents < 0 ? 'text-rose-700' : 'text-slate-700'),
  overdue: 'text-rose-700',
  // variantes vermelhas inteiras: duas cores na mesma classe brigam pela ordem do CSS
  strongOverdue: 'text-sm font-semibold text-rose-700',
  smallOverdue: 'text-xs text-rose-700',
  bigNegative: 'text-4xl font-bold text-rose-700',

  button: {
    base: 'flex flex-row items-center justify-center rounded-xl px-4 py-3',
    primary: 'bg-emerald-600',
    secondary: 'border border-slate-300 bg-white',
    danger: 'bg-rose-600',
    ghost: 'px-2 py-2',
    ghostDanger: 'px-2 py-2',
    disabled: 'opacity-50',
  },
  buttonText: {
    base: 'text-sm font-semibold',
    primary: 'text-white',
    secondary: 'text-slate-800',
    danger: 'text-white',
    ghost: 'text-emerald-700',
    ghostDanger: 'text-rose-700',
  },

  notice: {
    ok: 'rounded-xl border border-emerald-200 bg-emerald-50 p-3',
    error: 'rounded-xl border border-rose-200 bg-rose-50 p-3',
  },
  noticeText: { ok: 'text-sm text-emerald-800', error: 'text-sm text-rose-800' },

  badge: 'rounded-full px-2 py-0.5',
  badgeTone: {
    neutral: 'bg-slate-100',
    income: 'bg-emerald-100',
    expense: 'bg-rose-100',
    danger: 'bg-rose-600',
  },
  badgeText: {
    neutral: 'text-xs font-medium text-slate-700',
    income: 'text-xs font-medium text-emerald-800',
    expense: 'text-xs font-medium text-rose-800',
    danger: 'text-xs font-medium text-white',
  },

  segmentGroup: 'flex flex-row rounded-xl bg-slate-100 p-1',
  segment: { base: 'flex-1 items-center rounded-lg py-2', active: 'bg-white', idle: '' },
  segmentText: { active: 'text-sm font-semibold text-slate-900', idle: 'text-sm text-slate-500' },

  checkbox: {
    base: 'flex h-6 w-6 items-center justify-center rounded-md border-2',
    on: 'border-emerald-600 bg-emerald-600',
    off: 'border-slate-300 bg-white',
  },
} as const;

export type BadgeTone = keyof typeof ui.badgeTone;
