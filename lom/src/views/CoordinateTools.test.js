import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import CoordinateTools from './CoordinateTools.vue';
let wrapper, writeText;
beforeEach(() => {
  writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  wrapper = mount(CoordinateTools, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } });
});
afterEach(() => {
  wrapper.unmount();
  vi.unstubAllGlobals();
});

describe('Minecraft coordinate tools presentation', () => {
  it('shows the live 8:1 example with named inputs and an accessible chunk map', () => {
    expect(wrapper.findAll('output').map((output) => output.text())).toEqual(['128', '-256']);
    expect(wrapper.get('label:has(input[type="text"])').text()).toBe('X 坐标');
    expect(wrapper.get('[role="img"]').attributes('aria-label')).toContain('当前位置 X 0，Z 0');
    expect(wrapper.text()).toContain('不保存输入');
  });
  it('uses negative chunk boundaries without rounding the portal result', async () => {
    await wrapper.get('.example-button').trigger('click');
    expect(wrapper.findAll('output').map((output) => output.text())).toEqual(['-0.125', '-2']);
    expect(wrapper.get('[role="img"]').attributes('aria-label')).toContain('X 15，Z 0');
    expect(wrapper.findAll('dd').map((value) => value.text())).toEqual(['-1 / -1', '15 / 0', '-16 至 -1', '-16 至 -1']);
  });
  it('converts in the opposite direction when selecting the source dimension', async () => {
    await wrapper.get('input[value="nether"]').setValue(true);
    expect(wrapper.findAll('output').map((output) => output.text())).toEqual(['8192', '-16384']);
    expect(wrapper.get('#portal-result-heading').text()).toBe('对应主世界坐标');
  });
  it('removes stale results, explains invalid values and disables copying', async () => {
    await wrapper.get('.axis-inputs input').setValue('1e3');
    expect(wrapper.findAll('output')).toHaveLength(0);
    expect(wrapper.get('[role="alert"]').text()).toContain('不支持小数或科学计数法');
    expect(wrapper.get('.axis-inputs input').attributes('aria-invalid')).toBe('true');
    expect(wrapper.get('.copy-button').attributes('disabled')).toBeDefined();
    await wrapper.get('.copy-button').trigger('click');
    expect(writeText).not.toHaveBeenCalled();
  });
  it('copies the current precise coordinates and clears feedback after editing', async () => {
    await wrapper.get('.example-button').trigger('click');
    await wrapper.get('.copy-button').trigger('click');
    await flushPromises();
    expect(writeText).toHaveBeenCalledExactlyOnceWith('下界 X: -0.125, Z: -2');
    expect(wrapper.get('[role="status"]').text()).toContain('已复制');
    await wrapper.get('.axis-inputs input').setValue('8');
    expect(wrapper.get('[role="status"]').text()).toBe('');
  });
  it('provides a manual-copy fallback without a blocking dialog', async () => {
    writeText.mockRejectedValueOnce(new Error('clipboard denied'));
    await wrapper.get('.copy-button').trigger('click');
    await flushPromises();
    expect(wrapper.get('[role="status"]').text()).toContain('手动复制');
  });
  it('does not announce an old copy result after the inputs change', async () => {
    let finish;
    writeText.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    await wrapper.get('.copy-button').trigger('click');
    await wrapper.get('.axis-inputs input').setValue('-1');
    finish();
    await flushPromises();
    expect(wrapper.get('[role="status"]').text()).toBe('');
  });
});
