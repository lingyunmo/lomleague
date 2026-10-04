<template>
  <section class="coordinate-tools">
    <div class="tools-inner">
      <nav class="tools-nav" aria-label="工具导航">
        <RouterLink to="/">← 联盟首页</RouterLink>
        <RouterLink to="/tools/materials">建造用料换算 ↗</RouterLink>
        <RouterLink to="/forums">去社区分享建造 ↗</RouterLink>
      </nav>
      <header class="tools-heading">
        <p class="eyebrow">THE BUILDER'S COMPASS / 01</p>
        <h1>Minecraft <span>坐标工具。</span></h1>
        <p>换算主世界与下界的位置，找到脚下的区块。无需登录，坐标只在你的浏览器内计算。</p>
      </header>
      <div class="tools-grid">
        <section class="input-card" aria-labelledby="coordinate-input-heading">
          <p class="eyebrow">01 / WHERE YOU ARE</p>
          <h2 id="coordinate-input-heading">输入方块坐标</h2>
          <fieldset class="dimension-choice">
            <legend>当前维度</legend>
            <label><input v-model="dimension" type="radio" value="overworld" name="dimension" />主世界</label>
            <label><input v-model="dimension" type="radio" value="nether" name="dimension" />下界</label>
          </fieldset>
          <div class="axis-inputs">
            <label
              >X 坐标<input
                v-model="x"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                spellcheck="false"
                aria-describedby="coordinate-help"
                :aria-invalid="parseBlockCoordinate(x) == null"
            /></label>
            <label
              >Z 坐标<input
                v-model="z"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                spellcheck="false"
                aria-describedby="coordinate-help"
                :aria-invalid="parseBlockCoordinate(z) == null"
            /></label>
          </div>
          <p id="coordinate-help" class="muted">
            使用整数方块坐标，支持 ±30,000,000。只换算 X、Z，Y 高度请在游戏内选择。
          </p>
          <button type="button" class="example-button" @click="negativeExample">试试负坐标 ↗</button>
          <p v-if="!report" role="alert" class="validation">请输入范围内的整数坐标，不支持小数或科学计数法。</p>
        </section>
        <section class="result-card" aria-labelledby="portal-result-heading">
          <p class="eyebrow">02 / ON THE OTHER SIDE</p>
          <h2 id="portal-result-heading">{{ dimension === 'overworld' ? '对应下界坐标' : '对应主世界坐标' }}</h2>
          <div v-if="report" class="portal-result" aria-live="polite" aria-atomic="true">
            <div>
              <span>X</span><output>{{ report.portal.x }}</output>
            </div>
            <div>
              <span>Z</span><output>{{ report.portal.z }}</output>
            </div>
          </div>
          <p v-else class="waiting">等待有效坐标</p>
          <button type="button" class="copy-button" :disabled="!report" @click="copyPosition">
            复制换算坐标 <span>↗</span>
          </button>
          <p class="copy-feedback" role="status">{{ feedback }}</p>
          <p class="muted">
            按原版 8:1 比例计算，保留精确小数，不替你取整。自定义比例、世界边界及传送门配对，以游戏内和服务器设置为准。
          </p>
        </section>
        <section class="chunk-card" aria-labelledby="chunk-heading">
          <div>
            <p class="eyebrow">03 / KNOW YOUR CHUNK</p>
            <h2 id="chunk-heading">当前维度的区块</h2>
            <dl v-if="report" class="chunk-details">
              <div>
                <dt>区块 X / Z</dt>
                <dd>{{ report.chunk.x.index }} / {{ report.chunk.z.index }}</dd>
              </div>
              <div>
                <dt>区块内 X / Z</dt>
                <dd>{{ report.chunk.x.local }} / {{ report.chunk.z.local }}</dd>
              </div>
              <div>
                <dt>X 方块范围</dt>
                <dd>{{ report.chunk.x.start }} 至 {{ report.chunk.x.end }}</dd>
              </div>
              <div>
                <dt>Z 方块范围</dt>
                <dd>{{ report.chunk.z.start }} 至 {{ report.chunk.z.end }}</dd>
              </div>
            </dl>
            <p v-else class="waiting">输入有效坐标后，查看 16 × 16 区块的位置。</p>
          </div>
          <div v-if="report" class="chunk-map-wrap">
            <div
              class="chunk-map"
              role="img"
              :aria-label="`区块俯视图，当前位置 X ${report.chunk.x.local}，Z ${report.chunk.z.local}`"
            >
              <span :style="{ left: `${report.chunk.x.local * 6.25}%`, top: `${report.chunk.z.local * 6.25}%` }" />
            </div>
            <p class="map-caption">左→右：X 0–15 · 上→下：Z 0–15</p>
          </div>
        </section>
      </div>
      <footer class="tools-notes">
        <p>负坐标按向下取整划分区块，例如 X = -1 属于区块 -1，区块内位置为 15。</p>
        <p>
          规则参考：<a
            href="https://learn.microsoft.com/en-us/minecraft/creator/documents/chunkerworldsettings"
            target="_blank"
            rel="noopener noreferrer"
            >维度比例</a
          >
          ·
          <a
            href="https://learn.microsoft.com/en-us/minecraft/creator/documents/simulationrenderdistanceguide"
            target="_blank"
            rel="noopener noreferrer"
            >区块尺寸</a
          >。此工具不连接游戏服务器，不保存输入。
        </p>
      </footer>
    </div>
  </section>
</template>
<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { coordinateReport, parseBlockCoordinate, portalPositionText } from '../utils/minecraftCoordinates.js';

const dimension = ref('overworld'),
  x = ref('1024'),
  z = ref('-2048'),
  feedback = ref('');
const report = computed(() => coordinateReport(x.value, z.value, dimension.value));
let copySequence = 0;
watch([x, z, dimension], () => {
  copySequence++;
  feedback.value = '';
});
onBeforeUnmount(() => {
  copySequence++;
});

function negativeExample() {
  dimension.value = 'overworld';
  x.value = '-1';
  z.value = '-16';
}
async function copyPosition() {
  const text = portalPositionText(report.value);
  if (!text) return;
  const sequence = ++copySequence;
  try {
    await navigator.clipboard.writeText(text);
    if (sequence === copySequence) feedback.value = `已复制：${text}`;
  } catch {
    if (sequence === copySequence) feedback.value = '无法自动复制，请选中上方坐标手动复制。';
  }
}
</script>
<style scoped>
.coordinate-tools {
  --tools-line: color-mix(in srgb, var(--color-text-primary) 13%, transparent);
  color: var(--color-text-primary);
  background: var(--color-bg-dark);
  padding: 34px 36px 64px;
  font-family: Inter, 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
}
.tools-inner {
  max-width: 1168px;
  margin: 0 auto;
}
.tools-nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 0;
  border-bottom: 1px solid var(--tools-line);
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
.waiting {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.8;
}
.tools-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}
.input-card,
.result-card,
.chunk-card {
  min-width: 0;
  padding: 30px;
  border: 1px solid var(--tools-line);
  border-radius: 4px;
  background: color-mix(in srgb, var(--color-text-primary) 3%, var(--color-bg-dark));
}
h2 {
  font-size: 22px;
  margin: 0 0 24px;
  letter-spacing: -0.03em;
}
.dimension-choice {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  border: 0;
  padding: 0;
  margin: 0 0 20px;
}
.dimension-choice legend {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 10px;
}
.dimension-choice label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: 1px solid var(--tools-line);
  cursor: pointer;
  font-size: 13px;
}
.dimension-choice label:has(input:checked) {
  border-color: var(--color-portal-accent);
}
input[type='radio'] {
  accent-color: var(--color-portal-accent);
  margin: 0;
}
.axis-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.axis-inputs label {
  min-width: 0;
  color: var(--color-text-secondary);
  font:
    12px ui-monospace,
    monospace;
}
.axis-inputs input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  display: block;
  background: var(--color-bg-dark);
  border: 1px solid var(--tools-line);
  border-radius: 3px;
  padding: 14px 12px;
  margin-top: 9px;
  color: var(--color-text-primary);
  font:
    18px ui-monospace,
    monospace;
}
.axis-inputs input[aria-invalid='true'] {
  border-color: #df7a69;
}
button {
  font-family: inherit;
  cursor: pointer;
}
.example-button {
  border: 0;
  background: none;
  padding: 12px 0;
  color: var(--color-text-secondary);
  min-height: 44px;
}
.validation {
  color: var(--color-text-primary);
  border-left: 3px solid #df7a69;
  padding-left: 10px;
  font-size: 12px;
  line-height: 1.7;
}
.portal-result {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin: 30px 0;
}
.portal-result > div {
  min-width: 0;
}
.portal-result span {
  display: block;
  color: var(--color-text-muted);
  font:
    12px ui-monospace,
    monospace;
  margin-bottom: 12px;
}
.portal-result output {
  font:
    clamp(20px, 3vw, 42px) ui-monospace,
    monospace;
  color: var(--color-portal-accent);
  overflow-wrap: anywhere;
}
.copy-button {
  display: flex;
  justify-content: space-between;
  width: 100%;
  border: 0;
  min-height: 46px;
  padding: 14px 18px;
  background: var(--color-portal-accent);
  color: var(--color-bg-dark);
  font-size: 13px;
  font-weight: 600;
}
.copy-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.copy-feedback {
  min-height: 20px;
  font-size: 12px;
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}
.chunk-card {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr 240px;
  align-items: center;
  gap: 40px;
}
.chunk-details {
  margin: 0;
}
.chunk-details > div {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 0;
  border-bottom: 1px solid var(--tools-line);
}
.chunk-details dt {
  color: var(--color-text-secondary);
  font-size: 13px;
}
.chunk-details dd {
  margin: 0;
  font:
    14px ui-monospace,
    monospace;
}
.chunk-map {
  aspect-ratio: 1;
  position: relative;
  border: 1px solid var(--tools-line);
  background-image:
    linear-gradient(to right, var(--tools-line) 1px, transparent 1px),
    linear-gradient(to bottom, var(--tools-line) 1px, transparent 1px);
  background-size: 6.25% 6.25%;
}
.chunk-map span {
  position: absolute;
  width: 6.25%;
  height: 6.25%;
  box-sizing: border-box;
  background: var(--color-portal-accent);
  border: 2px solid var(--color-bg-dark);
}
.map-caption {
  text-align: center;
  font:
    10px ui-monospace,
    monospace;
  color: var(--color-text-muted);
}
.tools-notes {
  margin-top: 28px;
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.9;
}
.tools-notes a {
  text-decoration: underline;
  text-underline-offset: 4px;
}
button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 3px solid var(--color-portal-accent);
  outline-offset: 4px;
}
@media (max-width: 700px) {
  .coordinate-tools {
    padding: 18px 22px 42px;
  }
  .tools-heading {
    padding-top: 34px;
  }
  .tools-grid {
    grid-template-columns: 1fr;
  }
  .input-card,
  .result-card,
  .chunk-card {
    padding: 24px;
  }
  .chunk-card {
    grid-template-columns: 1fr;
    gap: 28px;
  }
  .chunk-map-wrap {
    width: 100%;
    max-width: 240px;
    margin: 0 auto;
  }
}
</style>
