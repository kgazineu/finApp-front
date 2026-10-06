import { cx, ui, useAuth } from '@finapp/shared';
import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router';

export const links = [
  { to: '/', label: 'Início' },
  { to: '/transacoes', label: 'Transações' },
  { to: '/a-receber', label: 'A receber' },
  { to: '/contas', label: 'Contas' },
  { to: '/perfil', label: 'Perfil' },
];

function Logo() {
  return (
    <span className="flex items-center gap-2">
      <img src="/favicon.svg" alt="" className="h-8 w-8" />
      <span className="text-lg font-bold text-slate-900">FinApp</span>
    </span>
  );
}

export function AuthLayout() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        <div className={cx(ui.card, 'p-6')}>
          <Outlet />
        </div>
      </div>
    </main>
  );
}

export function AppLayout() {
  const { state } = useAuth();
  const name = state.status === 'signedIn' ? state.user.name : '';

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className={ui.row}>
            <Logo />
            <span className={cx(ui.muted, 'sm:hidden')}>{name}</span>
          </div>
          <nav className="-mx-1 flex gap-1 overflow-x-auto">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end
                className={({ isActive }) =>
                  cx(
                    'rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap',
                    isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100',
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1 className={ui.title}>{title}</h1>
        {description && <p className={ui.muted}>{description}</p>}
      </div>
      {action}
    </div>
  );
}
