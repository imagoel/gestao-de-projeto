export function normalizeDateInput(value?: string | null) {
  if (!value) {
    return value ?? null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T00:00:00.000Z`;
  }

  return value;
}
