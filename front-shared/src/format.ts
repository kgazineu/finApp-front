// Formatação e máscaras pt-BR. A API trabalha em centavos e em datas ISO;
// a tela mostra R$ 1.234,56, DD/MM/AAAA e MM/AAAA. Sem dependências: roda em web e mobile.

const pad = (n: number) => String(n).padStart(2, '0');

export const digits = (text: string) => text.replace(/\D/g, '');

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const decimal = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 650550 → "R$ 6.505,50" */
export const money = (cents: number) => currency.format((cents || 0) / 100); // || 0: sem "-R$ 0,00"

/** com sinal explícito: +R$ 10,00 / -R$ 10,00 */
export const signedMoney = (cents: number) => (cents > 0 ? '+' : '') + money(cents);

/** máscara de digitação: "123456" → "1.234,56" (os dígitos entram pela direita) */
export function maskMoney(text: string): string {
  const d = digits(text).slice(0, 13);
  // "0,0" só aparece apagando "0,00": limpa o campo em vez de prender no zero
  if (!d || (d.length === 2 && Number(d) === 0)) return '';
  return decimal.format(Number(d) / 100);
}

/** "1.234,56" → 123456; vazio → null */
export function parseMoney(text: string): number | null {
  const d = digits(text);
  return d ? Number(d) : null;
}

/** 123456 → "1.234,56" (valor inicial de campo) */
export const centsToInput = (cents: number) => decimal.format(cents / 100);

/** "31102026" → "31/10/2026" */
export function maskDate(text: string): string {
  const d = digits(text).slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/');
}

/** "102026" → "10/2026" */
export function maskMonth(text: string): string {
  const d = digits(text).slice(0, 6);
  return [d.slice(0, 2), d.slice(2)].filter(Boolean).join('/');
}

/** "31/10/2026" → "2026-10-31"; data impossível (31/02) → null */
export function parseDate(text: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const [, day, month, year] = m.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** "10/2026" → "2026-10" */
export function parseMonth(text: string): string | null {
  const m = /^(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) return null;
  return `${m[2]}-${m[1]}`;
}

/** "2026-10-31" → "31/10/2026" (sem passar por Date: evita erro de fuso) */
export const formatDate = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');

/** "2026-10" → "10/2026" */
export const formatMonth = (iso: string) => iso.slice(0, 7).split('-').reverse().join('/');

/** RFC 3339 → "03/10/2026 19:47" no fuso do aparelho */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function thisMonth(now = new Date()): string {
  return `${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
}

export function endOfThisMonth(now = new Date()): string {
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return `${pad(last.getDate())}/${pad(last.getMonth() + 1)}/${last.getFullYear()}`;
}
