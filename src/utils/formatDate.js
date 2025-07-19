export const formatDate = (date) => {
  if (!date) return '';
  let d = date;
  if (date.toDate && typeof date.toDate === 'function') {
    d = date.toDate();
  }
  d = new Date(d);

  // Adjust for timezone offset to prevent date shifts
  const offset = d.getTimezoneOffset();
  d = new Date(d.getTime() + (offset * 60 * 1000));

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};
