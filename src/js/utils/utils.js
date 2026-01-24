import { parseDateStr } from "../utils/streak-utils.js";
import { dbService } from "../services/db/db-service.js";

// Converte "HH:MM:SS" para minutos
export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h = 0, m = 0, s = 0] = timeStr.split(":").map(Number);
  return h * 60 + m + s / 60;
}

// Formata segundos para "HH:MM:SS"
export function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

// Formata minutos para "XhYmin"
export function formatMinutesToHm(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.floor(totalMinutes % 60);
  return `${h}h${String(m).padStart(2, "0")}min`;
}

// 1. Converter data "DD/MM/YYYY..." para ISO "YYYY-MM-DD"
export function formatDateToISO(date) {
  const [datePart] = date.split(" "); // Pega só a data se tiver hora
  const [day, month, year] = datePart.split("/");
  return `${year}-${month}-${day}`;
}

// Helper: Calcula o melhor streak baseado no histórico e dias de descanso
async function calculateBestStreakForAchievements(history) {
  if (!history.length) return 0;

  const restDays = (await dbService.getRestDays()) || [];

  // Agrupa estudo por dia
  const dailyMinutes = {};

  history.forEach((item) => {
    const dateObj = parseDateStr(item.date);
    dateObj.setHours(0, 0, 0, 0);
    const dayKey = dateObj.toISOString().split("T")[0]; // Usar string "YYYY-MM-DD" em vez de timestamp

    const minutes = timeToMinutes(item.duration);
    dailyMinutes[dayKey] = (dailyMinutes[dayKey] || 0) + minutes;
  });

  // Obter range de datas
  const dayKeys = Object.keys(dailyMinutes).sort();

  if (dayKeys.length === 0) return 0;

  const firstDayStr = dayKeys[0];
  const lastDayStr = dayKeys[dayKeys.length - 1];

  const firstDay = new Date(firstDayStr + "T00:00:00");
  const lastDay = new Date(lastDayStr + "T00:00:00");

  // Calcular melhor streak
  let bestStreak = 0;
  let currentStreak = 0;
  let currentDay = new Date(firstDay);
  let studiedDaysCount = 0;

  while (currentDay <= lastDay) {
    const dayKeyStr = currentDay.toISOString().split("T")[0];
    const studyMinutes = dailyMinutes[dayKeyStr] || 0;
    const dayOfWeek = currentDay.getDay();
    const isRestDay = restDays.includes(dayOfWeek);

    if (studyMinutes >= 20) {
      // Estudou o mínimo necessário
      studiedDaysCount++;
      currentStreak++;
      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
      }
    } else if (isRestDay) {
      // Dia de descanso sem estudo: não quebra o streak, mas continua
      // (não incrementa, apenas mantém)
    } else {
      // Não estudou e não é dia de descanso: quebra o streak
      currentStreak = 0;
    }

    // Próximo dia
    currentDay.setDate(currentDay.getDate() + 1);
  }

  return bestStreak;
}

export { calculateBestStreakForAchievements };
