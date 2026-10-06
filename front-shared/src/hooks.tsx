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
  type AccountForm,
  type BillingForm,
  type InstallmentEditForm,
  type ReceivableEditForm,
  type ReceivableForm,
  type RecurringEditForm,
  type RecurringForm,
} from './forms';
import { money, signedMoney } from './format';
import { signedAmount } from './labels';
import type { Account, Installment, Projection, Receivable, RecurringTransaction, User } from './types';

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
    setState({ status: 'signedOut' });
    await storage.remove().catch(() => {}); // falhar ao limpar não pode impedir a saída
  }, [storage]);

  const api = useMemo(() => createApi(baseUrl, () => token.current, () => void signOut()), [baseUrl, signOut]);

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

/** carrega dados e expõe recarga; `deps` como num useEffect */
export function useQuery<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(load);
  loadRef.current = load;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loadRef.current());
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

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

/** tela principal: projeção, registros de saldo (com delta), pendências e marcadas nos últimos 30 dias */
export function useProjection() {
  const api = useApi();
  const notice = useNotice();
  const [months, setMonths] = useState(1);

  const query = useQuery(async () => {
    const [projection, paidTransactions, paidReceivables] = await Promise.all([
      api.billings.projection(months),
      api.recurring.paid(),
      api.receivables.paid(),
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

    return { projection, paid };
  }, [months]);

  const projection: Projection | null = query.data?.projection ?? null;
  const registrations = projection ? [...projection.billingRegistrations].reverse() : [];
  const last = projection?.billingRegistrations.at(-1) ?? null;

  const breakdown = projection && {
    lastTotal: last?.total ?? 0,
    incomes: sum(projection.pendingTransactions.filter((i) => i.kind === 'income')),
    expenses: sum(projection.pendingTransactions.filter((i) => i.kind === 'expense')),
    receivables: sum(projection.pendingReceivables),
  };

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
    breakdown,
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

export function useAccounts() {
  const api = useApi();
  const notice = useNotice();
  const query = useQuery(() => api.accounts.list());

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
  const query = useQuery(() => api.recurring.list());

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
  const query = useQuery(() => api.receivables.list());

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

