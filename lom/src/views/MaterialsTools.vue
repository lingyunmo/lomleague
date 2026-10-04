<template>
  <section class="materials-tools" :class="{ 'is-light': !darkMode }">
    <div class="tools-inner">
      <nav class="tools-nav" aria-label="工具导航">
        <RouterLink to="/">← 联盟首页</RouterLink>
        <RouterLink to="/tools/coordinates">主世界 / 下界坐标工具 ↗</RouterLink>
        <RouterLink to="/forums">去社区分享建造 ↗</RouterLink>
      </nav>
      <header class="tools-heading">
        <p class="eyebrow">THE BUILDER'S INVENTORY / 02</p>
        <h1>Minecraft <span>用料换算。</span></h1>
        <p>把建造清单换成组数与储存格数。无需登录，只在浏览器内计算，不保存或上传输入。</p>
      </header>
      <div class="planner-grid">
        <section class="materials-card" aria-labelledby="materials-heading">
          <div class="card-heading">
            <div>
              <p class="eyebrow">01 / PLAN YOUR BUILD</p>
              <h2 id="materials-heading">这次，用哪些材料？</h2>
            </div>
            <span class="row-count">{{ rows.length }} / {{ MAX_MATERIAL_ROWS }}</span>
          </div>
          <p id="material-count-help" class="muted">
            每项数量为 0–1,000,000,000 的整数，不支持小数、千位分隔符或科学计数法。名称可留空，最多 80 个字符。
          </p>
          <div class="material-rows">
            <fieldset v-for="(row, index) in rows" :key="row.id" class="material-row">
              <legend>材料 {{ index + 1 }}</legend>
              <label class="material-name"
                >名称<input
                  v-model="row.name"
                  type="text"
                  :aria-label="`第${index + 1}项材料名称`"
                  :aria-invalid="!materialNameIsValid(row.name)"
                  aria-describedby="material-count-help"
                  autocomplete="off"
                  spellcheck="false"
                  placeholder="例如：石砖"
              /></label>
              <label
                >总数量<input
                  v-model="row.amount"
                  type="text"
                  inputmode="numeric"
                  :aria-label="`第${index + 1}项总数量`"
                  :aria-invalid="parseMaterialInteger(row.amount) == null"
                  aria-describedby="material-count-help"
                  autocomplete="off"
                  spellcheck="false"
              /></label>
              <label
                >每组个数<select v-model="row.stackSize" :aria-label="`第${index + 1}项每组个数`">
                  <option value="64">64 个</option>
                  <option value="16">16 个</option>
                  <option value="1">1 个 · 不堆叠</option>
                </select></label
              >
              <button
                type="button"
                class="remove-button"
                :aria-label="`移除第${index + 1}项材料`"
                @click="removeRow(row.id)"
              >
                移除
              </button>
              <p v-if="lineReports[index]" class="line-summary">
                <strong>{{ count(lineReports[index].fullStacks) }} 组</strong> + {{ lineReports[index].remainder }} 个
                <span>占 {{ count(lineReports[index].slots) }} 格</span>
              </p>
              <p v-else class="line-summary invalid">请检查这项材料的名称、数量和每组个数。</p>
            </fieldset>
          </div>
          <p v-if="rows.length === 0" class="muted">添加一项材料开始计算。</p>
          <button type="button" class="add-button" :disabled="rows.length >= MAX_MATERIAL_ROWS" @click="addRow">
            添加材料 <span>＋</span>
          </button>
        </section>
        <section class="packing-card" aria-labelledby="packing-heading">
          <p class="eyebrow">02 / PACK AND GO</p>
          <h2 id="packing-heading">需要带多少？</h2>
          <label class="capacity-input"
            >每个容器的格数<input
              v-model="capacity"
              type="text"
              inputmode="numeric"
              aria-describedby="capacity-help"
              :aria-invalid="!capacityValid"
              autocomplete="off"
              spellcheck="false"
          /></label>
          <p id="capacity-help" class="muted">
            默认 27 格（原版潜影盒 / 单箱）。支持 1–256 格；请填写实际容器容量，不计算容器嵌套。
          </p>
          <div v-if="plan" class="packing-result" aria-live="polite" aria-atomic="true">
            <p class="container-total">
              <output>{{ count(plan.containers) }}</output
              ><span>个容器</span>
            </p>
            <dl>
              <div>
                <dt>材料总数</dt>
                <dd>{{ count(plan.amount) }} 个</dd>
              </div>
              <div>
                <dt>占用格数</dt>
                <dd>{{ count(plan.slots) }} 格</dd>
              </div>
              <div>
                <dt>最后一个容器</dt>
                <dd>{{ plan.containers === 0 ? '无需容器' : `${plan.lastUsed} / ${plan.capacity} 格` }}</dd>
              </div>
              <div>
                <dt>最后剩余空位</dt>
                <dd>{{ plan.freeSlots }} 格</dd>
              </div>
            </dl>
            <div
              v-if="plan.containers > 0"
              class="storage-grid"
              role="img"
              :aria-label="`最后一个容器占 ${plan.lastUsed} 格，共 ${plan.capacity} 格；${plan.containers === 0 ? '不需要容器' : '空余 ' + plan.freeSlots + ' 格'}`"
            >
              <span
                v-for="slot in Math.min(plan.capacity, 54)"
                :key="slot"
                :class="{ occupied: slot <= plan.lastUsed }"
                aria-hidden="true"
              />
            </div>
            <p class="grid-caption">
              {{ plan.containers === 0 ? '没有材料，不需要容器。' : '最后一个容器的格数示意。'
              }}{{ plan.capacity > 54 ? '图示只显示前 54 格，计算包含全部格数。' : '' }}
            </p>
          </div>
          <p v-else class="waiting">等待有效的材料清单。</p>
          <p v-if="(!plan && rows.length > 0) || !capacityValid" role="alert" class="validation">
            请检查材料输入和容器格数；无效输入不会沿用旧结果。
          </p>
          <button type="button" class="copy-button" :disabled="!plan || copying" @click="copyPlan">
            {{ copying ? '正在复制…' : '复制用料清单' }} <span>↗</span>
          </button>
          <p class="copy-feedback" role="status">{{ feedback }}</p>
          <label v-if="plan" class="manual-copy"
            >可手动复制的用料清单<textarea :value="materialPlanText(plan)" readonly rows="5" />
          </label>
        </section>
      </div>
      <footer class="tools-notes">
        <p>每行独立计算，不合并同名材料。各行的余量分别占格，避免把不同物品错误地装进同一格。</p>
        <p>
          此工具不识别物品 ID、配方、背包或特殊组件；支持 1、16、64
          三种常见堆叠上限。模组、特殊物品及容器限制，以游戏内为准。
        </p>
        <p>
          规则参考：<a
            href="https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/containerslot?view=minecraft-bedrock-stable"
            target="_blank"
            rel="noopener noreferrer"
            >物品堆叠上限</a
          >
          ·
          <a
            href="https://www.minecraft.net/en-us/article/block-week--shulker-box"
            target="_blank"
            rel="noopener noreferrer"
            >潜影盒容量与嵌套限制</a
          >。此工具不连接游戏服务器。
        </p>
      </footer>
    </div>
  </section>
</template>
<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import { RouterLink } from 'vue-router';
import { useTheme } from '../composables/useTheme.js';
import {
  MAX_MATERIAL_ROWS,
  MAX_CONTAINER_SLOTS,
  materialLine,
  materialNameIsValid,
  materialPlan,
  materialPlanText,
  parseMaterialInteger,
} from '../utils/minecraftMaterials.js';
const { darkMode } = useTheme();
const rows = ref([
  { id: 0, name: '石砖', amount: '1728', stackSize: '64' },
  { id: 1, name: '玻璃', amount: '64', stackSize: '64' },
]);
const capacity = ref('27'),
  feedback = ref(''),
  copying = ref(false);
let nextId = 2,
  copySequence = 0,
  disposed = false;
const lineReports = computed(() => rows.value.map(materialLine));
const plan = computed(() => materialPlan(rows.value, capacity.value));
const capacityValid = computed(() => {
  const value = parseMaterialInteger(capacity.value, MAX_CONTAINER_SLOTS);
  return value != null && value > 0;
});
const count = (value) => value.toLocaleString('zh-CN');
function addRow() {
  if (rows.value.length < MAX_MATERIAL_ROWS) rows.value.push({ id: nextId++, name: '', amount: '0', stackSize: '64' });
}
function removeRow(id) {
  rows.value = rows.value.filter((row) => row.id !== id);
}
watch(
  [rows, capacity],
  () => {
    copySequence++;
    copying.value = false;
    feedback.value = '';
  },
  { deep: true, flush: 'sync' },
);
onBeforeUnmount(() => {
  disposed = true;
  copySequence++;
});
async function copyPlan() {
  if (!plan.value || copying.value || disposed) return;
  const sequence = ++copySequence;
  const text = materialPlanText(plan.value);
  copying.value = true;
  const isCurrent = () => !disposed && sequence === copySequence;
  try {
    await navigator.clipboard.writeText(text);
    if (isCurrent()) feedback.value = '清单已复制，可以粘贴给一起建造的伙伴。';
  } catch {
    if (isCurrent()) feedback.value = '无法自动复制，请选中下方清单文本手动复制。';
  } finally {
    if (isCurrent()) copying.value = false;
  }
}
</script>
<style scoped>
.materials-tools {
  --tools-line: color-mix(in srgb, var(--color-text-primary) 13%, transparent);
  --materials-error: #ffaaa0;
  color: var(--color-text-primary);
  background: transparent;
  padding: 34px 36px 64px;
  font-family: Inter, 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
}
.materials-tools.is-light {
  --materials-error: #9e2f2f;
}
.tools-inner {
  max-width: 1168px;
  margin: 0 auto;
}
.tools-nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px 20px;
  padding: 8px 0;
  border-bottom: 1px solid var(--tools-line);
}
.tools-nav a {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}
.tools-nav a,
.tools-notes a {
  color: var(--color-text-secondary);
  text-decoration: none;
}
.tools-heading {
  padding: 32px 0 24px;
}
.eyebrow {
  font:
    10px ui-monospace,
    monospace;
  letter-spacing: 0.15em;
  color: var(--color-text-muted);
  margin: 0 0 18px;
}
h1 {
  font-size: clamp(30px, 4vw, 48px);
  letter-spacing: -0.05em;
  line-height: 1.13;
  margin: 0 0 16px;
}
h1 span {
  color: var(--color-portal-accent);
}
.tools-heading > p:last-child,
.muted,
.waiting,
.tools-notes {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.8;
}
.planner-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}
.materials-card,
.packing-card {
  min-width: 0;
  padding: 30px;
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius);
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--shadow-medium);
}
.card-heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 16px;
}
h2 {
  font-size: 22px;
  margin: 0 0 24px;
  letter-spacing: -0.03em;
}
.row-count {
  font:
    11px ui-monospace,
    monospace;
  color: var(--color-text-muted);
  white-space: nowrap;
}
.material-rows {
  display: grid;
  gap: 18px;
  margin: 24px 0;
}
.material-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 14px;
  border: 1px solid var(--tools-line);
  padding: 18px;
  margin: 0;
  min-width: 0;
}
.material-row legend {
  font:
    11px ui-monospace,
    monospace;
  color: var(--color-text-secondary);
  padding: 0 8px;
}
label {
  display: grid;
  gap: 8px;
  min-width: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.material-name,
.line-summary {
  grid-column: 1 / -1;
}
input,
select,
textarea {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid var(--tools-line);
  border-radius: 2px;
  background: var(--color-bg-dark);
  color: var(--color-text-primary);
  font-size: 14px;
  line-height: 1.5;
  font-family: inherit;
}
input,
select {
  min-height: 46px;
}
select {
  font-family: inherit;
}
textarea {
  resize: vertical;
  line-height: 1.7;
  font-size: 12px;
  font-family: ui-monospace, monospace;
}
input[aria-invalid='true'] {
  border-color: var(--materials-error);
}
.remove-button {
  align-self: end;
}
button {
  min-height: 44px;
  border: 1px solid var(--tools-line);
  border-radius: 2px;
  background: transparent;
  color: var(--color-text-primary);
  font: inherit;
  cursor: pointer;
  padding: 10px 14px;
}
button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.add-button,
.copy-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}
.copy-button {
  margin-top: 24px;
  background: var(--color-portal-accent);
  border-color: var(--color-portal-accent);
  color: var(--color-on-accent);
  font-weight: 700;
}
.line-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.line-summary strong {
  color: var(--color-text-primary);
}
.line-summary span {
  margin-left: auto;
  font:
    11px ui-monospace,
    monospace;
}
.capacity-input {
  grid-template-columns: 1fr 100px;
  align-items: center;
}
.container-total {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin: 28px 0;
}
.container-total output {
  font:
    600 clamp(40px, 5vw, 68px)/1 ui-monospace,
    monospace;
  color: var(--color-portal-accent);
  overflow-wrap: anywhere;
}
.container-total span {
  font-size: 13px;
  white-space: nowrap;
}
dl {
  margin: 0;
  display: grid;
  gap: 14px;
}
dl > div {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
}
dt {
  color: var(--color-text-secondary);
}
dd {
  margin: 0;
  font:
    12px ui-monospace,
    monospace;
  overflow-wrap: anywhere;
}
.storage-grid {
  display: grid;
  grid-template-columns: repeat(9, minmax(0, 1fr));
  gap: 4px;
  margin-top: 24px;
}
.storage-grid span {
  aspect-ratio: 1;
  border: 1px solid var(--tools-line);
  background: var(--color-bg-dark);
}
.storage-grid .occupied {
  background: var(--color-portal-accent);
  border-color: var(--color-portal-accent);
}
.grid-caption {
  color: var(--color-text-muted);
  font-size: 11px;
  line-height: 1.7;
}
.copy-feedback {
  min-height: 36px;
  font-size: 12px;
  line-height: 1.6;
}
.validation,
.invalid {
  color: var(--materials-error);
  font-size: 12px;
  line-height: 1.7;
}
.tools-notes {
  margin-top: 26px;
}
a:focus-visible,
button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--color-portal-accent);
  outline-offset: 4px;
}
@media (max-width: 800px) {
  .planner-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 520px) {
  .materials-tools {
    padding: 20px 18px 44px;
  }
  .materials-card,
  .packing-card {
    padding: 22px 18px;
  }
  .material-row {
    padding: 14px;
    grid-template-columns: 1fr 1fr;
  }
  .remove-button {
    grid-column: 1 / -1;
  }
  .container-total output {
    font-size: 40px;
  }
}
</style>
