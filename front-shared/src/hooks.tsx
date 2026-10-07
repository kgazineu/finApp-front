// Estado e regras das telas, compartilhados entre web e mobile.
// Cada plataforma só desenha: os hooks carregam dados, chamam a API e devolvem mensagens.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createApi, errorMessage, type Api } from './api';
import {
  accountPayload,
  billingPayload,
  receivableEditPayload,
  receivablePayload,
  recurringPayload,
  recurringUpdatePayload,
  installmentEditPayload,
  savingsGoalPayload,
  type AccountForm,
  type BillingForm,
  type InstallmentEditForm,
  type ReceivableEditForm,
  type ReceivableForm,
  type RecurringEditForm,
  type RecurringForm,
  type SavingsGoalForm,
} from './forms';
import { money, parseMoney, signedMoney, splitByMonth } from './format';
import { signedAmount } from './labels';
import type { Account, BillingRegistration, Installment, Projection, Receivable, RecurringTransaction, TransactionInstallment, User } from './types';

// ---------- cache ----------

// Respostas já carregadas, por tela: ao voltar para uma tela os dados aparecem na hora e são
// atualizados por trás. Qualquer escrita na API e a saída da conta apagam tudo.
// ponytail: só em memória; persistir (AsyncStorage/localStorage) se abrir o app do zero ficar lento
const cache = new Map<string, unknown>();
// sobe a cada escrita: resposta pedida antes dela pode estar velha e é descartada
let generation = 0;

export function clearCache() {
  generation++;
  cache.clear();
}

// ---------- autenticação ----------

/** onde o token fica guardado: localStorage na web, SecureStore no celular */
export type TokenStorage = {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  remove(): Promise<void>;
};

type AuthState = { status: 'loading' | 'signedOut' } | { status: 'signedIn'; user: User };

type AuthContextValue = {
  state: AuthState;
  api: Api;
  signIn(email: string, password: string): Promise<void>;
  signUp(name: string, email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  updateProfile(changes: { name: string; email: string }): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ baseUrl, storage, children }: { baseUrl: string; storage: TokenStorage; children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const token = useRef<string | null>(null);

  const signOut = useCallback(async () => {
    token.current = null;
    clearCache(); // os dados da conta não podem aparecer para quem entrar depois
    setState({ status: 'signedOut' });
    await storage.remove().catch(() => {}); // falhar ao limpar não pode impedir a saída
  }, [storage]);

  const api = useMemo(() => createApi(baseUrl, () => token.current, () => void signOut(), clearCache), [baseUrl, signOut]);

  const startSession = useCallback(
    async (value: string) => {
      token.current = value;
      const user = await api.me();
      setState({ status: 'signedIn', user });
    },
    [api],
  );

  // reabre a sessão guardada; token vencido cai no 401 e volta para o login
  useEffect(() => {
    storage
      .get()
      .then((saved) => (saved ? startSession(saved) : signOut()))
      .catch(() => signOut());
  }, [storage, startSession, signOut]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const session = await api.login(email.trim(), password);
      await storage.set(session.token);
      await startSession(session.token);
    },
    [api, storage, startSession],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      api,
      signIn,
      signOut,
      async signUp(name, email, password) {
        await api.register(name.trim(), email.trim(), password);
        await signIn(email, password);
      },
      async updateProfile(changes) {
        if (state.status !== 'signedIn') return;
        const user = await api.updateProfile(state.user.id, { name: changes.name.trim(), email: changes.email.trim() });
        setState({ status: 'signedIn', user });
      },
    }),
    [state, api, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}

export const useApi = () => useAuth().api;

// ---------- utilitários ----------

/**
 * Carrega dados e expõe recarga. `key` identifica a resposta no cache (mude a chave quando os
 * parâmetros mudarem): com ela guardada, a tela abre na hora e atualiza em silêncio; sem ela,
 * mostra carregando.
 */
export function useQuery<T>(key: string, load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(() => (cache.get(key) as T | undefined) ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!cache.has(key));
  const loadRef = useRef(load);
  loadRef.current = load;
  const keyRef = useRef(key);
  keyRef.current = key;

  const refresh = useCallback(
    async (silent: boolean) => {
      const started = generation;
      if (!silent) setLoading(true);
      try {
        const value = await loadRef.current();
        if (started !== generation) return; // houve escrita no meio: o reload pedido depois dela traz o certo
        cache.set(key, value);
        // troca rápida de chave (ex.: meses): resposta de uma chave antiga não aparece na atual
        if (keyRef.current === key) {
          setData(value);
          setError(null);
        }
      } catch (err) {
        if (keyRef.current === key) setError(errorMessage(err));
      } finally {
        if (keyRef.current === key) setLoading(false);
      }
    },
    [key],
  );

  useEffect(() => {
    const cached = cache.get(key) as T | undefined;
    if (cached !== undefined) setData(cached);
    void refresh(cached !== undefined);
  }, [key, refresh]);

  const reload = useCallback(() => refresh(false), [refresh]);

  return { data, error, loading, reload };
}

/** envio de formulário/botão: controla "enviando" e a mensagem de erro; devolve true se deu certo */
export function useAction<A extends unknown[]>(action: (...args: A) => Promise<unknown>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (...args: A) => {
    setBusy(true);
    setError(null);
    try {
      await action(...args);
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { run, busy, error, clearError: () => setError(null) };
}

export type Notice = { text: string; error: boolean } | null;

/** aviso de topo de tela (sucesso ou erro) */
export function useNotice() {
  const [notice, setNotice] = useState<Notice>(null);
  return {
    notice,
    ok: (text: string) => setNotice({ text, error: false }),
    fail: (err: unknown) => setNotice({ text: errorMessage(err), error: true }),
    clear: () => setNotice(null),
  };
}

// ---------- telas ----------

export type PaidItem = {
  key: string;
  label: string;
  amount: number;
  dueDate: string;
  paidAt: string;
  toggle(paid: boolean): Promise<unknown>;
};

/** tela principal: saldo atual, projeção, registros de saldo (com delta), pendências e marcadas nos últimos 30 dias */
export function useProjection() {
  const api = useApi();
  const notice = useNotice();
  const [months, setMonths] = useState(1);

  const query = useQuery(`projection:${months}`, async () => {
    const [projection, paidTransactions, paidReceivables, goal] = await Promise.all([
      api.billings.projection(months),
      api.recurring.paid(),
      api.receivables.paid(),
      api.savingsGoal.get().catch(() => null), // a meta é opcional: sem ela a tela continua
    ]);

    const paid: PaidItem[] = [
      ...paidTransactions.map((i) => ({
        key: `t${i.id}`,
        label: i.description,
        amount: signedAmount(i),
        dueDate: i.dueDate,
        paidAt: i.paidAt!,
        toggle: (p: boolean) => api.recurring.setPaid(i.id, p),
      })),
      ...paidReceivables.map((i) => ({
        key: `r${i.id}`,
        label: `${i.description} (${i.debtor})`,
        amount: i.amount,
        dueDate: i.dueDate,
        paidAt: i.paidAt!,
        toggle: (p: boolean) => api.receivables.setPaid(i.id, p),
      })),
    ].sort((a, b) => b.paidAt.localeCompare(a.paidAt));

    return { projection, paid, goal };
  });

  const projection: Projection | null = query.data?.projection ?? null;
  const registrations = projection ? [...projection.billingRegistrations].reverse() : [];
  const last = projection?.billingRegistrations.at(-1) ?? null;

  /** o que compõe o valor projetado: tudo até o fim do mês da projeção */
  const expenses = projection?.pendingTransactions.filter((i) => i.kind === 'expense') ?? [];
  const breakdown = projection && {
    lastTotal: last?.total ?? 0,
    incomes: sum(projection.pendingTransactions.filter((i) => i.kind === 'income')),
    fixedExpenses: sum(expenses.filter((i) => i.isFixed)),
    variableExpenses: sum(expenses.filter((i) => !i.isFixed)),
    receivables: sum(projection.pendingReceivables),
  };

  // o mês que vem: a meta e o "para gastar" só aparecem na tela, não mudam a projeção
  const goal = query.data?.goal ?? null;
  const growth = projection?.monthlyGrowth ?? 0;
  const goalAmount = goal?.percent != null ? Math.max(0, Math.round((growth * goal.percent) / 100)) : (goal?.amount ?? null);

  // simulação de um gasto por mês: só conta na tela, nada vai para a API
  const [simulating, setSimulating] = useState(false);
  const [spend, setSpend] = useState('');
  const spendCents = parseMoney(spend) ?? 0;

  // pendência de verdade é o que já venceu ou vence até o fim deste mês; o que vence depois só entra
  // na conta da projeção (com "1 mês", o salário do mês que vem não é pendência)
  const transactions = splitByMonth(projection?.pendingTransactions ?? []);
  const receivables = splitByMonth(projection?.pendingReceivables ?? []);

  /** marca/desmarca parcela; a projeção é recalculada em seguida */
  async function setPaid(toggle: (paid: boolean) => Promise<unknown>, paid: boolean) {
    try {
      await toggle(paid);
      await query.reload();
    } catch (err) {
      notice.fail(err);
    }
  }

  return {
    ...query,
    ...notice,
    months,
    setMonths,
    projection,
    registrations,
    last,
    balance: last ? balanceOf(last) : null,
    breakdown,
    /** o mês que vem (null com API antiga): recebimento, o que sobra, meta e quanto dá para gastar */
    monthly: projection?.monthlyGrowthMonth
      ? {
          month: projection.monthlyGrowthMonth,
          receivables: projection.monthlyReceivables ?? 0,
          growth,
          goal: goalAmount,
          goalPercent: goal?.percent ?? null,
          toSpend: goalAmount === null ? null : growth - goalAmount,
        }
      : null,
    /** tira um gasto por mês da projeção (vezes os meses escolhidos), só na tela */
    simulation: {
      on: simulating,
      setOn: setSimulating,
      spend,
      setSpend,
      projectedAmount: (projection?.projectedAmount ?? 0) - spendCents * months,
      growth: growth - spendCents,
    },
    /** pendentes agora: vencidas e do mês atual (não mudam com os meses da projeção) */
    current: {
      transactions: transactions.current,
      receivables: receivables.current,
      transactionsTotal: signedSum(transactions.current),
      receivablesTotal: sum(receivables.current),
    },
    /** vencem depois deste mês e até o fim do mês da projeção */
    upcoming: {
      transactions: transactions.upcoming,
      receivables: receivables.upcoming,
      total: signedSum(transactions.upcoming) + sum(receivables.upcoming),
    },
    paid: query.data?.paid ?? [],
    payTransaction: (id: number, paid: boolean) => setPaid((p) => api.recurring.setPaid(id, p), paid),
    payReceivable: (id: number, paid: boolean) => setPaid((p) => api.receivables.setPaid(id, p), paid),
    setPaid,
    /** contas ativas para o formulário de novo registro */
    loadAccounts: () => api.accounts.list(),
    async createBilling(accounts: Account[], form: BillingForm) {
      const reg = await api.billings.create(billingPayload(accounts, form));
      const delta = reg.delta === null ? ' (primeiro registro, ainda sem delta)' : `, delta ${signedMoney(reg.delta)}`;
      notice.ok(`Registro #${reg.id} criado: total ${money(reg.total)}${delta}.`);
      await query.reload();
    },
  };
}

const sum = (items: { amount: number }[]) => items.reduce((total, i) => total + i.amount, 0);
/** entradas − despesas */
const signedSum = (items: TransactionInstallment[]) => items.reduce((total, i) => total + signedAmount(i), 0);

/** saldo atual = último registro de saldos, separado em contas e faturas (o delta é null no primeiro) */
function balanceOf(reg: BillingRegistration) {
  const accounts = reg.entries.filter((e) => e.accountKind === 'asset');
  const bills = reg.entries.filter((e) => e.accountKind === 'liability');
  return { total: reg.total, delta: reg.delta, createdAt: reg.createdAt, accounts, bills, accountsTotal: sum(accounts), billsTotal: sum(bills) };
}

/** meta de guardar por mês (perfil): só um número para a tela inicial */
export function useSavingsGoal() {
  const api = useApi();
  const notice = useNotice();
  const query = useQuery('savingsGoal', () => api.savingsGoal.get());

  return {
    ...query,
    ...notice,
    async save(form: SavingsGoalForm) {
      await api.savingsGoal.save(savingsGoalPayload(form));
      notice.ok('Meta salva. Ela aparece na tela inicial, junto da projeção.');
      await query.reload();
    },
    async remove() {
      await api.savingsGoal.save({ percent: null, amount: null });
      notice.ok('Meta removida.');
      await query.reload();
    },
  };
}

export function useAccounts() {
  const api = useApi();
  const notice = useNotice();
  const query = useQuery('accounts', () => api.accounts.list());

  return {
    ...query,
    ...notice,
    async save(form: AccountForm, id?: number) {
      const body = accountPayload(form);
      const a = id ? await api.accounts.update(id, body) : await api.accounts.create(body);
      notice.ok(`Conta "${a.name}" ${id ? 'atualizada' : 'criada'}.`);
      await query.reload();
    },
    async remove(a: Account) {
      try {
        const res = await api.accounts.remove(a.id);
        notice.ok(
          res.message === 'conta arquivada'
            ? `"${a.name}" foi arquivada: ela já aparece em registros de saldo, então o histórico ficou guardado.`
            : `"${a.name}" foi apagada.`,
        );
        await query.reload();
      } catch (err) {
        notice.fail(err);
      }
    },
  };
}

export function useRecurring() {
  const api = useApi();
  const notice = useNotice();
  const query = useQuery('recurring', () => api.recurring.list());

  return {
    ...query,
    ...notice,
    async create(form: RecurringForm) {
      const t = await api.recurring.create(recurringPayload(form));
      notice.ok(`"${t.description}" cadastrada.`);
      await query.reload();
    },
    async update(t: RecurringTransaction, form: RecurringEditForm) {
      const updated = await api.recurring.update(t.id, recurringUpdatePayload(form));
      notice.ok(`"${updated.description}" atualizada.`);
      await query.reload();
    },
    async remove(t: RecurringTransaction) {
      try {
        const res = await api.recurring.remove(t.id);
        notice.ok(
          res.archived
            ? `"${t.description}" arquivada: as parcelas já pagas ficaram guardadas.`
            : `"${t.description}" apagada.`,
        );
        await query.reload();
      } catch (err) {
        notice.fail(err);
      }
    },
  };
}

export function useReceivables() {
  const api = useApi();
  const notice = useNotice();
  const query = useQuery('receivables', () => api.receivables.list());

  return {
    ...query,
    ...notice,
    async create(form: ReceivableForm) {
      const r = await api.receivables.create(receivablePayload(form));
      notice.ok(`"${r.description}" cadastrado.`);
      await query.reload();
    },
    async update(r: Receivable, form: ReceivableEditForm) {
      const updated = await api.receivables.update(r.id, receivableEditPayload(form));
      notice.ok(`"${updated.description}" atualizado.`);
      await query.reload();
    },
    async remove(r: Receivable) {
      try {
        const res = await api.receivables.remove(r.id);
        notice.ok(
          res.archived
            ? `"${r.description}" arquivado: as parcelas já recebidas ficaram guardadas.`
            : `"${r.description}" apagado.`,
        );
        await query.reload();
      } catch (err) {
        notice.fail(err);
      }
    },
    async setPaid(installmentId: number, paid: boolean) {
      try {
        await api.receivables.setPaid(installmentId, paid);
        await query.reload();
      } catch (err) {
        notice.fail(err);
      }
    },
    async updateInstallment(installment: Installment, form: InstallmentEditForm) {
      const body = installmentEditPayload(form);
      await api.receivables.updateInstallment(installment.id, body);
      notice.ok(
        body.applyToFollowing
          ? `Parcela ${installment.number} e as próximas em aberto atualizadas.`
          : `Parcela ${installment.number} atualizada.`,
      );
      await query.reload();
    },
  };
}

