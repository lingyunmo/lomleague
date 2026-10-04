import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
const calls = vi.hoisted(() => ({
  canvas: vi.fn(),
  save: vi.fn(),
  addPage: vi.fn(),
  addImage: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));
vi.mock('html2canvas', () => ({ default: calls.canvas }));
vi.mock('jspdf', () => ({
  default: function () {
    return calls;
  },
}));
vi.mock('naive-ui', () => ({ useMessage: () => calls }));
import InviteGenerator from './InviteGenerator.vue';
let wrapper;
beforeEach(() => {
  vi.clearAllMocks();
  calls.canvas
    .mockReset()
    .mockResolvedValue({ width: 210, height: 297, toDataURL: () => 'data:image/png;base64,fixture' });
});
afterEach(() => {
  wrapper?.unmount();
});
function fixture() {
  wrapper = mount(InviteGenerator, {
    global: {
      stubs: {
        NForm: { template: '<form><slot/></form>' },
        NFormItem: { template: '<div><slot/></div>' },
        NButton: { template: '<button><slot/></button>' },
        NInput: true,
        NSelect: true,
        NIcon: true,
      },
    },
  });
  return wrapper;
}
describe('invitation template copy without changing formal membership rules', () => {
  it('clearly identifies a template, removes internal Docker names and retains all four formal pages', () => {
    fixture();
    expect(wrapper.get('.invite-card').text()).toContain('生成文件不代表已通过入盟审核');
    expect(wrapper.findAll('.offer-page')).toHaveLength(4);
    expect(wrapper.text()).not.toContain('common-net');
    expect(wrapper.text()).toContain('权利与义务');
    expect(wrapper.text()).toContain('建议');
    expect(wrapper.text()).toContain('expected');
  });
  it.each(['Redstone Engineering', '自定义方向🧱'])(
    'translates selected skills but preserves custom text (%s)',
    async (skill) => {
      fixture();
      wrapper.vm.form.skill = skill;
      await wrapper.vm.$nextTick();
      const pages = wrapper.findAll('.offer-page');
      expect(pages[0].text()).toContain(skill);
      expect(pages[2].text()).toContain(skill === 'Redstone Engineering' ? '红石工程师' : skill);
    },
  );
  it('keeps the generated filename and page contents without submitting any membership application', async () => {
    fixture();
    wrapper.vm.form = { nickname: '中文🧱100% %E4%B8%AD', uid: '7', skill: 'Redstone Engineering' };
    await wrapper.vm.$nextTick();
    await wrapper.vm.generateOffer();
    expect(calls.canvas).toHaveBeenCalledTimes(4);
    expect(calls.addPage).toHaveBeenCalledTimes(3);
    expect(calls.save).toHaveBeenCalledExactlyOnceWith('lom_admission_中文🧱100% %E4%B8%AD.pdf');
    expect(calls.success).toHaveBeenCalledWith('通知书模板已生成');
  });
  it('reports PDF generation failures in Chinese and releases the loading state', async () => {
    fixture();
    wrapper.vm.form = { nickname: '测试', uid: '7', skill: 'Redstone Engineering' };
    calls.canvas.mockRejectedValueOnce(new Error('canvas failed'));
    await wrapper.vm.generateOffer();
    expect(calls.error).toHaveBeenCalledWith('PDF 生成失败，请重试');
    expect(wrapper.vm.generating).toBe(false);
    expect(calls.save).not.toHaveBeenCalled();
  });
});
