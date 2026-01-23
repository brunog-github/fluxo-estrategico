import { dbService } from "../services/db/db-service.js";

// Mapeamento de cores para categorias
export const CATEGORY_COLORS = {
  // Categorias fixas (padrão) - cores vibrantes e visualmente distintas
  Teoria: "#7C3AED", // Roxo profundo
  Revisão: "#DC2626", // Vermelho vibrante
  Questões: "#16A34A", // Verde escuro
  Simulados: "#2563EB", // Azul vibrante
  "Leitura de lei": "#F59E0B", // Âmbar
};

// Cores adicionais para categorias personalizadas (bem distribuídas)
const ADDITIONAL_COLORS = [
  "#06B6D4", // Cyan vibrante
  "#EC4899", // Pink/Magenta
  "#F97316", // Orange vibrante
  "#8B5CF6", // Violet
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#EAB308", // Yellow
  "#6B7280", // Gray
  "#D97706", // Amber médio
  "#7C2D12", // Orange escuro
];

// Paleta de cores para o seletor (apenas cores únicas e não-fixas)
export const COLOR_PALETTE = [
  "#A855F7", // Roxo médio
  "#06B6D4", // Cyan
  "#EC4899", // Pink
  "#F97316", // Orange
  "#8B5CF6", // Violet
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#EAB308", // Yellow
  "#6B7280", // Gray
  "#D97706", // Amber médio
  "#7C2D12", // Orange escuro
  "#10B981", // Emerald
  "#F43F5E", // Rose
  "#3B82F6", // Blue
  "#8B4513", // Brown
  "#00CED1", // Dark turquoise
];

let colorIndex = 0;

export async function getCategoryColor(category) {
  // Primeiro verifica cores fixas
  if (CATEGORY_COLORS[category]) {
    return CATEGORY_COLORS[category];
  }

  // Depois verifica cores personalizadas salvas
  const customColors = await getCustomCategoryColors();
  if (customColors[category]) {
    return customColors[category];
  }

  // Se não tem cor personalizada, usa cores adicionais ciclicamente
  const color = ADDITIONAL_COLORS[colorIndex % ADDITIONAL_COLORS.length];
  colorIndex++;
  return color;
}

export function getDefaultCategories() {
  return Object.keys(CATEGORY_COLORS);
}

export function isDefaultCategory(category) {
  return getDefaultCategories().includes(category);
}

export function resetColorIndex() {
  colorIndex = 0;
}

// --- GERENCIAR CORES PERSONALIZADAS ---
export async function getCustomCategoryColors() {
  return await dbService.getCustomCategoryColors();
}

export async function setCustomCategoryColor(category, color) {
  const colors = await getCustomCategoryColors();
  colors[category] = color;
  await dbService.setCustomCategoryColors(colors);
}

export async function removeCustomCategoryColor(category) {
  const colors = await getCustomCategoryColors();
  delete colors[category];
  await dbService.setCustomCategoryColors(colors);
}
