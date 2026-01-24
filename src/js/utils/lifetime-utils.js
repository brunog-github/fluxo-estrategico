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
  const dailyMinutes = {}; // Formato: {'DD/MM/YYYY': totalMinutesInDay}

  let firstDateObj = null;
  const now = new Date();

  history.forEach((item) => {
    if (!item.duration || !item.date) return;

    const minutesThisSession = timeToMinutes(item.duration);
    totalMinutes += minutesThisSession;

    const dateOnly = item.date.split(" ")[0]; // "DD/MM/YYYY"

    // Agrupar minutos por dia
    if (!dailyMinutes[dateOnly]) {
      dailyMinutes[dateOnly] = 0;
    }
    dailyMinutes[dateOnly] += minutesThisSession;

    const [d, m, y] = dateOnly.split("/");
    const currentDateObj = new Date(y, m - 1, d);

    if (!firstDateObj || currentDateObj < firstDateObj) {
      firstDateObj = currentDateObj;
    }
  });

  // Contar apenas dias com 20+ minutos de estudo
  const daysStudiedCount = Object.values(dailyMinutes).filter(
    (minutes) => minutes >= 20,
  ).length;

  // Cálculo do range total de dias
  let totalDaysRange = 1;
  if (firstDateObj) {
    const diff = Math.abs(now - firstDateObj);
    totalDaysRange = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (totalDaysRange < 1) totalDaysRange = 1;
  }

  const avgMinutes = daysStudiedCount > 0 ? totalMinutes / daysStudiedCount : 0;

  console.log("Lifetime Stats:", {
    totalMinutes,
    avgMinutes,
    daysStudiedCount,
    totalDaysRange,
  });

  return {
    totalMinutes,
    avgMinutes,
    daysStudiedCount,
    totalDaysRange,
  };
}
