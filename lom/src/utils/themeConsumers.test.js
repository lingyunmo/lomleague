import { describe, expect, it } from 'vitest';
import home from '../views/HomeView.vue?raw';
import library from '../components/home/HomeLibrary.vue?raw';
import world from '../components/home/BlockWorld.vue?raw';
import profile from '../components/user/Profile.vue?raw';
import coordinates from '../views/CoordinateTools.vue?raw';
import materials from '../views/MaterialsTools.vue?raw';
import community from '../components/community/CommunityShell.vue?raw';

function rule(source, selector) {
  const styles = source
    .split(/<style[^>]*>/)
    .slice(1)
    .map((part) => part.split('</style>')[0])
    .join('\n');
  return [...styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((match) => match[1].split(',').some((item) => item.trim() === selector))
    .map((match) => match[2])
    .join('\n');
}

describe('page style consumers honor the existing global appearance', () => {
  it.each([
    ['homepage', home, '.workspace-card'],
    ['archive', library, '.archive-art'],
    ['profile', profile, '.profile-card'],
    ['coordinate tools', coordinates, '.input-card'],
    ['material tools', materials, '.materials-card'],
  ])('%s cards use global glass background, blur, border and radius', (_, source, selector) => {
    const css = rule(source, selector);
    expect(css).toContain('background: var(--glass-bg)');
    expect(css).toContain('backdrop-filter: var(--glass-blur)');
    expect(css).toContain('var(--glass-border)');
    expect(css).toContain('border-radius: var(--glass-radius)');
    expect(css).not.toContain('backdrop-filter: none');
  });
  it('does not impose the portal green or opaque surfaces on the selected palette', () => {
    expect(home).not.toMatch(/#b8e780|#172216/);
    expect(library).not.toMatch(/#232b24|#292725|#252b30/);
    expect(rule(home, '.primary')).toContain('background: var(--color-portal-accent)');
    expect(rule(home, '.primary')).toContain('color: var(--color-on-accent)');
    expect(rule(community, '.community-shell')).toContain('--community-surface: var(--glass-bg-inner)');
    expect(world).toContain('stop-color="var(--color-brand-primary)"');
    expect(world).toContain('fill="var(--color-brand-primary)"');
  });
});
