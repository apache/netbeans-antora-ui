module.exports = (d) => {
  const date = new Date(d)
  const dayofweekl = date.toLocaleString(
    'default', { weekday: 'long' }
  );
  const month = date.toLocaleString(
    'default', { month: 'long' });
  const dayinmonth = (date.getDate() < 10 ? '0' : '') + date.getDate();
  year = date.getFullYear();
  return dayofweekl + ' ' + month + ' ' + dayinmonth + ', ' + year
}


