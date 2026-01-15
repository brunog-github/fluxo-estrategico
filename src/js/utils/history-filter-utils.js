// Converte "DD/MM/YYYY às HH:mm" → "YYYY-MM-DD"
export function extractISOFromHistoryDate(dateStr) {
  const datePart = dateStr.split(" ")[0];
  const [d, m, y] = datePart.split("/");
  return `${y}-${m}-${d}`;
}

// Lógica pura de filtragem sem DOM
export function filterHistory(fullHistory, filters) {
  const { subject, category, start, end } = filters;

  if (!subject && !category && !start && !end) {
    return fullHistory;
  }

  return fullHistory.filter((item) => {
    // filtro por matéria
    if (subject && item.subject !== subject) return false;

    // 2. Filtro por Categoria (NOVO)
    // Se o item não tem categoria, consideramos como "-" ou string vazia para comparar
    const itemCat = item.category || "";
    if (category && itemCat !== category) return false;

    // filtro por data
    if (start || end) {
      const itemISO = extractISOFromHistoryDate(item.date);

      if (start && itemISO < start) return false;
      if (end && itemISO > end) return false;
    }

    return true;
  });
}
