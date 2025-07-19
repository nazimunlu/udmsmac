export const formatDate = (date) => {
  if (!date) return '';
  let d = date;
  if (date.toDate && typeof date.toDate === 'function') {
    d = date.toDate();
  }
  d = new Date(d);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
};
