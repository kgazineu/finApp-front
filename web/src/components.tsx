// Componentes de interface da web. O app mobile tem os mesmos componentes, com as mesmas
// props e os mesmos tokens visuais (ui em @finapp/shared); só muda o elemento desenhado.
// O que é só da web (sombra, foco, animação, alvo de toque) fica aqui, para não mexer no mobile.

import { cx, maskDate, maskMonth, parseDate, ui, type BadgeTone, type ButtonVariant, type Notice } from '@finapp/shared';
import { Children, isValidElement, useEffect, useState, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
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

const isoToBr = (iso: string) => iso.split('-').reverse().join('/');
const brToIso = (br: string) => br.split('/').reverse().join('-');

// iOS e Android abrem o seletor nativo; navegador sem suporte (ex.: "month" no Safari de desktop) cai na máscara de texto
const supports = (type: string) => {
  const input = document.createElement('input');
  input.setAttribute('type', type);
  return input.type === type;
};
const nativeDate = supports('date');
const nativeMonth = supports('month');

const pickerClass = cx(
  ui.input,
  'min-h-12 w-full appearance-none bg-white text-left transition outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15',
);

/** data no formato do formulário (DD/MM/AAAA) com o seletor de data do aparelho */
export function DateField({ label, value, onChange, hint, className }: { label: string; value: string; onChange(value: string): void; hint?: string; className?: string }) {
  if (!nativeDate) return <Field label={label} value={value} onChange={onChange} mask={maskDate} placeholder="DD/MM/AAAA" inputMode="numeric" hint={hint} className={className} />;
  return (
    <label className={cx('flex flex-col gap-1.5', className)}>
      <span className={ui.label}>{label}</span>
      <input type="date" value={parseDate(value) ?? ''} onChange={(e) => onChange(e.target.value ? isoToBr(e.target.value) : '')} className={pickerClass} />
      {hint && <span className={ui.small}>{hint}</span>}
    </label>
  );
}

/** mês no formato do formulário (MM/AAAA); vazio pode significar "sem fim" (placeholder) */
export function MonthField({ label, value, onChange, hint, placeholder, className }: { label: string; value: string; onChange(value: string): void; hint?: string; placeholder?: string; className?: string }) {
  if (!nativeMonth) return <Field label={label} value={value} onChange={onChange} mask={maskMonth} placeholder={placeholder ?? 'MM/AAAA'} inputMode="numeric" hint={hint} className={className} />;
  return (
    <label className={cx('flex flex-col gap-1.5', className)}>
      <span className={ui.label}>{label}</span>
      <span className="relative flex">
        <input type="month" value={/^\d{2}\/\d{4}$/.test(value) ? brToIso(value) : ''} onChange={(e) => onChange(e.target.value ? isoToBr(e.target.value) : '')} className={pickerClass} />
        {!value && placeholder && <span className={cx(ui.muted, 'pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400')}>{placeholder}</span>}
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

export function Card({
  title,
  action,
  help,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  /** explicação escondida atrás do ⓘ do título */
  help?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <section className={cx(ui.card, 'flex flex-col gap-3 shadow-sm shadow-slate-900/[0.03] sm:p-5', className)}>
      {(title || action) && (
        <div className={ui.row}>
          <div className="flex min-w-0 items-center gap-1">
            {title && <h2 className={cx(ui.subtitle, 'tracking-tight')}>{title}</h2>}
            {help && title && <HelpButton open={helpOpen} onToggle={() => setHelpOpen(!helpOpen)} topic={title} />}
          </div>
          {action}
        </div>
      )}
      {helpOpen && <HelpText>{help}</HelpText>}
      {children}
    </section>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={cx(ui.badge, ui.badgeTone[tone], ui.badgeText[tone], 'whitespace-nowrap')}>{children}</span>;
}

/** pilha de avisos no topo da tela, acima de tudo (inclusive das folhas) */
function toastRoot() {
  let root = document.getElementById('toasts');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toasts';
    root.className =
      'pointer-events-none fixed inset-x-0 top-0 z-[60] mx-auto flex max-w-md flex-col gap-2 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]';
    document.body.appendChild(root);
  }
  return root;
}

/**
 * Aviso flutuante. Sucesso some sozinho em alguns segundos; erro fica até ser fechado.
 * Com notice.undo aparece o botão "Desfazer".
 */
export function NoticeBar({ notice, onClose }: { notice: Notice; onClose(): void }) {
  useEffect(() => {
    if (!notice || notice.error) return;
    const timer = setTimeout(onClose, notice.undo ? 6000 : 4000);
    return () => clearTimeout(timer);
  }, [notice, onClose]);

  if (!notice) return null;
  const tone = notice.error ? 'error' : 'ok';
  return createPortal(
    <div
      className={cx(
        'pointer-events-auto flex animate-sheet-down items-center gap-3 rounded-2xl py-2.5 pr-2 pl-4 shadow-lg',
        notice.error ? 'bg-rose-600 text-white shadow-rose-900/20' : 'bg-slate-900 text-white shadow-slate-900/20',
      )}
      role={notice.error ? 'alert' : 'status'}
    >
      <Icon name={notice.error ? 'alert' : 'check'} className={cx('h-4 w-4', tone === 'ok' && 'text-emerald-400')} />
      <p className="flex-1 text-sm">{notice.text}</p>
      {notice.undo && (
        <button
          type="button"
          onClick={() => (notice.undo!(), onClose())}
          className="cursor-pointer rounded-lg px-2 py-1.5 text-sm font-semibold text-emerald-300 hover:bg-white/10"
        >
          Desfazer
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/70 hover:bg-white/10"
        aria-label="Fechar aviso"
      >
        <Icon name="close" className="h-4 w-4" />
      </button>
    </div>,
    toastRoot(),
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

/** item de lista que abre a edição ao tocar: a linha inteira é o alvo, com a seta indicando que abre */
export function ListButton({ onClick, children }: { onClick(): void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        '-mx-2 flex w-[calc(100%+1rem)] cursor-pointer items-center gap-3 rounded-xl px-2 py-3 text-left transition',
        'outline-emerald-600 hover:bg-slate-50 focus-visible:outline-2 active:bg-slate-100',
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">{children}</div>
      <Icon name="chevron-right" className="h-4 w-4 text-slate-300" />
    </button>
  );
}

/** seção que abre e fecha (detalhes, histórico, avançado); o resumo fica visível fechado */
export function Disclosure({ title, summary, children, defaultOpen = false }: { title: string; summary?: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={cx(ui.card, 'flex flex-col shadow-sm shadow-slate-900/[0.03] sm:p-5')}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-8 cursor-pointer items-center gap-3 text-left">
        <h2 className={cx(ui.subtitle, 'flex-1 tracking-tight')}>{title}</h2>
        {summary}
        <Icon name="chevron-down" className={cx('h-5 w-5 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="flex animate-fade-in flex-col gap-3 pt-3">{children}</div>}
    </section>
  );
}

/** "Mais opções" dentro de um formulário: campos raros ficam escondidos até pedir */
export function MoreOptions({ children, defaultOpen = false }: { children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className={cx(ui.link, 'flex cursor-pointer items-center gap-1 self-start')}>
        Mais opções
        <Icon name="chevron-down" className={cx('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="flex animate-fade-in flex-col gap-4 rounded-2xl bg-slate-50 p-4">{children}</div>}
    </div>
  );
}

/** ⓘ ao lado de um título: a explicação só aparece para quem pedir */
export function HelpButton({ open, onToggle, topic }: { open: boolean; onToggle(): void; topic: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={`Ajuda: ${topic}`}
      className={cx('flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition', open ? 'bg-emerald-50 text-emerald-700' : 'text-slate-400 hover:bg-slate-100')}
    >
      <Icon name="info" className="h-[18px] w-[18px]" />
    </button>
  );
}

export function HelpText({ children }: { children: ReactNode }) {
  return <div className={cx(ui.muted, 'animate-fade-in rounded-xl bg-emerald-50/60 px-3 py-2.5 text-slate-600')}>{children}</div>;
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

// ---------- confirmação ----------
// Folha do próprio app no lugar do window.confirm (que no iPhone mostra o endereço do site).
// confirmAction é chamada de qualquer lugar; o <ConfirmHost /> montado na raiz desenha a folha.

type ConfirmRequest = { message: string; confirmLabel: string; resolve(ok: boolean): void };
let showConfirm: ((request: ConfirmRequest) => void) | null = null;

/** confirmação de ação destrutiva (no mobile é Alert.alert) */
export const confirmAction = (message: string, confirmLabel = 'Excluir') =>
  new Promise<boolean>((resolve) => (showConfirm ? showConfirm({ message, confirmLabel, resolve }) : resolve(window.confirm(message))));

export function ConfirmHost() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  useEffect(() => {
    showConfirm = setRequest;
    return () => {
      showConfirm = null;
    };
  }, []);
  const answer = (ok: boolean) => {
    request?.resolve(ok);
    setRequest(null);
  };
  return (
    <Modal open={!!request} title="Tem certeza?" onClose={() => answer(false)}>
      <p className={cx(ui.text, 'whitespace-pre-line')}>{request?.message}</p>
      <Actions>
        <Button variant="secondary" onClick={() => answer(false)}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={() => answer(true)}>
          {request?.confirmLabel}
        </Button>
      </Actions>
    </Modal>
  );
}
