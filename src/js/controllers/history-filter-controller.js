import { HistoryFilterUI } from "../ui/history-filterUI.js";
import { filterHistory } from "../utils/history-filter-utils.js";

export class HistoryFilterController {
  constructor(reportsController) {
    this.reports = reportsController; // usado para recarregar tabela e gráficos
    this.ui = new HistoryFilterUI();
  }

  // Preencher dropdown + datas
  init() {
    const history = JSON.parse(localStorage.getItem("studyHistory")) || [];
    const subjectsFromHistory = [
      ...new Set(history.map((entry) => entry.subject)),
    ];

    this.ui.applyMaxDate();
    this.ui.fillSubjects(subjectsFromHistory);
  }

  // Quando mudar qualquer filtro
  applyFilters() {
    const history = JSON.parse(localStorage.getItem("studyHistory")) || [];
    const filters = this.ui.getFilters();

    const filtered = filterHistory(history, filters);

    this.reports.ui.renderHistoryTable(
      filtered,
      (id) => {
        this.reports.deleteEntry(id);
      },
      (item) => {
        this.reports.onEditHandler(item);
      }
    );
  }

  clearFilters() {
    this.ui.clearFields();
    this.applyFilters();
  }
}
