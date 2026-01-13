import { timeToMinutes, formatMinutesToHm } from "./utils.js";

export function computeLifetimeStats(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return {
      totalMinutes: 0,
      avgMinutes: 0,
      daysStudiedCount: 0,
      totalDaysRange: 0,
    };
  }

  let totalMinutes = 0;
  const uniqueDays = new Set();

  let firstDateObj = null;
  const now = new Date();

  history.forEach((item) => {
    if (!item.duration || !item.date) return;

    totalMinutes += timeToMinutes(item.duration);

    const dateOnly = item.date.split(" ")[0]; // "DD/MM/YYYY"
    uniqueDays.add(dateOnly);

    const [d, m, y] = dateOnly.split("/");
    const currentDateObj = new Date(y, m - 1, d);

    if (!firstDateObj || currentDateObj < firstDateObj) {
      firstDateObj = currentDateObj;
    }
  });

  // Cálculo do range total de dias
  let totalDaysRange = 1;
  if (firstDateObj) {
    const diff = Math.abs(now - firstDateObj);
    totalDaysRange = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (totalDaysRange < 1) totalDaysRange = 1;
  }

  const daysStudiedCount = uniqueDays.size;
  const avgMinutes = daysStudiedCount > 0 ? totalMinutes / daysStudiedCount : 0;

  return {
    totalMinutes,
    avgMinutes,
    daysStudiedCount,
    totalDaysRange,
  };
}
