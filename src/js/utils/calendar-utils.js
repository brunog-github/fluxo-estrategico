// Converte "DD/MM/YYYY" → YYYYMMDD (número)
export function dateStrToInt(dateStr) {
  const parts = dateStr.split("/");
  if (parts.length < 3) return 0;
  return parseInt(parts[2] + parts[1] + parts[0]);
}

// Gera string "DD/MM/YYYY" de uma Date()
export function formatDate(date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

// Dicionário de meses
export const CAL_MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
