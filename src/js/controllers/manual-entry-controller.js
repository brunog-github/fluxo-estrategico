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
    this.filterController = null; // referência ao controlador de filtros
    this.notesController = null; // referência ao controlador de notas (Quill)
    this.ui = new ManualEntryUI();
    this.editingId = null;
    this._pendingNoteLinkedId = null; // ID temporário para vincular nota ao salvar
    this._hasUnsavedNote = false; // Flag para saber se o usuário editou notas

    this.attachInputMask();
    this._initNotesButton();
    this._initClickOutsideCleanup();
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
    this._pendingNoteLinkedId = null;
    this._hasUnsavedNote = false;
    this.ui.setTitle("Registrar Estudo");

    const subjects = await this.getCombinedSubjects();
    const todayISO = toLocalISO(new Date());

    this.ui.resetFields(todayISO);
    this.ui.resetNotes();
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

    // Carregar nota existente para este registro
    await this._loadExistingNote(item.id);

    this.ui.open();
  }

  // Inicializa o botão de notas para abrir o modal Quill
  _initNotesButton() {
    if (this.ui.btnToggleNotes) {
      this.ui.btnToggleNotes.addEventListener("click", () => {
        this._openNotesModal();
      });
    }
  }

  // Abre o modal de notas (Quill) vinculado ao registro atual
  async _openNotesModal() {
    if (!this.notesController) return;

    const linkedId =
      this.editingId ||
      this._pendingNoteLinkedId ||
      (this._pendingNoteLinkedId = Date.now());
    this._pendingNoteLinkedId = linkedId;
    this._hasUnsavedNote = true;

    // Ativa modo manual entry para que o handleClose não salve automaticamente
    this.notesController._manualEntryMode = true;

    // Callback para atualizar o botão quando o modal de notas fechar
    this.notesController._onManualClose = (hasContent) => {
      this.ui.updateNotesLabel(hasContent);
    };

    // Se já abriu notas para este mesmo linkedId, reabre preservando o conteúdo
    if (this.notesController.currentLinkedId == linkedId) {
      this.notesController.open();
    } else {
      await this.notesController.openLinkedNote(linkedId);
    }
  }

  // Limpa estado de notas se o usuário fechar o modal-manual-entry clicando fora
  _initClickOutsideCleanup() {
    window.addEventListener("click", (event) => {
      if (event.target === this.ui.modal) {
        this._cleanupNotesState();
        this._pendingNoteLinkedId = null;
        this._hasUnsavedNote = false;
      }
    });
  }

  // Carrega nota existente para o modo edição
  async _loadExistingNote(linkedId) {
    const allNotes = await dbService.getNotes();
    const note = allNotes.find((n) => n.linkedId == linkedId);
    this.ui.updateNotesLabel(!!note);
  }

  // ------------------------
  // FECHAR MODAL
  // ------------------------
  close() {
    this._cleanupNotesState();
    this._pendingNoteLinkedId = null;
    this._hasUnsavedNote = false;
    this.ui.close();
  }

  // Limpa o estado de notas no NotesController
  _cleanupNotesState() {
    if (this.notesController) {
      this.notesController._manualEntryMode = false;
      this.notesController._onManualClose = null;
      this.notesController.currentLinkedId = null;
      this.notesController.tempContent = "";
      this.notesController.originalContent = "";
    }
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

      // Salvar nota via NotesController (conteúdo que ficou em memória)
      if (this._hasUnsavedNote && this.notesController) {
        await this.notesController.saveFinalNote(this.editingId);
      }

      this.toast.showToast("success", "Registro atualizado com sucesso!");
      this.editingId = null;
    } else {
      // MODO CRIAÇÃO: Novo registro
      // Usa o ID pendente (se o usuário abriu notas) ou gera um novo
      const entryId = this._pendingNoteLinkedId || Date.now();
      const entry = {
        id: entryId,
        date: `${formattedDate} às ${data.entryTime}`,
        subject: data.subject,
        duration: data.time,
        questions: data.questions || 0,
        correct: data.correct || 0,
        category: category,
      };

      await dbService.addHistoryEntry(entry);

      // Salvar nota via NotesController (conteúdo que ficou em memória)
      if (this._hasUnsavedNote && this.notesController) {
        await this.notesController.saveFinalNote(entryId);
      }

      this.toast.showToast("success", "Estudo registrado!");
    }

    // Limpar estado de notas
    this._pendingNoteLinkedId = null;
    this._hasUnsavedNote = false;
    this._cleanupNotesState();

    if (this.reports) {
      await this.reports.updateCharts();

      // Re-aplicar filtros ativos (ou renderizar sem filtro se não houver)
      if (this.filterController) {
        await this.filterController.init();
        await this.filterController.applyFilters();
      } else {
        await this.reports.renderHistory();
        await this.reports.updateSummary();
      }
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
