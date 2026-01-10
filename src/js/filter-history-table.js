/**
 * 1. Preenche o <select> de matérias com as opções disponíveis
 */
function populateFilterSubjects() {
  const select = document.getElementById("filter-subject");

  // --- NOVO: BLOQUEIO DE DATAS FUTURAS ---
  const dateStart = document.getElementById("filter-start");
  const dateEnd = document.getElementById("filter-end");

  if (dateStart && dateEnd) {
    // Pega a data de hoje no formato YYYY-MM-DD
    const today = new Date().toISOString().split("T")[0];

    // Define o atributo max
    dateStart.setAttribute("max", today);
    dateEnd.setAttribute("max", today);
  }

  if (!select) return;

  // Salva o valor atual para não perder a seleção se a função rodar de novo
  const currentValue = select.value;

  // Limpa e recria a opção padrão
  select.innerHTML = '<option value="">Todas as Matérias</option>';

  const subjects = JSON.parse(localStorage.getItem("studyCycle")) || [];

  subjects.forEach((sub) => {
    const option = document.createElement("option");
    option.value = sub;
    option.innerText = sub;
    select.appendChild(option);
  });

  // Restaura o valor selecionado (se ainda existir)
  select.value = currentValue;
}

/**
 * 2. Lógica Pura de Filtragem
 * Recebe o histórico completo e retorna apenas o que obedece aos filtros
 */
function getFilteredHistory(fullHistory) {
  const subjectFilter = document.getElementById("filter-subject")?.value;
  const startDate = document.getElementById("filter-start")?.value; // YYYY-MM-DD
  const endDate = document.getElementById("filter-end")?.value; // YYYY-MM-DD

  // Se não tem nenhum filtro ativo, retorna tudo logo para ganhar performance
  if (!subjectFilter && !startDate && !endDate) {
    return fullHistory;
  }

  return fullHistory.filter((item) => {
    // A. Filtro de Matéria
    if (subjectFilter && item.subject !== subjectFilter) {
      return false;
    }

    // B. Filtro de Data
    if (startDate || endDate) {
      // item.date é "DD/MM/YYYY às HH:mm" -> pegamos só a data
      const datePart = item.date.split(" ")[0];
      const [d, m, y] = datePart.split("/");
      const itemIsoDate = `${y}-${m}-${d}`; // Converte para YYYY-MM-DD para comparar

      if (startDate && itemIsoDate < startDate) return false;
      if (endDate && itemIsoDate > endDate) return false;
    }

    return true; // Passou por tudo
  });
}

/**
 * 3. Limpar Filtros
 */
function clearHistoryFilters() {
  const ids = ["filter-subject", "filter-start", "filter-end"];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  // Chama a função principal para redesenhar a tabela
  renderHistoryTable();
}
