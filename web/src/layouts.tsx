import { cx, ui, useAuth } from '@finapp/shared';
import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router';
import { Icon, type IconName } from './icons';

// mesmas seções das abas do app mobile (mobile/src/app/(app)/_layout.tsx)
export const links: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Início', icon: 'trending-up' },
  { to: '/transacoes', label: 'Transações', icon: 'swap-vertical' },
  { to: '/a-receber', label: 'A receber', icon: 'cash' },
  { to: '/metas', label: 'Metas', icon: 'flag' },
  { to: '/contas', label: 'Contas', icon: 'wallet' },
  { to: '/perfil', label: 'Perfil', icon: 'person' },
];

// no celular o Perfil sai da barra de baixo (cinco abas cabem com folga) e vira o avatar no topo
const tabs = links.filter((l) => l.to !== '/perfil');

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <img src="/favicon.svg" alt="" className="h-8 w-8" />
      <span className={cx('text-lg font-bold tracking-tight text-slate-900', compact && 'lg:inline md:hidden')}>FinApp</span>
    </span>
  );
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cx('flex shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700', className)}>
      {initialsOf(name)}
    </span>
  );
}

export function AuthLayout() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-linear-to-b from-emerald-100/80 to-transparent" />
      <div className="relative flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col items-center gap-3">
          <img src="/favicon.svg" alt="" className="h-14 w-14 rounded-2xl shadow-lg shadow-emerald-900/20" />
          <span className="text-2xl font-bold tracking-tight text-slate-900">FinApp</span>
        </div>
        <div className={cx(ui.card, 'p-6 shadow-xl shadow-slate-900/5 sm:p-8')}>
          <Outlet />
        </div>
      </div>
    </main>
  );
}

/**
 * Celular: barra no topo (logo + avatar do perfil) e abas fixas embaixo, como app nativo.
 * Tablet: trilho lateral com ícone e nome. Desktop: barra lateral completa.
 */
export function AppLayout() {
  const { state } = useAuth();
  const name = state.status === 'signedIn' ? state.user.name : '';

  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-24 shrink-0 flex-col gap-6 border-r border-slate-200 bg-white px-3 py-6 md:flex lg:w-64 lg:px-4">
        <div className="flex justify-center lg:justify-start lg:px-2">
          <Logo compact />
        </div>
        <nav className="flex flex-col gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end
              className={({ isActive }) =>
                cx(
                  'flex flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-center text-xs leading-tight font-medium transition lg:flex-row lg:gap-3 lg:px-3 lg:text-left lg:text-sm',
                  isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
                )
              }
            >
              <Icon name={l.icon} />
              {l.label}
            </NavLink>
          ))}
        </nav>
        {name && (
          <div className="mt-auto hidden items-center gap-3 rounded-xl px-2 lg:flex">
            <Avatar name={name} className="h-9 w-9 text-sm" />
            <span className={cx(ui.text, 'truncate font-medium')}>{name}</span>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-slate-50/85 pt-[env(safe-area-inset-top)] backdrop-blur-lg md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Logo />
            <NavLink to="/perfil" aria-label="Perfil" className={({ isActive }) => cx('rounded-full transition', isActive && 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-50')}>
              {name ? <Avatar name={name} className="h-9 w-9 text-sm" /> : <Icon name="person" className="h-7 w-7 text-slate-500" />}
            </NavLink>
          </div>
        </header>

        {/* embaixo sobra espaço para as abas e para o botão flutuante da página */}
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pt-5 pb-[calc(10rem+env(safe-area-inset-bottom))] md:gap-5 md:px-8 md:py-10 lg:max-w-5xl">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/70 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
      >
        <div className="mx-auto flex max-w-lg">
          {tabs.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end
              className={({ isActive }) =>
                cx('flex flex-1 flex-col items-center gap-1 pt-2 pb-1.5 text-[11px] font-medium transition', isActive ? 'text-emerald-700' : 'text-slate-500')
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cx('flex h-8 w-14 items-center justify-center rounded-full transition', isActive && 'bg-emerald-100')}>
                    <Icon name={l.icon} className="h-[22px] w-[22px]" />
                  </span>
                  {l.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

/**
 * Título da página. No celular a ação principal (o "+ Novo...") vira um botão flutuante acima das
 * abas, ao alcance do polegar; do tablet em diante fica ao lado do título.
 */
export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className={cx(ui.title, 'tracking-tight md:text-3xl')}>{title}</h1>
        {description && <p className={cx(ui.muted, 'max-w-2xl')}>{description}</p>}
      </div>
      {action && (
        <div className="max-md:fixed max-md:right-4 max-md:bottom-[calc(4.75rem+env(safe-area-inset-bottom))] max-md:z-30 max-md:*:rounded-full max-md:*:px-5 max-md:*:shadow-lg max-md:*:shadow-emerald-900/25 md:shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}
