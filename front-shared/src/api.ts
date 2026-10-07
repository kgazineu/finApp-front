import type {
  Account,
  AccountInput,
  BillingEntryInput,
  BillingRegistration,
  Message,
  Projection,
  InstallmentUpdateInput,
  Receivable,
  ReceivableCreateInput,
  ReceivableInstallment,
  RecurringCreateInput,
  RecurringTransaction,
  RecurringUpdateInput,
  SavingsGoal,
  Session,
  Target,
  TargetInput,
  TransactionInstallment,
  User,
} from './types';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const statusMessages: Record<number, string> = {
  400: 'Dados inválidos',
  401: 'Sessão expirada, entre novamente',
  404: 'Não encontrado',
  409: 'Conflito com dados existentes',
  413: 'Dados grandes demais',
  500: 'Erro interno do servidor, tente novamente',
};

/**
 * Cliente tipado da API. `getToken` é lido a cada chamada; `onUnauthorized`
 * roda quando uma chamada autenticada recebe 401 (token expirado ou revogado);
 * `onWrite` roda depois de toda chamada que não é GET (os dados podem ter mudado).
 */
export function createApi(baseUrl: string, getToken: () => string | null, onUnauthorized: () => void, onWrite: () => void = () => {}) {
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    let res: Response;
    try {
      res = await fetch(baseUrl + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError('Não foi possível conectar ao servidor. Verifique sua conexão.', 0);
    } finally {
      // mesmo com erro: a escrita pode ter chegado ao servidor
      if (method !== 'GET') onWrite();
    }

    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // resposta não-JSON (proxy, HTML de erro): cai na mensagem pelo status
    }

    if (!res.ok) {
      if (res.status === 401 && token) onUnauthorized();
      const message = (data as Partial<Message> | null)?.message;
      const reason = message ?? statusMessages[res.status] ?? `Erro inesperado (${res.status})`;
      throw new ApiError(reason.charAt(0).toUpperCase() + reason.slice(1), res.status);
    }

    return data as T;
  }

  const get = <T>(path: string) => request<T>('GET', path);
  const post = <T>(path: string, body: unknown) => request<T>('POST', path, body);
  const patch = <T>(path: string, body: unknown) => request<T>('PATCH', path, body);
  const put = <T>(path: string, body: unknown) => request<T>('PUT', path, body);
  const del = <T>(path: string) => request<T>('DELETE', path);

  return {
    login: (email: string, password: string) => post<Session>('/sessions', { email, password }),
    register: (name: string, email: string, password: string) => post<User>('/users', { name, email, password }),
    me: async () => (await get<{ data: User[] }>('/users')).data[0],
    updateProfile: (id: string, body: { name?: string; email?: string }) => patch<User>(`/users/${id}`, body),

    passwordReset: {
      request: (email: string) => post<Message>('/password-resets', { email }),
      verify: (email: string, code: string) => post<Message>('/password-resets/verify', { email, code }),
      confirm: (email: string, code: string, password: string) =>
        post<Message>('/password-resets/confirm', { email, code, password }),
    },

    /** metas: o progresso é calculado na tela, pelo último registro de saldos */
    targets: {
      list: () => get<Target[]>('/targets'),
      create: (body: TargetInput) => post<Target>('/targets', body),
      update: (id: number, body: TargetInput) => patch<Target>(`/targets/${id}`, body),
      remove: (id: number) => del<Message>(`/targets/${id}`),
    },

    /** reserva mensal (quanto guardar por mês): só aparece na tela inicial, não muda a projeção */
    savingsGoal: {
      get: () => get<SavingsGoal>('/savings-goal'),
      save: (body: SavingsGoal) => put<SavingsGoal>('/savings-goal', body),
    },

    /** backup de todos os dados do usuário; o arquivo é opaco para o front */
    data: {
      export: () => get<unknown>('/export'),
      /** conta com dados responde 409; `replace` apaga tudo o que existe e grava o arquivo no lugar */
      import: (file: unknown, replace = false) => post<Message>(replace ? '/import?replace=true' : '/import', file),
    },

    accounts: {
      list: () => get<Account[]>('/accounts'),
      create: (body: AccountInput) => post<Account>('/accounts', body),
      update: (id: number, body: AccountInput) => patch<Account>(`/accounts/${id}`, body),
      remove: (id: number) => del<Message>(`/accounts/${id}`),
    },

    billings: {
      projection: (months: number) => get<Projection>(`/billings?months=${months}`),
      create: (entries: BillingEntryInput[]) => post<BillingRegistration>('/billings', { entries }),
    },

    recurring: {
      list: () => get<RecurringTransaction[]>('/recurring-transactions'),
      create: (body: RecurringCreateInput) => post<RecurringTransaction>('/recurring-transactions', body),
      update: (id: number, body: RecurringUpdateInput) =>
        patch<RecurringTransaction>(`/recurring-transactions/${id}`, body),
      remove: (id: number) => del<{ archived: boolean }>(`/recurring-transactions/${id}`),
      paid: () => get<TransactionInstallment[]>('/recurring-transactions/installments/paid'),
      setPaid: (id: number, paid: boolean) => patch<unknown>(`/recurring-transactions/installments/${id}`, { paid }),
    },

    receivables: {
      list: () => get<Receivable[]>('/receivables'),
      create: (body: ReceivableCreateInput) => post<Receivable>('/receivables', body),
      update: (id: number, body: { debtor: string; description: string }) =>
        patch<Receivable>(`/receivables/${id}`, body),
      remove: (id: number) => del<{ archived: boolean }>(`/receivables/${id}`),
      paid: () => get<ReceivableInstallment[]>('/receivables/installments/paid'),
      setPaid: (id: number, paid: boolean) => patch<unknown>(`/receivables/installments/${id}`, { paid }),
      updateInstallment: (id: number, body: InstallmentUpdateInput) =>
        patch<unknown>(`/receivables/installments/${id}`, body),
    },
  };
}

export type Api = ReturnType<typeof createApi>;

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Erro inesperado';
}
