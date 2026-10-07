// Componentes de interface da web. O app mobile tem os mesmos componentes, com as mesmas
// props e os mesmos tokens visuais (ui em @finapp/shared); só muda o elemento desenhado.

import { cx, ui, type BadgeTone, type ButtonVariant, type Notice } from '@finapp/shared';
import { Children, isValidElement, useEffect, useState, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';

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
        off ? ui.button.disabled : 'cursor-pointer hover:opacity-90',
        'transition',
        className,
      )}
    >
      {busy ? 'Aguarde…' : children}
    </button>
  );
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
        {prefix && <span className={cx(ui.muted, 'absolute top-1/2 left-3 -translate-y-1/2')}>{prefix}</span>}
        <input
          {...input}
          value={value}
          onChange={(e) => onChange(mask ? mask(e.target.value) : e.target.value)}
          className={cx(ui.input, 'w-full outline-emerald-600', prefix && 'pl-10', inputClassName)}
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
    <div className="flex flex-col gap-1.5">
      {label && <span className={ui.label}>{label}</span>}
      <div className={ui.segmentGroup} role="radiogroup" aria-label={label}>
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
                'flex cursor-pointer justify-center',
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
    <label className={cx('inline-flex items-center gap-2', disabled ? 'opacity-50' : 'cursor-pointer')}>
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
          'shrink-0 peer-focus-visible:outline-2 peer-focus-visible:outline-emerald-600',
        )}
        aria-hidden
      >
        {checked && <span className="text-xs font-bold text-white">✓</span>}
      </span>
      {label && <span className={ui.text}>{label}</span>}
    </label>
  );
}

export function Card({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx(ui.card, 'flex flex-col gap-3', className)}>
      {(title || action) && (
        <div className={ui.row}>
          {title && <h2 className={ui.subtitle}>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={cx(ui.badge, ui.badgeTone[tone], ui.badgeText[tone])}>{children}</span>;
}

export function NoticeBar({ notice, onClose }: { notice: Notice; onClose(): void }) {
  if (!notice) return null;
  const tone = notice.error ? 'error' : 'ok';
  return (
    <div className={cx(ui.notice[tone], ui.row)} role={notice.error ? 'alert' : 'status'}>
      <p className={ui.noticeText[tone]}>{notice.text}</p>
      <button type="button" onClick={onClose} className={cx(ui.noticeText[tone], 'cursor-pointer px-1')} aria-label="Fechar aviso">
        ✕
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
  return <p className={cx(ui.muted, 'py-4 text-center')}>{children}</p>;
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
          className={cx(ui.link, 'flex cursor-pointer items-center justify-center gap-1 pt-2', phoneOnly && 'sm:hidden')}
        >
          {open ? 'Ver menos' : `Ver mais ${rest}`}
          <svg viewBox="0 0 20 20" aria-hidden="true" className={cx('h-4 w-4 transition-transform', open && 'rotate-180')}>
            <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function Row({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cx('flex flex-wrap items-start justify-between gap-3 py-3', ui.divider, className)} />;
}

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose(): void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal
        aria-label={title}
        className="flex max-h-[92vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={ui.row}>
          <h2 className={ui.subtitle}>{title}</h2>
          <button type="button" onClick={onClose} className={cx(ui.muted, 'cursor-pointer px-1 text-lg')} aria-label="Fechar">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Loading() {
  return <p className={cx(ui.muted, 'py-8 text-center')}>Carregando…</p>;
}

/** confirmação de ação destrutiva (no mobile é Alert.alert) */
export const confirmAction = (message: string) => Promise.resolve(window.confirm(message));
