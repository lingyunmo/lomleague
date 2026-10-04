export const MAX_MATERIAL_ROWS = 20;
export const MAX_MATERIAL_AMOUNT = 1_000_000_000;
export const MAX_CONTAINER_SLOTS = 256;
const STACK_SIZES = new Set([1, 16, 64]);

export function materialNameIsValid(name) {
  return name == null || (typeof name === 'string' && Array.from(name.trim()).length <= 80 && !/[\r\n\t]/.test(name));
}

export function parseMaterialInteger(value, maximum = MAX_MATERIAL_AMOUNT) {
  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) return null;
  const number = Number(value.trim());
  return Number.isSafeInteger(number) && number >= 0 && number <= maximum ? number : null;
}

export function materialLine(row, index = 0) {
  if (!row || !materialNameIsValid(row.name)) return null;
  const name = row.name?.trim() || `材料${index + 1}`;
  const amount = parseMaterialInteger(row.amount);
  const stackSize = parseMaterialInteger(row.stackSize, 64);
  if (amount == null || !STACK_SIZES.has(stackSize)) return null;
  const fullStacks = Math.floor(amount / stackSize);
  const remainder = amount % stackSize;
  return { name, amount, stackSize, fullStacks, remainder, slots: fullStacks + (remainder > 0 ? 1 : 0) };
}

export function materialPlan(rows, capacityInput = '27') {
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > MAX_MATERIAL_ROWS) return null;
  const capacity = parseMaterialInteger(capacityInput, MAX_CONTAINER_SLOTS);
  if (capacity == null || capacity === 0) return null;
  const lines = rows.map(materialLine);
  if (lines.some((line) => line == null)) return null;
  const amount = lines.reduce((total, line) => total + line.amount, 0);
  const slots = lines.reduce((total, line) => total + line.slots, 0);
  const containers = Math.ceil(slots / capacity);
  const lastUsed = slots === 0 ? 0 : ((slots - 1) % capacity) + 1;
  return { lines, amount, slots, capacity, containers, lastUsed, freeSlots: containers * capacity - slots };
}

export function materialPlanText(plan) {
  if (!plan) return '';
  return [
    'lom 联盟 · 建造用料清单',
    ...plan.lines.map(
      (line) =>
        `${line.name}：${line.amount} 个 = ${line.fullStacks} 组 + ${line.remainder} 个（每组 ${line.stackSize} 个，占 ${line.slots} 格）`,
    ),
    `合计：${plan.amount} 个，占 ${plan.slots} 格`,
    plan.containers === 0
      ? '没有材料，不需要容器。'
      : `按每个容器 ${plan.capacity} 格，共需 ${plan.containers} 个；最后一个占 ${plan.lastUsed} 格，空余 ${plan.freeSlots} 格`,
    '每行独立计算，不合并同名材料，不计算容器嵌套；实际堆叠和容器规则以游戏内为准。',
  ].join('\n');
}
