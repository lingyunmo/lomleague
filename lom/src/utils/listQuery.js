function firstString(value) {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === 'string' ? first : '';
}

// Vue Router already decodes query transport. Literal percent text is not decoded again.
export function readListQuery(query = {}) {
  const rawPage = firstString(query.page);
  const page = /^[1-9]\d*$/.test(rawPage) && Number.isSafeInteger(Number(rawPage)) ? Number(rawPage) : 1;
  const size = firstString(query.pageSize);
  return {
    keyword: firstString(query.q),
    page,
    pageSize: ['10', '20', '50'].includes(size) ? Number(size) : 20,
  };
}

export function writeListQuery(query, state) {
  const next = { ...query };
  delete next.q;
  delete next.page;
  delete next.pageSize;
  if (state.keyword) next.q = state.keyword;
  if (state.page !== 1) next.page = String(state.page);
  if (state.pageSize !== 20) next.pageSize = String(state.pageSize);
  return next;
}
