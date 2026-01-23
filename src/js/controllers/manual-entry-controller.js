import { ManualEntryUI } from "../ui/manual-entryUI.js";
import {
  toLocalISO,
  formatDateToBR,
  maskTimeValue,
} from "../utils/manual-entry-utils.js";
import { formatDateToISO } from "../utils/utils.js";
import { dbService } from "../services/db/db-service.js";

export class ManualEntryController {
  constructor(toast, reportsController) {
    this.toast = toast;
    this.reports = reportsController; // para atualizar tabelas e charts
    this.ui = new ManualEntryUI();
    this.editingId = null;

    this.attachInputMask();
  }

  async getAllCategories() {
    // Pega categorias configuradas
    const categoriesData = await dbService.getCategories();
    const configuredCategories = categoriesData.map((c) => c.name || c);

    // Pega categorias do histórico
    const history = await dbService.getHistory();
    const historicalCategories = history
      .map((item) => item.category)
      .filter((cat) => cat && cat !== "-"); // Remove undefined, null e "-"

    // Combina, remove duplicatas e ordena
    return [
      ...new Set([...configuredCategories, ...historicalCategories]),
    ].sort();
  }

  async loadCategorySelect() {
    const select = document.getElementById("manual-category");
    if (!select) return;

    const allCategories = await this.getAllCategories();

    // Limpa opções anteriores mas mantém o placeholder
    const placeholderOption = select.querySelector("option[value='']");
    select.innerHTML = "";

    if (placeholderOption) {
      select.appendChild(placeholderOption);
    }

    allCategories.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = cat;
      select.appendChild(option);
    });
  }

  // ------------------------
  // ABRIR MODAL
  // ------------------------
  async open() {
    this.editingId = null;
    this.ui.setTitle("Registrar Estudo");

    const subjects = await this.getCombinedSubjects();
    const todayISO = toLocalISO(new Date());

    this.ui.resetFields(todayISO);
    this.ui.setSubjectsList(subjects);
    await this.loadCategorySelect();
    this.setDateOption("today");

    this.ui.open();
  }

  // NOVO: Método para abrir em modo de EDIÇÃO
  async openToEdit(item) {
    this.editingId = item.id; // Guarda referência do item original
    this.ui.setTitle("Editar Estudo");

    const subjects = await this.getCombinedSubjects();
    this.ui.setSubjectsList(subjects);
    await this.loadCategorySelect();

    // 1. Converter data "DD/MM/YYYY às HH:mm" para ISO "YYYY-MM-DD" e "HH:mm"
    const [datePart, timePart] = item.date.split(" às ");
    const dateISO = formatDateToISO(datePart);
    const entryTime = timePart || "00:00";

    // 2. Preencher UI
    this.ui.fillFields({
      subject: item.subject,
      dateISO: dateISO,
      time: item.duration,
      questions: item.questions,
      correct: item.correct,
      entryTime: entryTime,
      category: item.category || "Teoria",
    });

    // 3. Selecionar a categoria no select
    const categorySelect = document.getElementById("manual-category");
    if (categorySelect && item.category) {
      categorySelect.value = item.category;
    }

    // Ajusta visualmente a seleção de data (Hoje ou Outro)
    const todayISO = toLocalISO(new Date());
    if (dateISO === todayISO) {
      this.setDateOption("today");
    } else {
      this.setDateOption("other");
      this.ui.dateInput.value = dateISO; // Garante que o valor vá para o input
    }

    this.ui.open();
  }

  // ------------------------
  // FECHAR MODAL
  // ------------------------
  close() {
    this.ui.close();
  }

  // Obtém matérias do Ciclo + Matérias que já existem no Histórico
  async getCombinedSubjects() {
    // 1. Matérias ativas (Configurações)
    const subjectsData = await dbService.getSubjects();
    const activeSubjects = subjectsData.map((s) => s.name || s);

    // 2. Matérias do histórico (Legado)
    const history = await dbService.getHistory();
    const historySubjects = history.map((item) => item.subject);

    // 3. Junta tudo e remove duplicados usando Set
    const uniqueSubjects = [
      ...new Set([...activeSubjects, ...historySubjects]),
    ];

    // 4. Retorna ordenado alfabeticamente para ficar bonito
    return uniqueSubjects.sort();
  }

  // ------------------------
  // SALVAR REGISTRO
  // ------------------------
  async save() {
    const data = this.ui.getEntryData();

    if (
      !data.subject ||
      !data.date ||
      data.time.length < 8 ||
      data.time === "00:00:00"
    ) {
      this.toast.showToast(
        "error",
        "Preencha matéria, data e o tempo completo (00:00:00).",
      );
      return;
    }

    if (!data.entryTime) {
      this.toast.showToast("error", "A hora do registro é obrigatória.");
      return;
    }

    const categorySelect = document.getElementById("manual-category");
    const category = categorySelect?.value;

    if (!category) {
      this.toast.showToast("info", "Selecione uma categoria antes de salvar.");
      return;
    }

    if (
      data.questions &&
      data.correct &&
      Number(data.correct) > Number(data.questions)
    ) {
      this.toast.showToast(
        "error",
        "Acertos não podem ser maiores que questões.",
      );
      return;
    }

    const formattedDate = formatDateToBR(data.date);

    // --- LÓGICA DE SALVAR (NOVO OU EDITAR) ---

    if (this.editingId) {
      // MODO EDIÇÃO: Atualiza no banco
      const entryData = {
        date: `${formattedDate} às ${data.entryTime}`,
        subject: data.subject,
        duration: data.time,
        questions: data.questions || 0,
        correct: data.correct || 0,
        category: category,
      };

      await dbService.updateHistoryEntry(this.editingId, entryData);
      this.toast.showToast("success", "Registro atualizado com sucesso!");
      this.editingId = null;
    } else {
      // MODO CRIAÇÃO: Novo registro
      const entry = {
        date: `${formattedDate} às ${data.entryTime}`,
        subject: data.subject,
        duration: data.time,
        questions: data.questions || 0,
        correct: data.correct || 0,
        category: category,
      };

      await dbService.addHistoryEntry(entry);
      this.toast.showToast("success", "Estudo registrado!");
    }

    if (this.reports) {
      await this.reports.renderHistory();
      await this.reports.updateCharts();
      await this.reports.updateSummary();
    }

    this.close();
  }

  // ------------------------
  // máscara input tempo
  // ------------------------
  attachInputMask() {
    this.ui.timeInput.addEventListener("input", (e) => {
      e.target.value = maskTimeValue(e.target.value);
    });
  }

  // ------------------------
  // Seleção de data
  // ------------------------
  setDateOption(option) {
    const now = new Date();

    this.ui.setChipSelection(option);

    if (option === "today") {
      this.ui.showDateInput(false);
      this.ui.dateInput.value = toLocalISO(now);
    } else if (option === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      this.ui.showDateInput(false);
      this.ui.dateInput.value = toLocalISO(y);
    } else {
      this.ui.showDateInput(true);
      if (!this.ui.dateInput.value) {
        this.ui.dateInput.value = toLocalISO(now);
      }
      this.ui.dateInput.focus();
    }
  }
}
