import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import MaterialsTools from './MaterialsTools.vue';
import { useTheme } from '../composables/useTheme.js';

let wrapper, router, writeText, setItem;
const amount = (index = 1) => wrapper.get(`[aria-label="第${index}项总数量"]`);
const name = (index = 1) => wrapper.get(`[aria-label="第${index}项材料名称"]`);
const stack = (index = 1) => wrapper.get(`[aria-label="第${index}项每组个数"]`);
const capacity = () => wrapper.get('.capacity-input input');
const copy = () => wrapper.get('.copy-button');
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
beforeEach(async () => {
  useTheme().darkMode.value = true;
  writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  setItem = vi.spyOn(Storage.prototype, 'setItem');
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/tools/materials', component: MaterialsTools },
      { path: '/', component: { template: '<p>home</p>' } },
      { path: '/tools/coordinates', component: { template: '<p>coordinates</p>' } },
      { path: '/forums', component: { template: '<p>community</p>' } },
    ],
  });
  await router.push('/tools/materials');
  await router.isReady();
  wrapper = mount(MaterialsTools, { global: { plugins: [router] } });
});
afterEach(() => {
  wrapper.unmount();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  useTheme().darkMode.value = true;
});

describe('building-material planner presentation', () => {
  it('shows exact defaults, named controls and an accessible final-container diagram', () => {
    expect(wrapper.get('output').text()).toBe('2');
    expect(wrapper.findAll('dd').map((item) => item.text())).toEqual(['1,792 个', '28 格', '1 / 27 格', '26 格']);
    expect(wrapper.get('[role="img"]').attributes('aria-label')).toContain('占 1 格，共 27 格');
    expect(wrapper.findAll('.storage-grid .occupied')).toHaveLength(1);
    expect(name().attributes('aria-invalid')).toBe('false');
    expect(amount().attributes('inputmode')).toBe('numeric');
    expect(capacity().attributes('aria-describedby')).toBe('capacity-help');
    expect(wrapper.text()).toContain('不保存或上传输入');
    expect(wrapper.text()).toContain('每行独立计算');
  });
  it('uses real public navigation links without requiring a login', async () => {
    expect(wrapper.findAll('.tools-nav a').map((link) => link.attributes('href'))).toEqual([
      '/',
      '/tools/coordinates',
      '/forums',
    ]);
    await wrapper.get('a[href="/tools/coordinates"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/tools/coordinates');
  });
  it('removes invalid results, disables copying and marks only the invalid quantity', async () => {
    await amount().setValue('1e3');
    expect(wrapper.find('output').exists()).toBe(false);
    expect(wrapper.find('textarea').exists()).toBe(false);
    expect(amount().attributes('aria-invalid')).toBe('true');
    expect(name().attributes('aria-invalid')).toBe('false');
    expect(wrapper.get('[role="alert"]').text()).toContain('不会沿用旧结果');
    expect(copy().attributes('disabled')).toBeDefined();
    await copy().trigger('click');
    expect(writeText).not.toHaveBeenCalled();
    await amount().setValue('65');
    expect(wrapper.get('output').text()).toBe('1');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });
  it('rejects overlong names without truncating Unicode or marking a valid quantity', async () => {
    await name().setValue('🧱'.repeat(81));
    expect(name().attributes('aria-invalid')).toBe('true');
    expect(amount().attributes('aria-invalid')).toBe('false');
    expect(wrapper.find('output').exists()).toBe(false);
    await name().setValue('🧱'.repeat(80));
    expect(name().element.value).toBe('🧱'.repeat(80));
    expect(wrapper.find('output').exists()).toBe(true);
  });
  it('counts each supported stack size and never combines partial slots', async () => {
    await amount().setValue('17');
    await stack().setValue('16');
    await amount(2).setValue('1');
    expect(wrapper.findAll('dd').map((item) => item.text())).toEqual(['18 个', '3 格', '3 / 27 格', '24 格']);
    await stack().setValue('1');
    expect(wrapper.findAll('dd')[1].text()).toBe('18 格');
    await amount().setValue('1');
    await stack().setValue('64');
    expect(wrapper.findAll('dd')[1].text()).toBe('2 格');
  });
  it('bounds capacity and recovers without retaining an old result', async () => {
    for (const invalid of ['0', '257', '-1', '1e2', '']) {
      await capacity().setValue(invalid);
      expect(capacity().attributes('aria-invalid')).toBe('true');
      expect(wrapper.find('output').exists()).toBe(false);
      expect(copy().attributes('disabled')).toBeDefined();
    }
    await capacity().setValue('1');
    expect(wrapper.get('output').text()).toBe('28');
    expect(wrapper.findAll('.storage-grid span')).toHaveLength(1);
  });
  it('computes every capacity slot while explicitly limiting the diagram to 54', async () => {
    await capacity().setValue('256');
    expect(wrapper.findAll('dd').map((item) => item.text())).toEqual(['1,792 个', '28 格', '28 / 256 格', '228 格']);
    expect(wrapper.findAll('.storage-grid span')).toHaveLength(54);
    expect(wrapper.get('.grid-caption').text()).toContain('计算包含全部格数');
    expect(wrapper.get('[role="img"]').attributes('aria-label')).toContain('共 256 格');
  });
  it('does not invent a container or diagram when all quantities are zero', async () => {
    await amount().setValue('0');
    await amount(2).setValue('0');
    expect(wrapper.get('output').text()).toBe('0');
    expect(wrapper.find('[role="img"]').exists()).toBe(false);
    expect(wrapper.findAll('dd')[2].text()).toBe('无需容器');
    expect(wrapper.get('textarea').element.value).toContain('不需要容器');
  });
  it('limits additions to 20 rows, preserves remaining values on removal and allows an empty plan', async () => {
    for (let index = 0; index < 18; index++) await wrapper.get('.add-button').trigger('click');
    expect(wrapper.findAll('fieldset')).toHaveLength(20);
    expect(wrapper.get('.add-button').attributes('disabled')).toBeDefined();
    await wrapper.get('.add-button').trigger('click');
    expect(wrapper.findAll('fieldset')).toHaveLength(20);
    await wrapper.get('[aria-label="移除第1项材料"]').trigger('click');
    expect(name().element.value).toBe('玻璃');
    expect(amount().element.value).toBe('64');
    expect(wrapper.get('.add-button').attributes('disabled')).toBeUndefined();
    while (wrapper.findAll('fieldset').length) await wrapper.get('.remove-button').trigger('click');
    expect(wrapper.find('output').exists()).toBe(false);
    expect(copy().attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('添加一项材料开始计算');
    await wrapper.get('.add-button').trigger('click');
    expect(wrapper.get('textarea').element.value).toContain('材料1：0 个');
  });
  it('changes light/dark presentation without saving material input', async () => {
    expect(wrapper.classes()).not.toContain('is-light');
    useTheme().darkMode.value = false;
    await amount().setValue('65');
    expect(wrapper.classes()).toContain('is-light');
    expect(setItem).not.toHaveBeenCalled();
  });
});

describe('material-plan clipboard lifecycle', () => {
  it('copies precise literal Unicode/percent text and clears feedback after an edit', async () => {
    await name().setValue('中文🧱100% %E4%B8%AD');
    await amount().setValue('65');
    const text = wrapper.get('textarea').element.value;
    await copy().trigger('click');
    await flushPromises();
    expect(writeText).toHaveBeenCalledExactlyOnceWith(text);
    expect(text).toContain('中文🧱100% %E4%B8%AD：65 个 = 1 组 + 1 个');
    expect(wrapper.get('[role="status"]').text()).toContain('清单已复制');
    await capacity().setValue('54');
    expect(wrapper.get('[role="status"]').text()).toBe('');
  });
  it('keeps a readonly manual-copy fallback when clipboard access fails', async () => {
    writeText.mockRejectedValueOnce(new Error('clipboard denied'));
    await copy().trigger('click');
    await flushPromises();
    expect(wrapper.get('[role="status"]').text()).toContain('手动复制');
    expect(wrapper.get('textarea').attributes('readonly')).toBeDefined();
    expect(wrapper.get('textarea').element.value).toContain('石砖：1728 个');
    expect(copy().attributes('disabled')).toBeUndefined();
  });
  it('falls back safely when the clipboard API is absent', async () => {
    vi.stubGlobal('navigator', {});
    await copy().trigger('click');
    await flushPromises();
    expect(wrapper.get('[role="status"]').text()).toContain('手动复制');
  });
  it('suppresses overlapping copies of the same current plan', async () => {
    const pending = deferred();
    writeText.mockReturnValueOnce(pending.promise);
    await copy().trigger('click');
    await copy().trigger('click');
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(copy().text()).toContain('正在复制');
    pending.resolve();
    await flushPromises();
    expect(copy().attributes('disabled')).toBeUndefined();
  });
  it('does not announce an old success after the inputs change and return', async () => {
    const pending = deferred();
    writeText.mockReturnValueOnce(pending.promise);
    await copy().trigger('click');
    await amount().setValue('1');
    await amount().setValue('1728');
    pending.resolve();
    await flushPromises();
    expect(wrapper.get('[role="status"]').text()).toBe('');
  });
  it('does not let an older copy completion release a newer pending copy', async () => {
    const oldCopy = deferred(),
      newCopy = deferred();
    writeText.mockReturnValueOnce(oldCopy.promise).mockReturnValueOnce(newCopy.promise);
    await copy().trigger('click');
    await amount().setValue('65');
    await copy().trigger('click');
    oldCopy.reject(new Error('old permission error'));
    await flushPromises();
    expect(wrapper.get('[role="status"]').text()).toBe('');
    expect(copy().attributes('disabled')).toBeDefined();
    newCopy.resolve();
    await flushPromises();
    expect(wrapper.get('[role="status"]').text()).toContain('清单已复制');
    expect(copy().attributes('disabled')).toBeUndefined();
    expect(writeText.mock.calls[1][0]).toContain('石砖：65 个');
  });
  it('discards stale failure feedback after removal makes the plan empty', async () => {
    const pending = deferred();
    writeText.mockReturnValueOnce(pending.promise);
    await copy().trigger('click');
    await wrapper.get('.remove-button').trigger('click');
    await wrapper.get('.remove-button').trigger('click');
    pending.reject(new Error('old failure'));
    await flushPromises();
    expect(wrapper.get('[role="status"]').text()).toBe('');
    expect(copy().attributes('disabled')).toBeDefined();
  });
  it('does not mutate feedback after unmount', async () => {
    const pending = deferred();
    writeText.mockReturnValueOnce(pending.promise);
    await copy().trigger('click');
    const status = wrapper.get('[role="status"]').element;
    wrapper.unmount();
    pending.resolve();
    await flushPromises();
    expect(status.textContent).toBe('');
  });
});
