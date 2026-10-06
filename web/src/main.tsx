import { AuthProvider, ui, useAuth, type TokenStorage } from '@finapp/shared';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import './index.css';
import { AppLayout, AuthLayout } from './layouts';
import { AccountsPage } from './pages/accounts';
import { ForgotPasswordPage, LoginPage, NewPasswordPage, RegisterPage, ResetCodePage } from './pages/auth';
import { ProfilePage } from './pages/profile';
import { ProjectionPage } from './pages/projection';
import { ReceivablesPage } from './pages/receivables';
import { TransactionsPage } from './pages/transactions';

const TOKEN_KEY = 'finapp.token';

const storage: TokenStorage = {
  get: async () => localStorage.getItem(TOKEN_KEY),
  set: async (token) => localStorage.setItem(TOKEN_KEY, token),
  remove: async () => localStorage.removeItem(TOKEN_KEY),
};

function App() {
  const { state } = useAuth();

  if (state.status === 'loading') return <p className={`${ui.muted} p-8 text-center`}>Carregando…</p>;

  // cada estado só monta as próprias rotas; o resto redireciona
  return state.status === 'signedOut' ? (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/entrar" element={<LoginPage />} />
        <Route path="/cadastro" element={<RegisterPage />} />
        <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
        <Route path="/recuperar-senha/codigo" element={<ResetCodePage />} />
        <Route path="/recuperar-senha/nova-senha" element={<NewPasswordPage />} />
        <Route path="*" element={<Navigate to="/entrar" replace />} />
      </Route>
    </Routes>
  ) : (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<ProjectionPage />} />
        <Route path="/transacoes" element={<TransactionsPage />} />
        <Route path="/a-receber" element={<ReceivablesPage />} />
        <Route path="/contas" element={<AccountsPage />} />
        <Route path="/perfil" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider baseUrl={import.meta.env.VITE_API_URL ?? '/api'} storage={storage}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
