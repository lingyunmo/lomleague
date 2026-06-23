/**
 * useTheme — 主题系统
 * 每个预设 = 一整套配色方案：品牌色 + 辅色 + 背景色 + 渐变
 */
import { ref, reactive } from 'vue';

// ---- 6 套完整配色 ----
export const PRESETS = {
  blue:   { name: '蓝',   primary: '#007aff', hover: '#0066d6', secondary: '#5e5ce6', rgb: '0,122,255' },
  mint:   { name: '绿',   primary: '#34c759', hover: '#2db14e', secondary: '#30b0c7', rgb: '52,199,89' },
  gold:   { name: '金',   primary: '#d4a843', hover: '#b89030', secondary: '#c97a2e', rgb: '212,168,67' },
  rose:   { name: '粉',   primary: '#ff375f', hover: '#e03050', secondary: '#e8547c', rgb: '255,55,95' },
  violet: { name: '紫',   primary: '#af52de', hover: '#9545c0', secondary: '#7b61ff', rgb: '175,82,222' },
  slate:  { name: '石墨', primary: '#8e8e93', hover: '#707075', secondary: '#636366', rgb: '142,142,147' },
};

// ---- 暗色 ----
const DARK = {
  bodyBg:       '#000000',
  navbarBg:     'rgba(0,0,0,.84)',
  footerBg:     '#0d0d0d',
  textPrimary:  'rgba(255,255,255,.92)',
  textSecondary:'rgba(255,255,255,.72)',
  textMuted:    'rgba(255,255,255,.56)',
  textSubtle:   'rgba(255,255,255,.32)',
  textLabel:    'rgba(255,255,255,.64)',
  shadowSubtle: '0 0 0 .5px rgba(255,255,255,.08)',
  shadowMedium: '0 1px 3px rgba(0,0,0,.4), 0 0 0 .5px rgba(255,255,255,.06)',
  shadowDeep:   '0 4px 16px rgba(0,0,0,.5)',
  shadowAvatar: '0 2px 8px rgba(0,0,0,.6)',
};

// ---- 亮色 ----
const LIGHT = {
  bodyBg:       '#f5f5f7',
  navbarBg:     'rgba(245,245,247,.84)',
  footerBg:     '#e8e8ed',
  textPrimary:  'rgba(0,0,0,.88)',
  textSecondary:'rgba(0,0,0,.64)',
  textMuted:    'rgba(0,0,0,.48)',
  textSubtle:   'rgba(0,0,0,.24)',
  textLabel:    'rgba(0,0,0,.56)',
  shadowSubtle: '0 0 0 .5px rgba(0,0,0,.04)',
  shadowMedium: '0 1px 3px rgba(0,0,0,.06), 0 0 0 .5px rgba(0,0,0,.04)',
  shadowDeep:   '0 4px 16px rgba(0,0,0,.08)',
  shadowAvatar: '0 2px 8px rgba(0,0,0,.1)',
};

// ---- 单例 ----
const currentKey = ref('blue');
const darkMode = ref(true);
const glassEnabled = ref(true);
let initialized = false;

export const naiveThemeOverrides = reactive({
  common: { fontWeightStrong: '600', borderRadius: '10px' },
});

function applyAll() {
  const t = PRESETS[currentKey.value] || PRESETS.blue;
  const mode = darkMode.value ? DARK : LIGHT;
  const glass = glassEnabled.value;
  const root = document.documentElement;

  // 品牌色
  root.style.setProperty('--color-brand-primary', t.primary);
  root.style.setProperty('--color-brand-primary-hover', t.hover);
  root.style.setProperty('--color-brand-secondary', t.secondary);
  root.style.setProperty('--shadow-glow-brand', `0 0 0 2px rgba(${t.rgb},.18)`);

  const dark = darkMode.value;
  root.style.setProperty('--color-bg-gradient-start', dark ? '#000' : '#f5f5f7');
  root.style.setProperty('--color-bg-gradient-end', dark ? '#0a0a0a' : '#ececf0');
  root.style.setProperty('--color-bg-dark', mode.bodyBg);
  root.style.setProperty('--color-navbar-bg', mode.navbarBg);
  root.style.setProperty('--color-footer-bg', mode.footerBg);

  // 文字
  root.style.setProperty('--color-text-primary', mode.textPrimary);
  root.style.setProperty('--color-text-secondary', mode.textSecondary);
  root.style.setProperty('--color-text-muted', mode.textMuted);
  root.style.setProperty('--color-text-subtle', mode.textSubtle);
  root.style.setProperty('--color-text-label', mode.textLabel);

  // 品牌金
  const goldRgb = darkMode.value ? '212,168,67' : '180,145,50';
  root.style.setProperty('--color-gold', `rgb(${goldRgb})`);
  root.style.setProperty('--color-gold-dark', `rgb(${goldRgb})`);

  // 阴影
  root.style.setProperty('--shadow-subtle', mode.shadowSubtle);
  root.style.setProperty('--shadow-medium', mode.shadowMedium);
  root.style.setProperty('--shadow-deep', mode.shadowDeep);
  root.style.setProperty('--shadow-avatar', mode.shadowAvatar);

  // 通用
  root.style.setProperty('--glass-radius', '14px');
  root.style.setProperty('--glass-radius-sm', '10px');
  root.style.setProperty('--transition-card', 'transform .2s ease, box-shadow .2s ease');
  root.style.setProperty('--transition-smooth', 'all .3s ease');

  const gbd = darkMode.value ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.1)';
  const gbdr = darkMode.value ? 'rgba(0,0,0,.2)' : 'rgba(255,255,255,.2)';
  root.style.setProperty('--glass-bg-dark', gbd);
  root.style.setProperty('--glass-bg-darker', gbdr);

  // 玻璃
  if (glass) {
    const bg = darkMode.value ? '255,255,255' : '0,0,0';
    root.style.setProperty('--glass-bg', `rgba(${bg},${darkMode.value ? '.04' : '.03'})`);
    root.style.setProperty('--glass-bg-inner', `rgba(${bg},${darkMode.value ? '.06' : '.04'})`);
    root.style.setProperty('--glass-blur', 'saturate(180%) blur(20px)');
    root.style.setProperty('--glass-border', `rgba(${bg},${darkMode.value ? '.08' : '.06'})`);
  } else {
    root.style.setProperty('--glass-bg', 'transparent');
    root.style.setProperty('--glass-bg-inner', 'transparent');
    root.style.setProperty('--glass-blur', 'none');
    root.style.setProperty('--glass-border', 'transparent');
  }

  // Naive UI 联动
  naiveThemeOverrides.common = {
    ...naiveThemeOverrides.common,
    primaryColor: t.primary,
    primaryColorHover: t.hover,
  };
}

function setTheme(key) { currentKey.value = key; localStorage.setItem('lom-theme', key); applyAll(); }
function setDarkMode(val) { darkMode.value = val; localStorage.setItem('lom-dark', val ? '1' : '0'); applyAll(); }
function toggleDarkMode() { setDarkMode(!darkMode.value); }
function setGlass(val) { glassEnabled.value = val; localStorage.setItem('lom-glass', val ? '1' : '0'); applyAll(); }

function init() {
  if (initialized) return;
  initialized = true;
  const saved = localStorage.getItem('lom-theme');
  if (saved && PRESETS[saved]) currentKey.value = saved;
  const dark = localStorage.getItem('lom-dark');
  if (dark !== null) darkMode.value = dark === '1';
  const glass = localStorage.getItem('lom-glass');
  if (glass !== null) glassEnabled.value = glass === '1';
  applyAll();
}

export function useTheme() {
  return { presets: PRESETS, currentKey, darkMode, glassEnabled, setTheme, setDarkMode, toggleDarkMode, setGlass, init };
}

export { init as initTheme };
