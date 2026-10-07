import assert from 'node:assert/strict';
import test from 'node:test';
import { targetProgress } from './targets.ts';

const now = new Date(2026, 9, 7); // 07/10/2026
const last = { total: 771949, entries: [{ accountId: 2, amount: 848684 }, { accountId: 3, amount: 76735 }] };
const growth = 564618; // R$ 5.646,18 por mês

test('metas: progresso pelo saldo total ou de uma conta', () => {
  const total = targetProgress({ amount: 1000000, deadline: '2027-06-30', accountId: null }, last, growth, now);
  assert.deepEqual([total.current, total.percent, total.remaining], [771949, 77, 228051]);
  assert.equal(targetProgress({ amount: 1000000, deadline: '2027-06-30', accountId: 2 }, last, growth, now).current, 848684);
  assert.equal(targetProgress({ amount: 1000000, deadline: '2027-06-30', accountId: 9 }, last, growth, now).current, 0); // conta fora do registro
  assert.equal(targetProgress({ amount: 1000000, deadline: '2027-06-30', accountId: null }, null, growth, now).current, 0); // sem registro
  assert.equal(targetProgress({ amount: 500000, deadline: '2027-06-30', accountId: 2 }, last, growth, now).status, 'done');
});

test('metas: previsão pelo crescimento por mês e quanto guardar para chegar no prazo', () => {
  // faltam R$ 2.280,51: um mês de crescimento basta, chega em 11/2026; até 06/2027 são 8 meses
  const soon = targetProgress({ amount: 1000000, deadline: '2027-06-30', accountId: null }, last, growth, now);
  assert.deepEqual([soon.status, soon.eta, soon.perMonth], ['onTime', '2026-11', 28507]);
  // faltam R$ 42.280,51: são 8 meses de crescimento, mas o prazo é 12/2026 (2 meses)
  const far = targetProgress({ amount: 5000000, deadline: '2026-12-31', accountId: null }, last, growth, now);
  assert.deepEqual([far.status, far.eta, far.perMonth], ['late', '2027-06', 2114026]);
  assert.equal(targetProgress({ amount: 5000000, deadline: '2027-12-31', accountId: null }, last, 0, now).status, 'noForecast');
  assert.equal(targetProgress({ amount: 5000000, deadline: '2026-09-30', accountId: null }, last, growth, now).status, 'expired');
});
