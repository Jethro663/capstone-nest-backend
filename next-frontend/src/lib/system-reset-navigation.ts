const SETTINGS = "/dashboard/admin/system-settings";
let entrySource: string | null = null;

// Ephemeral provenance for a real in-app push, not a URL-supplied history claim.
export function markResetEntrySource(source: string) {
  entrySource =
    source.startsWith("/dashboard/admin/") &&
    !source.startsWith(`${SETTINGS}/reset-school-data`)
      ? source
      : null;
}

export function returnFromReset(
  router: { back: () => void; replace: (path: string) => void },
  from: string | null,
) {
  const canPop =
    entrySource !== null && entrySource === from && window.history.length > 1;
  entrySource = null;
  if (canPop) router.back();
  else router.replace(SETTINGS);
}
