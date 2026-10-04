import { describe, expect, it } from 'vitest';
import { readListQuery, writeListQuery } from './listQuery.js';
describe('shareable community list query', () => {
  it('has the existing first-page and twenty-item defaults', () => {
    expect(readListQuery()).toEqual({ keyword: '', page: 1, pageSize: 20 });
  });
  it('preserves already-decoded Unicode and literal percent sequences exactly', () => {
    const keyword = '中文世界🧱 100% %E4%B8%AD + #';
    expect(readListQuery({ q: keyword, page: '3', pageSize: '10' })).toEqual({ keyword, page: 3, pageSize: 10 });
    expect(writeListQuery({}, { keyword, page: 3, pageSize: 10 })).toEqual({ q: keyword, page: '3', pageSize: '10' });
  });
  it.each(['0', '-1', '1.5', 'Infinity', 'NaN', '1e3', '9007199254740992', '', null])(
    'falls back safely for invalid page %s',
    (page) => {
      expect(readListQuery({ page }).page).toBe(1);
    },
  );
  it('uses the first repeated query value and only the existing size options', () => {
    expect(readListQuery({ q: ['first', 'second'], page: ['2', '9'], pageSize: ['50', '10'] })).toEqual({
      keyword: 'first',
      page: 2,
      pageSize: 50,
    });
    expect(readListQuery({ q: null, pageSize: '99999' }).pageSize).toBe(20);
  });
  it('removes default filters without losing unrelated query parameters or mutating input', () => {
    const query = { q: 'old', page: '3', pageSize: '10', source: 'community', tag: ['a', 'b'] };
    expect(writeListQuery(query, { keyword: '', page: 1, pageSize: 20 })).toEqual({
      source: 'community',
      tag: ['a', 'b'],
    });
    expect(query.q).toBe('old');
  });
});
