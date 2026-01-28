import { HistoryFilterUI } from "../ui/history-filterUI.js";
import { filterHistory } from "../utils/history-filter-utils.js";
import { dbService } from "../services/db/db-service.js";

export class HistoryFilterController {
  constructor(reportsController) {
    this.reports = reportsController; // usado para recarregar tabela e gráficos
    this.ui = new HistoryFilterUI();
  }

  // Preencher dropdown + datas
  async init() {
    const history = await dbService.getHistory();
    const subjectsFromHistory = [
      ...new Set(history.map((entry) => entry.subject)),
    ];

    const categoriesData = await dbService.getCategories();
    const configCategories = categoriesData.map((c) => c.name || c);
    const historyCategories = history.map((h) => h.category).filter((c) => c);

    // Junta tudo e remove duplicatas usando Set
    const uniqueCategories = [
      ...new Set([...configCategories, ...historyCategories]),
    ].sort();

    this.ui.applyMaxDate();
    this.ui.fillSubjects(subjectsFromHistory);
    this.ui.fillCategories(uniqueCategories);
  }

  // Quando mudar qualquer filtro
  async applyFilters() {
    const history = await dbService.getHistory();
    const allNotes = await dbService.getNotes();
    const filters = this.ui.getFilters();

    const filtered = filterHistory(history, filters, allNotes);

    await this.reports.ui.renderHistoryTable(
      filtered,
      (id) => {
        this.reports.deleteEntry(id);
      },
      (item) => {
        this.reports.onEditHandler(item);
      },
      (id) => {
        if (this.reports.onViewNotesHandler) {
          this.reports.onViewNotesHandler(id);
        }
      },
    );

    await this.reports.updateSummary(filtered, filters);
  }

  clearFilters() {
    this.ui.clearFields();
    return this.applyFilters(); // Retorna a Promise
  }
}
