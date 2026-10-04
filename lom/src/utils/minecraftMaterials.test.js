import { describe, expect, it } from 'vitest';
import {
  materialLine,
  materialNameIsValid,
  materialPlan,
  materialPlanText,
  parseMaterialInteger,
} from './minecraftMaterials.js';
const row = (amount = '64', stackSize = '64', name = '石砖') => ({ name, amount, stackSize });

describe('strict material counts', () => {
  it.each(['', ' ', '-1', '-0', '+1', '1.5', '1e3', '1,000', '0x10', 'Infinity', 'NaN', '1000000001'])(
    'rejects %s',
    (input) => {
      expect(parseMaterialInteger(input)).toBeNull();
    },
  );
  it('accepts zero, trimmed digits, leading zeroes and the exact limit', () => {
    expect(parseMaterialInteger('0')).toBe(0);
    expect(parseMaterialInteger(' 00064 ')).toBe(64);
    expect(parseMaterialInteger('1000000000')).toBe(1_000_000_000);
    expect(parseMaterialInteger(null)).toBeNull();
  });
});
describe('independent material packing', () => {
  it('validates names independently from the quantity without changing literal text', () => {
    expect(materialNameIsValid('中文🧱 100% %E4%B8%AD')).toBe(true);
    expect(materialNameIsValid('')).toBe(true);
    expect(materialNameIsValid(null)).toBe(true);
    expect(materialNameIsValid(123)).toBe(false);
    expect(materialNameIsValid('\t石砖')).toBe(false);
    expect(materialNameIsValid('石砖\n')).toBe(false);
    expect(materialLine(row('1', '64', '\n'))).toBeNull();
  });
  it('describes zero amounts without inventing a final container', () => {
    const text = materialPlanText(materialPlan([row('0')]));
    expect(text).toContain('没有材料，不需要容器。');
    expect(text).not.toContain('最后一个占');
  });
  it.each(['1', '16', '64'])('keeps exact full stacks, remainder and slots for size %s', (stack) => {
    const size = Number(stack);
    for (let amount = 0; amount <= 2000; amount++) {
      const line = materialLine(row(String(amount), stack));
      expect(line.fullStacks * size + line.remainder).toBe(amount);
      expect(line.remainder).toBeLessThan(size);
      expect(line.slots).toBe(Math.ceil(amount / size));
    }
  });
  it('counts mixed materials and a partly occupied final container', () => {
    const plan = materialPlan([row('1728'), row('64', '64', '玻璃')]);
    expect(plan).toMatchObject({ amount: 1792, slots: 28, capacity: 27, containers: 2, lastUsed: 1, freeSlots: 26 });
  });
  it('does not invent another container for an exact fill', () => {
    expect(materialPlan([row('1728')])).toMatchObject({ slots: 27, containers: 1, lastUsed: 27, freeSlots: 0 });
  });
  it('needs no container for zero items', () => {
    expect(materialPlan([row('0')])).toMatchObject({ amount: 0, slots: 0, containers: 0, lastUsed: 0, freeSlots: 0 });
  });
  it('does not silently merge equal names or share their partial slots', () => {
    expect(materialPlan([row('1'), row('1')])).toMatchObject({ amount: 2, slots: 2 });
  });
  it('supports user-selected container capacities without inferring game settings', () => {
    expect(materialPlan([row('3456')], '54')).toMatchObject({ containers: 1, lastUsed: 54, freeSlots: 0 });
    expect(materialPlan([row('64')], '1')).toMatchObject({ containers: 1, lastUsed: 1 });
    expect(materialPlan([row('64')], '0')).toBeNull();
    expect(materialPlan([row('64')], '257')).toBeNull();
  });
  it('bounds rows, names and supported stack sizes without truncating emoji or percent text', () => {
    expect(materialPlan([])).toBeNull();
    expect(materialPlan(Array.from({ length: 21 }, () => row()))).toBeNull();
    expect(materialLine(row('1', '32'))).toBeNull();
    expect(materialLine(row('1', '64', '世界🧱 100% %E4%B8%AD')).name).toBe('世界🧱 100% %E4%B8%AD');
    expect(materialLine(row('1', '64', '🧱'.repeat(80)))).not.toBeNull();
    expect(materialLine(row('1', '64', '🧱'.repeat(81)))).toBeNull();
    expect(materialLine(row('1', '64', 'line\nbreak'))).toBeNull();
    expect(materialLine(row('1', '64', ''), 2).name).toBe('材料3');
  });
  it('keeps aggregate arithmetic exact at all supported row limits', () => {
    const plan = materialPlan(
      Array.from({ length: 20 }, () => row('1000000000', '1')),
      '256',
    );
    expect(plan.amount).toBe(20_000_000_000);
    expect(plan.slots).toBe(20_000_000_000);
    expect(plan.containers * plan.capacity - plan.freeSlots).toBe(plan.slots);
    expect(Number.isSafeInteger(plan.containers)).toBe(true);
  });
  it('provides precise plain text and no stale text for invalid plans', () => {
    const text = materialPlanText(materialPlan([row('65', '64', '中文100% %E4%B8%AD')]));
    expect(text).toContain('中文100% %E4%B8%AD：65 个 = 1 组 + 1 个（每组 64 个，占 2 格）');
    expect(text).toContain('按每个容器 27 格，共需 1 个；最后一个占 2 格，空余 25 格');
    expect(text).toContain('不合并同名材料');
    expect(materialPlanText(null)).toBe('');
  });
});
