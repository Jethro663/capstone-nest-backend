type StudentIdentitySource = {
  email?: string | null;
  lrn?: string | null;
  profile?: {
    lrn?: string | null;
  } | null;
  student?: {
    email?: string | null;
    lrn?: string | null;
    profile?: {
      lrn?: string | null;
    } | null;
  } | null;
};

function cleanIdentityValue(value: string | null | undefined) {
  return String(value ?? "").trim();
}

export function getStudentLrn(value: StudentIdentitySource | null | undefined) {
  return cleanIdentityValue(value?.lrn || value?.profile?.lrn || value?.student?.lrn || value?.student?.profile?.lrn);
}

export function getStudentEmail(value: StudentIdentitySource | null | undefined) {
  return cleanIdentityValue(value?.email || value?.student?.email);
}

export function formatStudentIdentityLine(
  value: StudentIdentitySource | null | undefined,
  fallback = "No LRN or email on file",
) {
  const lrn = getStudentLrn(value);
  const email = getStudentEmail(value);
  const details: string[] = [];

  if (lrn) details.push(`LRN ${lrn}`);
  if (email) details.push(email);

  return details.join(" | ") || fallback;
}

export function formatStudentIdentityWithStatus(
  value: StudentIdentitySource | null | undefined,
  status: string | null | undefined,
  fallback = "No LRN or email on file",
) {
  const identity = formatStudentIdentityLine(value, "");
  const cleanStatus = cleanIdentityValue(status);

  if (identity && cleanStatus) return `${identity} | ${cleanStatus}`;
  return identity || cleanStatus || fallback;
}
