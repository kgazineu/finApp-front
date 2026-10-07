import assert from 'node:assert/strict';
import test from 'node:test';
import { centsToInput, money, formatDate, maskDate, maskMoney, maskMonth, parseDate, parseMoney, parseMonth, splitByMonth } from './format.ts';

test('dinheiro: máscara e conversão para centavos', () => {
  assert.equal(maskMoney('1'), '0,01');
  assert.equal(maskMoney('123456'), '1.234,56');
  assert.equal(maskMoney('R$ 1.234,567'), '12.345,67');
  assert.equal(maskMoney('0'), '0,00'); // dá para informar saldo zero
  assert.equal(maskMoney('0,0'), ''); // apagar "0,00" limpa o campo
  assert.equal(parseMoney('1.234,56'), 123456);
  assert.equal(parseMoney('0,00'), 0);
  assert.equal(parseMoney(''), null);
  assert.equal(centsToInput(650550), '6.505,50');
  assert.equal(money(-0), money(0));
});

test('datas: máscara, validação e formato ISO da API', () => {
  assert.equal(maskDate('31102026'), '31/10/2026');
  assert.equal(maskMonth('102026'), '10/2026');
  assert.equal(parseDate('31/10/2026'), '2026-10-31');
  assert.equal(parseDate('31/02/2026'), null);
  assert.equal(parseMonth('10/2026'), '2026-10');
  assert.equal(parseMonth('13/2026'), null);
  assert.equal(formatDate('2026-10-31'), '31/10/2026');
});

test('pendências: até o fim deste mês ficam em current, o resto em upcoming', () => {
  const due = (...dates: string[]) => dates.map((dueDate) => ({ dueDate }));
  const split = (now: Date) => {
    const { current, upcoming } = splitByMonth(due('2026-09-01', '2026-10-31', '2026-11-01', '2027-01-05'), now);
    return [current.map((i) => i.dueDate), upcoming.map((i) => i.dueDate)];
  };
  assert.deepEqual(split(new Date(2026, 9, 6)), [['2026-09-01', '2026-10-31'], ['2026-11-01', '2027-01-05']]);
  assert.deepEqual(split(new Date(2026, 11, 31)), [['2026-09-01', '2026-10-31', '2026-11-01'], ['2027-01-05']]); // virada do ano
});
