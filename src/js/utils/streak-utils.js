import { timeToMinutes } from "./utils.js";

export function parseDateStr(str) {
  const datePart = str.split(" às ")[0];
  const [day, mon, year] = datePart.split("/");
  return new Date(year, mon - 1, day);
}

export function getMinutesStudiedOnDate(dateObj, history) {
  const dateStr = dateObj.toLocaleDateString("pt-BR");
  let total = 0;

  history.forEach((item) => {
    const itemDateStr = item.date.split(" às ")[0];
    if (itemDateStr === dateStr) {
      total += timeToMinutes(item.duration);
    }
  });

  return total;
}

export function pluralize(value, singular, plural) {
  return value === 1 ? `${value} ${singular}` : `${value} ${plural}`;
}
