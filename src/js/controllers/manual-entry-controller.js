import { ManualEntryUI } from "../ui/manual-entryUI.js";
import {
  toLocalISO,
  formatDateToBR,
  maskTimeValue,
} from "../utils/manual-entry-utils.js";
import { formatDateToISO } from "../utils/utils.js";

export class ManualEntryController {
  constructor(toast, reportsController) {
    this.toast = toast;
    this.reports = reportsController; // para atualizar tabelas e charts
    this.ui = new ManualEntryUI();
    this.editingId = null;

    this.attachInputMask();
  }

  // ------------------------
  // ABRIR MODAL
  // ------------------------
  open() {
    this.editingId = null;
    this.ui.setTitle("Registrar Estudo");

    const subjects = this.getCombinedSubjects();
    const todayISO = toLocalISO(new Date());

    this.ui.resetFields(todayISO);
    this.ui.setSubjectsList(subjects);
    this.setDateOption("today");

    this.ui.open();
  }

  // NOVO: Método para abrir em modo de EDIÇÃO
  openToEdit(item) {
    this.editingId = item.id; // Guarda referência do item original
    this.ui.setTitle("Editar Estudo");

    const subjects = this.getCombinedSubjects();
    this.ui.setSubjectsList(subjects);

    // 1. Converter data "DD/MM/YYYY às HH:mm" para ISO "YYYY-MM-DD" e "HH:mm"
    const [datePart, timePart] = item.date.split(" às ");
    const dateISO = formatDateToISO(datePart);
    const entryTime = timePart || "00:00";

    // 2. Preencher UI
    this.ui.fillFields({
      subject: item.subject,
      dateISO: dateISO,
      time: item.duration, // Verifica qual nome você usa no objeto
      questions: item.questions,
      correct: item.correct,
      entryTime: entryTime,
    });

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
  getCombinedSubjects() {
    // 1. Matérias ativas (Configurações)
    const activeSubjects = JSON.parse(localStorage.getItem("studyCycle")) || [];

    // 2. Matérias do histórico (Legado)
    const history = JSON.parse(localStorage.getItem("studyHistory")) || [];
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
  save() {
    const data = this.ui.getEntryData();

    if (
      !data.subject ||
      !data.date ||
      data.time.length < 8 ||
      data.time === "00:00:00"
    ) {
      this.toast.showToast(
        "error",
        "Preencha matéria, data e o tempo completo (00:00:00)."
      );
      return;
    }

    if (!data.entryTime) {
      this.toast.showToast("error", "A hora do registro é obrigatória.");
      return;
    }

    if (
      data.questions &&
      data.correct &&
      Number(data.correct) > Number(data.questions)
    ) {
      this.toast.showToast(
        "error",
        "Acertos não podem ser maiores que questões."
      );
      return;
    }

    const formattedDate = formatDateToBR(data.date);
    let history = JSON.parse(localStorage.getItem("studyHistory")) || [];

    // --- LÓGICA DE SALVAR (NOVO OU EDITAR) ---

    if (this.editingId) {
      // MODO EDIÇÃO: Procura pelo ID e atualiza
      const index = history.findIndex((h) => h.id === this.editingId);

      if (index !== -1) {
        // Atualiza mantendo o ID original
        history[index] = {
          id: this.editingId, // MANTÉM O MESMO ID
          date: `${formattedDate} às ${data.entryTime}`,
          subject: data.subject,
          duration: data.time,
          questions: data.questions || 0,
          correct: data.correct || 0,
        };
        this.toast.showToast("success", "Registro atualizado com sucesso!");
      } else {
        this.toast.showToast(
          "error",
          "Erro: Registro original não encontrado."
        );
      }

      this.editingId = null; // Limpa o estado
    } else {
      // MODO CRIAÇÃO (Novo ID)
      const entry = {
        id: Date.now(), // GERA NOVO ID
        date: `${formattedDate} às ${data.entryTime}`,
        subject: data.subject,
        duration: data.time,
        questions: data.questions || 0,
        correct: data.correct || 0,
      };
      history.push(entry);
      this.toast.showToast("success", "Estudo registrado!");
    }

    localStorage.setItem("studyHistory", JSON.stringify(history));

    if (this.reports) {
      this.reports.renderHistory();
      this.reports.updateCharts();
      this.reports.updateSummary();
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
