<template>
  <div class="block-world" aria-hidden="true">
    <svg viewBox="0 0 640 540" role="presentation">
      <defs>
        <pattern
          id="world-grid"
          width="48"
          height="28"
          patternUnits="userSpaceOnUse"
          patternTransform="translate(0 290)"
        >
          <path d="M0 14 24 0 48 14 24 28Z" fill="none" stroke="currentColor" stroke-width=".5" />
        </pattern>
        <radialGradient id="world-light">
          <stop stop-color="var(--color-brand-primary)" stop-opacity=".18" />
          <stop offset="1" stop-color="var(--color-brand-primary)" stop-opacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="330" cy="310" rx="290" ry="220" fill="url(#world-light)" />
      <path d="M20 345 325 170 625 345 325 520Z" fill="url(#world-grid)" opacity=".4" />
      <ellipse cx="335" cy="420" rx="150" ry="35" fill="#000" opacity=".2" />
      <g class="island">
        <g v-for="(block, i) in blocks" :key="i" :transform="`translate(${block.x},${block.y})`">
          <path d="M0 0 24 -14 48 0 24 14Z" :fill="block.top" stroke="#131e1a" stroke-width=".7" />
          <path d="M0 0 24 14 24 50 0 36Z" :fill="block.left" stroke="#131e1a" stroke-width=".7" />
          <path d="M24 14 48 0 48 36 24 50Z" :fill="block.right" stroke="#131e1a" stroke-width=".7" />
          <path v-if="block.grass" d="M0 0 24 14 48 0 48 7 24 21 0 7Z" fill="#538c4d" />
        </g>
        <path d="M301 276 316 268 331 276 316 285Z" fill="#d5e8b7" />
        <path d="M301 276 316 285 316 326 301 317Z" fill="#76926a" />
        <path d="M316 285 331 276 331 317 316 326Z" fill="#456341" />
        <path d="M279 233 319 210 359 233 319 256Z" fill="#a5d766" />
        <path d="M279 233 319 256 319 286 279 263Z" fill="#568741" />
        <path d="M319 256 359 233 359 263 319 286Z" fill="#386638" />
        <path d="M291 209 319 193 347 209 319 225Z" fill="#b9ea76" />
        <path d="M291 209 319 225 319 249 291 233Z" fill="#648e43" />
        <path d="M319 225 347 209 347 233 319 249Z" fill="#436d35" />
        <path d="M408 306 430 293 452 306 430 319Z" fill="#eae5c7" />
        <path d="M408 306 430 319 430 345 408 332Z" fill="#9a987f" />
        <path d="M430 319 452 306 452 332 430 345Z" fill="#676f61" />
      </g>
      <g fill="var(--color-brand-primary)">
        <rect x="120" y="153" width="4" height="4" />
        <rect x="471" y="113" width="5" height="5" />
        <rect x="529" y="255" width="3" height="3" />
      </g>
      <path d="M478 175h12m-6 -6v12M166 270h8m-4 -4v8" stroke="var(--color-brand-secondary)" />
      <path
        d="M385 128v46l50 29M191 397l-31 18h-56"
        stroke="var(--color-brand-primary)"
        stroke-dasharray="3 5"
        opacity=".5"
        fill="none"
      />
    </svg>
    <span class="world-label"><i /> WORLD / LOM · SINCE 2014</span>
    <span class="world-caption">下一块方块，属于你。</span>
  </div>
</template>

<script setup>
const blocks = [];
for (let row = 0; row < 6; row++) {
  for (let col = 0; col < 7; col++) {
    if ((row === 0 && (col < 2 || col > 4)) || (row === 5 && (col < 1 || col > 5))) continue;
    const water = col > 4 && row < 4;
    blocks.push({
      x: 285 + (col - row) * 24,
      y: 285 + (col + row) * 14 - (water ? 0 : 12),
      grass: !water,
      top: water ? '#6fabb7' : ['#a7c872', '#8bb665', '#bad984'][(col + row) % 3],
      left: water ? '#3c6a7a' : '#6c634d',
      right: water ? '#315469' : '#494d3c',
    });
  }
}
</script>

<style scoped>
.block-world {
  position: relative;
  width: 100%;
  color: var(--color-brand-secondary);
}
svg {
  width: 100%;
  display: block;
}
.island {
  animation: drift 8s ease-in-out infinite;
}
.world-label {
  position: absolute;
  top: 12%;
  right: 4%;
  font:
    10px ui-monospace,
    monospace;
  letter-spacing: 1px;
  color: var(--color-text-muted);
}
.world-label i {
  display: inline-block;
  width: 5px;
  height: 5px;
  margin-right: 7px;
  background: var(--color-portal-accent);
}
.world-caption {
  position: absolute;
  bottom: 8%;
  left: 12%;
  font-size: 12px;
  color: var(--color-text-muted);
}
@keyframes drift {
  50% {
    transform: translateY(-10px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .island {
    animation: none;
  }
}
</style>
