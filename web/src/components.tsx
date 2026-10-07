// Componentes de interface da web. O app mobile tem os mesmos componentes, com as mesmas
// props e os mesmos tokens visuais (ui em @finapp/shared); só muda o elemento desenhado.
// O que é só da web (sombra, foco, animação, alvo de toque) fica aqui, para não mexer no mobile.

import { cx, ui, type BadgeTone, type ButtonVariant, type Notice } from '@finapp/shared';
import { Children, isValidElement, useEffect, useState, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from './icons';

export function Button({
  variant = 'primary',
  busy = false,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; busy?: boolean }) {
  const off = disabled || busy;
  return (
    <button
      {...props}
      type={type}
      disabled={off}
      className={cx(
        ui.button.base,
        ui.button[variant],
        ui.buttonText.base,
        ui.buttonText[variant],
        off ? ui.button.disabled : 'cursor-pointer hover:opacity-90 active:scale-[0.98]',
        variant === 'primary' && 'shadow-sm shadow-emerald-900/10',
        'min-h-11 gap-2 transition outline-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-2',
        className,
      )}
    >
      {busy && <Spinner className="h-4 w-4" />}
      {busy ? 'Aguarde…' : children}
    </button>
  );
}

/** botão só com ícone (editar, remover, fechar): 40px de alvo de toque e o nome para leitor de tela */
export function IconButton({
  icon,
  label,
  tone = 'neutral',
  className,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & { icon: IconName; label: string; tone?: 'neutral' | 'danger' }) {
  return (
    <button
      type="button"
      {...props}
      aria-label={label}
      title={label}
      className={cx(
        'flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition',
        'outline-emerald-600 focus-visible:outline-2 active:scale-95',
        tone === 'danger' ? 'hover:bg-rose-50 hover:text-rose-600 active:bg-rose-100' : 'hover:bg-slate-100 hover:text-slate-700 active:bg-slate-200',
        className,
      )}
    >
      <Icon name={icon} className="h-[18px] w-[18px]" />
    </button>
  );
}

/** editar e remover de um item das listas */
export function ItemActions({ name, onEdit, onRemove }: { name: string; onEdit(): void; onRemove(): void }) {
  return (
    <div className="-mr-2 flex shrink-0">
      <IconButton icon="pencil" label={`Editar ${name}`} onClick={onEdit} />
      <IconButton icon="trash" tone="danger" label={`Remover ${name}`} onClick={onRemove} />
    </div>
  );
}

/** botões de um formulário: no celular dividem a largura (fáceis de alcançar), no resto ficam à direita */
export function Actions({ children, start = false }: { children: ReactNode; start?: boolean }) {
  return <div className={cx('flex gap-2 pt-1 *:flex-1 sm:*:flex-none', start ? 'sm:justify-start' : 'sm:justify-end')}>{children}</div>;
}

type FieldProps = {
  label: string;
  value: string;
  onChange(value: string): void;
  /** máscara aplicada a cada digitação (maskMoney, maskDate...) */
  mask?: (value: string) => string;
  hint?: string;
  prefix?: string;
  type?: 'text' | 'email' | 'password';
  inputMode?: 'text' | 'numeric' | 'decimal' | 'email';
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
  autoFocus?: boolean;
  className?: string;
  inputClassName?: string;
};

export function Field({ label, value, onChange, mask, hint, prefix, className, inputClassName, ...input }: FieldProps) {
  return (
    <label className={cx('flex flex-col gap-1.5', className)}>
      <span className={ui.label}>{label}</span>
      <span className="relative flex">
        {prefix && <span className={cx(ui.muted, 'pointer-events-none absolute top-1/2 left-3 -translate-y-1/2')}>{prefix}</span>}
        <input
          {...input}
          value={value}
          onChange={(e) => onChange(mask ? mask(e.target.value) : e.target.value)}
          className={cx(
            ui.input,
            'min-h-12 w-full transition outline-none placeholder:text-slate-400',
            'focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15',
            prefix && 'pl-10',
            inputClassName,
          )}
        />
      </span>
      {hint && <span className={ui.small}>{hint}</span>}
    </label>
  );
}

export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange(value: NoInfer<T>): void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {label && <span className={ui.label}>{label}</span>}
      {/* muitas opções (ex.: uma por conta) rolam para o lado em vez de espremer o texto */}
      <div className={cx(ui.segmentGroup, 'overflow-x-auto [scrollbar-width:none]')} role="radiogroup" aria-label={label}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={cx(
                ui.segment.base,
                active ? ui.segment.active : ui.segment.idle,
                active ? ui.segmentText.active : ui.segmentText.idle,
                active && 'shadow-sm shadow-slate-900/10',
                'flex min-h-10 cursor-pointer justify-center px-3 whitespace-nowrap transition outline-emerald-600 focus-visible:outline-2',
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  ariaLabel,
  disabled,
}: {
  checked: boolean;
  onChange(checked: boolean): void;
  label?: ReactNode;
  /** nome para leitor de tela quando não há rótulo visível */
  ariaLabel?: string;
  disabled?: boolean;
}) {
  return (
    <label className={cx('inline-flex min-h-8 items-center gap-3', disabled ? 'opacity-50' : 'cursor-pointer')}>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        aria-label={ariaLabel}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        className={cx(
          ui.checkbox.base,
          checked ? ui.checkbox.on : ui.checkbox.off,
          'shrink-0 transition peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-600',
        )}
        aria-hidden
      >
        {checked && <Icon name="check" className="h-3.5 w-3.5 stroke-[3] text-white" />}
      </span>
      {label && <span className={ui.text}>{label}</span>}
    </label>
  );
}

export function Card({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx(ui.card, 'flex flex-col gap-3 shadow-sm shadow-slate-900/[0.03] sm:p-5', className)}>
      {(title || action) && (
        <div className={ui.row}>
          {title && <h2 className={cx(ui.subtitle, 'tracking-tight')}>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={cx(ui.badge, ui.badgeTone[tone], ui.badgeText[tone], 'whitespace-nowrap')}>{children}</span>;
}

export function NoticeBar({ notice, onClose }: { notice: Notice; onClose(): void }) {
  if (!notice) return null;
  const tone = notice.error ? 'error' : 'ok';
  return (
    <div className={cx(ui.notice[tone], ui.row, 'animate-fade-in')} role={notice.error ? 'alert' : 'status'}>
      <p className={ui.noticeText[tone]}>{notice.text}</p>
      <button
        type="button"
        onClick={onClose}
        className={cx(ui.noticeText[tone], '-my-2 -mr-2 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-black/5')}
        aria-label="Fechar aviso"
      >
        <Icon name="close" className="h-4 w-4" />
      </button>
    </div>
  );
}

export function FormError({ error }: { error: string | null }) {
  return error ? (
    <p className={ui.error} role="alert">
      {error}
    </p>
  ) : null;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className={cx(ui.muted, 'px-4 py-6 text-center')}>{children}</p>;
}

/**
 * Lista que mostra só os primeiros itens e uma seta para abrir o resto. Com phoneOnly isso vale só no
 * celular (e no PWA); em telas maiores a lista aparece inteira.
 */
export function Collapsible({ children, visible = 2, phoneOnly = false }: { children: ReactNode; visible?: number; phoneOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const items = Children.toArray(children);
  const rest = items.length - visible;
  return (
    <div className="flex flex-col">
      {items.map((item, index) =>
        open || index < visible ? (
          item
        ) : phoneOnly ? (
          <div key={isValidElement(item) ? item.key : index} className="max-sm:hidden">
            {item}
          </div>
        ) : null,
      )}
      {rest > 0 && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className={cx(ui.link, 'flex min-h-11 cursor-pointer items-center justify-center gap-1 pt-1', phoneOnly && 'sm:hidden')}
        >
          {open ? 'Ver menos' : `Ver mais ${rest}`}
          <Icon name="chevron-down" className={cx('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </button>
      )}
    </div>
  );
}

export function Row({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cx('flex items-start justify-between gap-3 py-3 last:border-b-0', ui.divider, className)} />;
}

/** no celular é uma folha que sobe da borda de baixo (com a área segura do iPhone); a partir de sm, um diálogo no centro */
export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose(): void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    // a página atrás não rola junto com o conteúdo da folha
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal
        aria-label={title}
        className="relative flex max-h-[92dvh] w-full max-w-lg animate-sheet-up flex-col rounded-t-3xl bg-white shadow-2xl sm:animate-fade-in sm:rounded-2xl"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-slate-200 sm:hidden" aria-hidden />
        <div className={cx(ui.row, 'shrink-0 px-5 pt-3 pb-2 sm:pt-5')}>
          <h2 className={cx(ui.subtitle, 'tracking-tight')}>{title}</h2>
          <IconButton icon="close" label="Fechar" onClick={onClose} className="-mr-2" />
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto overscroll-contain px-5 pt-1 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5">
          {children}
        </div>
      </div>
    </div>
  );
}

function Spinner({ className }: { className?: string }) {
  return <span className={cx('inline-block animate-spin rounded-full border-2 border-current border-r-transparent', className)} aria-hidden />;
}

export function Loading() {
  return (
    <p className={cx(ui.muted, 'flex items-center justify-center gap-2 py-8')}>
      <Spinner className="h-4 w-4 text-emerald-600" />
      Carregando…
    </p>
  );
}

/** confirmação de ação destrutiva (no mobile é Alert.alert) */
export const confirmAction = (message: string) => Promise.resolve(window.confirm(message));
