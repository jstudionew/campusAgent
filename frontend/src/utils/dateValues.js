const formatParts = (year, month, day) =>
  `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const isValidDateParts = (year, month, day) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

export const toDateInputValue = (value) => {
  if (value === undefined || value === null || value === '') return '';

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? ''
      : formatParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  const text = String(value).trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const [, year, month, day] = iso.map(Number);
    return isValidDateParts(year, month, day) ? formatParts(year, month, day) : '';
  }

  const legacy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!legacy) return '';
  let [, first, second, year] = legacy.map(Number);
  if (first > 12) [first, second] = [second, first];
  return isValidDateParts(year, first, second) ? formatParts(year, first, second) : '';
};

export const formatDateValue = (value) => toDateInputValue(value) || '—';