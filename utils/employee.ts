/**
 * Generates a run-scoped unique employee name so PIM tests never collide with
 * stale rows from other test runs or concurrent workers in this shared,
 * fullyParallel demo environment.
 */
export function generateUniqueEmployeeName(): { firstName: string; lastName: string } {
  const token = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    firstName: `QaFirst${token}`,
    lastName: `QaLast${token}`,
  };
}

/**
 * Generates a fresh candidate numeric Employee Id, used to retry Save after a
 * duplicate-Employee-Id error since the form's auto-suggested id is not
 * guaranteed unique.
 */
export function generateUniqueEmployeeId(): string {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}
