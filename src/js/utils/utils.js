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
