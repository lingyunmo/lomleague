<template>
  <div class="block-world" aria-hidden="true" data-depth data-motion-scene>
    <svg class="world-scene" viewBox="0 0 640 540" role="presentation">
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
      <ellipse class="world-glow" data-ambient cx="330" cy="310" rx="290" ry="220" fill="url(#world-light)" />
      <path d="M20 345 325 170 625 345 325 520Z" fill="url(#world-grid)" opacity=".4" />
      <g fill="none" stroke="var(--color-brand-primary)" stroke-width="1" opacity=".5">
        <ellipse class="world-orbit" data-ambient cx="325" cy="345" rx="268" ry="136" stroke-dasharray="18 240" />
        <ellipse
          class="world-orbit orbit-inner"
          data-ambient
          cx="325"
          cy="345"
          rx="220"
          ry="108"
          stroke-dasharray="8 160"
        />
      </g>
      <ellipse cx="335" cy="420" rx="150" ry="35" fill="#000" opacity=".2" />
      <g class="island" data-ambient>
        <g v-for="(block, i) in blocks" :key="i" :transform="`translate(${block.x},${block.y})`">
          <g class="world-block" data-ambient :style="{ '--build-delay': `${150 + i * 18}ms` }">
            <path d="M0 0 24 -14 48 0 24 14Z" :fill="block.top" stroke="#131e1a" stroke-width=".7" />
            <path d="M0 0 24 14 24 50 0 36Z" :fill="block.left" stroke="#131e1a" stroke-width=".7" />
            <path d="M24 14 48 0 48 36 24 50Z" :fill="block.right" stroke="#131e1a" stroke-width=".7" />
            <path v-if="block.grass" d="M0 0 24 14 48 0 48 7 24 21 0 7Z" fill="#538c4d" />
          </g>
        </g>
        <g class="world-detail" data-ambient>
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
      </g>
      <g fill="var(--color-brand-primary)">
        <rect class="world-pixel" data-ambient x="120" y="153" width="4" height="4" />
        <rect class="world-pixel" data-ambient style="--pixel-delay: -2s" x="471" y="113" width="5" height="5" />
        <rect class="world-pixel" data-ambient style="--pixel-delay: -4s" x="529" y="255" width="3" height="3" />
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
.world-scene {
  transform: perspective(900px) rotateX(calc(var(--depth-y, 0) * -4deg)) rotateY(calc(var(--depth-x, 0) * 5deg));
  transition: transform 500ms var(--motion-ease, ease);
}
.depth-active .world-scene {
  transition-duration: 160ms;
}
.portal[data-motion='on'] .world-block {
  animation: block-build 800ms var(--motion-ease) both;
  animation-delay: var(--build-delay);
}
.portal[data-motion='on'] .world-detail {
  animation: block-build 1000ms var(--motion-ease) 700ms both;
}
.world-orbit {
  animation: orbit-trace 16s linear infinite;
}
.orbit-inner {
  animation-direction: reverse;
  animation-duration: 22s;
}
.world-glow {
  animation: world-breathe 7s ease-in-out infinite;
  transform-origin: center;
}
.world-pixel {
  animation: pixel-float 6s ease-in-out infinite;
  animation-delay: var(--pixel-delay, 0s);
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
@keyframes block-build {
  from {
    opacity: 0;
    transform: translateY(-48px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes orbit-trace {
  to {
    stroke-dashoffset: -516;
  }
}
@keyframes world-breathe {
  50% {
    opacity: 0.55;
    transform: scale(0.94);
  }
}
@keyframes pixel-float {
  50% {
    opacity: 0.4;
    transform: translateY(-16px);
  }
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
  [data-ambient] {
    animation: none;
  }
  .world-scene {
    transform: none;
    transition: none;
  }
}
</style>
