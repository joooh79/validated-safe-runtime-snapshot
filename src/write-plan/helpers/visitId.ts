export function buildDeterministicVisitId(
  patientId?: string,
  visitDate?: string,
): string | undefined {
  if (!patientId || !visitDate) {
    return undefined;
  }

  const normalizedPatientId = patientId.trim();
  const normalizedVisitDate = visitDate.trim();

  if (!normalizedPatientId || !/^\d{4}-\d{2}-\d{2}$/.test(normalizedVisitDate)) {
    return undefined;
  }

  return `VISIT-${normalizedPatientId}-${normalizedVisitDate.replaceAll('-', '')}`;
}
