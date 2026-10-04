// Vue Router records normalized, app-relative paths in its web-history state.
// Only return to the matching list; a direct link or unrelated history gets a safe fallback.
export function returnToList(router, listPath) {
  const previous = router.options.history.state?.back;
  if (
    typeof previous === 'string' &&
    (previous === listPath || previous.startsWith(`${listPath}?`) || previous.startsWith(`${listPath}#`))
  ) {
    router.back();
    return;
  }
  return router.push(listPath);
}
