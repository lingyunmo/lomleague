import { onMounted, onUnmounted } from 'vue';

// Progressive enhancement: content is visible before setup and without observers.
// Pointer work is event-driven (one queued frame), never a permanent render loop.
export function useHomeMotion(root) {
  let observer, frame, activeCard, pendingPoint, reduced, fine;
  let alive = false;
  let host,
    generation = 0;
  const reveal = (element) => element.classList.remove('reveal-pending');
  function resetPointer() {
    if (frame != null) cancelAnimationFrame(frame);
    frame = null;
    pendingPoint = null;
    if (activeCard) {
      activeCard.style.removeProperty('--depth-x');
      activeCard.style.removeProperty('--depth-y');
      activeCard.classList.remove('depth-active');
    }
    activeCard = null;
  }
  function move(event) {
    if (!alive || reduced?.matches || !fine?.matches || document.hidden || event.pointerType === 'touch') return;
    const card = event.target.closest?.('[data-depth]');
    if (!card || !root.value?.contains(card)) return resetPointer();
    if (card !== activeCard) {
      resetPointer();
      activeCard = card;
    }
    pendingPoint = { x: event.clientX, y: event.clientY };
    if (frame != null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      if (!alive || !activeCard || !pendingPoint) return;
      const rect = activeCard.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const clamp = (value) => Math.max(-1, Math.min(1, value)).toFixed(3);
      activeCard.style.setProperty('--depth-x', clamp(((pendingPoint.x - rect.left) / rect.width) * 2 - 1));
      activeCard.style.setProperty('--depth-y', clamp(((pendingPoint.y - rect.top) / rect.height) * 2 - 1));
      activeCard.classList.add('depth-active');
    });
  }
  function focus(event) {
    // Keyboard navigation must never land in an invisible reveal container.
    let element = event.target;
    while (element && element !== root.value) {
      reveal(element);
      element = element.parentElement;
    }
  }
  function visibility() {
    root.value?.classList.toggle('motion-paused', document.hidden);
    if (document.hidden) resetPointer();
  }
  function configure() {
    const currentGeneration = ++generation;
    observer?.disconnect();
    observer = null;
    resetPointer();
    const element = root.value;
    if (!element) return;
    element.querySelectorAll('.reveal-pending, .scene-paused').forEach((node) => {
      reveal(node);
      node.classList.remove('scene-paused');
    });
    const enabled = !reduced?.matches && typeof window.matchMedia === 'function';
    element.dataset.motion = enabled ? 'on' : 'off';
    if (!enabled || typeof IntersectionObserver !== 'function') return;
    observer = new IntersectionObserver(
      (entries) => {
        if (!alive || generation !== currentGeneration) return;
        for (const entry of entries) {
          if (entry.target.hasAttribute('data-motion-scene'))
            entry.target.classList.toggle('scene-paused', !entry.isIntersecting);
          if (entry.isIntersecting) {
            reveal(entry.target);
            if (!entry.target.hasAttribute('data-motion-scene')) observer?.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08 },
    );
    for (const node of element.querySelectorAll('[data-reveal], [data-motion-scene]')) {
      const rect = node.getBoundingClientRect();
      // Already visible content and restored deep-link positions never wait for an observer.
      const outside = rect.top >= window.innerHeight || rect.bottom <= 0;
      if (outside && node.hasAttribute('data-reveal')) node.classList.add('reveal-pending');
      if (outside && node.hasAttribute('data-motion-scene')) node.classList.add('scene-paused');
      observer.observe(node);
    }
  }
  onMounted(() => {
    alive = true;
    host = root.value;
    reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    fine = window.matchMedia?.('(hover: hover) and (pointer: fine)');
    reduced?.addEventListener('change', configure);
    fine?.addEventListener('change', resetPointer);
    root.value?.addEventListener('pointermove', move, { passive: true });
    root.value?.addEventListener('pointerleave', resetPointer);
    root.value?.addEventListener('focusin', focus);
    document.addEventListener('visibilitychange', visibility);
    configure();
    visibility();
  });
  onUnmounted(() => {
    alive = false;
    generation++;
    observer?.disconnect();
    resetPointer();
    reduced?.removeEventListener('change', configure);
    fine?.removeEventListener('change', resetPointer);
    host?.removeEventListener('pointermove', move);
    host?.removeEventListener('pointerleave', resetPointer);
    host?.removeEventListener('focusin', focus);
    document.removeEventListener('visibilitychange', visibility);
  });
}
