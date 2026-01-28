// Converte "DD/MM/YYYY às HH:mm" → "YYYY-MM-DD"
export function extractISOFromHistoryDate(dateStr) {
  const datePart = dateStr.split(" ")[0];
  const [d, m, y] = datePart.split("/");
  return `${y}-${m}-${d}`;
}

// Lógica pura de filtragem sem DOM
export function filterHistory(fullHistory, filters, allNotes = []) {
  const { subject, category, start, end, hasNotes } = filters;

  if (!subject && !category && !start && !end && !hasNotes) {
    return fullHistory;
  }

  // Se precisa filtrar por anotações, cria um Set de IDs que têm notas
  const notesIds = new Set();
  if (hasNotes) {
    allNotes.forEach((note) => {
      if (note.linkedId) {
        notesIds.add(note.linkedId);
      }
    });
  }

  return fullHistory.filter((item) => {
    // filtro por matéria
    if (subject && item.subject !== subject) return false;

    // 2. Filtro por Categoria
    // Se o item não tem categoria, consideramos como "-" ou string vazia para comparar
    const itemCat = item.category || "";
    if (category && itemCat !== category) return false;

    // filtro por data
    if (start || end) {
      const itemISO = extractISOFromHistoryDate(item.date);

      if (start && itemISO < start) return false;
      if (end && itemISO > end) return false;
    }

    // filtro por anotações
    if (hasNotes && !notesIds.has(item.id)) return false;

    return true;
  });
}
