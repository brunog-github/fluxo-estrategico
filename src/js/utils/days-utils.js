export const MAPA_DIAS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

// [0, 6] → "Domingo, Sábado"
export function convertRestDaysToString(indices) {
  if (!Array.isArray(indices)) return "";
  return indices.map((i) => MAPA_DIAS[i]).join(", ");
}

// "Domingo, sábado" → [0, 6]
export function convertStringToRestDays(text) {
  if (!text) return [];
  const normalized = text.toLowerCase();

  const result = [];
  MAPA_DIAS.forEach((dia, index) => {
    if (normalized.includes(dia.toLowerCase())) result.push(index);
  });

  return result;
}
