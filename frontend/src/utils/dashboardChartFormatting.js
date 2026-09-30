export const shouldShowDashboardTick = (index, count, maxTicks = 7) => {
  if (count <= maxTicks) return true;
  const stride = Math.ceil((count - 1) / (maxTicks - 1));
  return index === 0 || index === count - 1 || index % stride === 0;
};

export const formatDashboardDate = (value, range, detail = false) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (!match) return String(value || '');
  const [, yearText, monthText, dayText = '01'] = match;
  const date = new Date(Number(yearText), Number(monthText) - 1, Number(dayText));
  if (Number.isNaN(date.getTime())) return String(value);

  if (range === '1y' && !detail) {
    return `${date.toLocaleDateString(undefined, { month: 'short' })} '${String(yearText).slice(-2)}`;
  }
  if (range === '1m' && !detail) {
    return date.getDate() === 1
      ? `${date.toLocaleDateString(undefined, { month: 'short' })} 1`
      : String(date.getDate());
  }
  if (range === '7d' && !detail) return date.toLocaleDateString(undefined, { weekday: 'short' });
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};