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

    const subjects = JSON.parse(localStorage.getItem("studyCycle")) || [];
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

    const subjects = JSON.parse(localStorage.getItem("studyCycle")) || [];
    this.ui.setSubjectsList(subjects);

    // 1. Converter data "DD/MM/YYYY..." para ISO "YYYY-MM-DD" para o input
    const dateISO = formatDateToISO(item.date);

    // 2. Preencher UI
    this.ui.fillFields({
      subject: item.subject,
      dateISO: dateISO,
      time: item.duration, // Verifica qual nome você usa no objeto
      questions: item.questions,
      correct: item.correct,
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

  // ------------------------
  // SALVAR REGISTRO
  // ------------------------
  save() {
    const subject = this.ui.subjectSelect.value;
    const dateISO = this.ui.dateInput.value;
    const time = this.ui.timeInput.value;
    const questions = this.ui.questionsInput.value;
    const correct = this.ui.correctInput.value;

    if (!subject || !dateISO || time.length < 8 || time === "00:00:00") {
      this.toast.showToast(
        "error",
        "Preencha matéria, data e o tempo completo (00:00:00)."
      );
      return;
    }

    if (questions && correct && Number(correct) > Number(questions)) {
      this.toast.showToast(
        "error",
        "Acertos não podem ser maiores que questões."
      );
      return;
    }

    const formattedDate = formatDateToBR(dateISO);
    let history = JSON.parse(localStorage.getItem("studyHistory")) || [];

    // --- LÓGICA DE SALVAR (NOVO OU EDITAR) ---

    if (this.editingId) {
      // MODO EDIÇÃO: Procura pelo ID e atualiza
      const index = history.findIndex((h) => h.id === this.editingId);

      if (index !== -1) {
        // Atualiza mantendo o ID original
        history[index] = {
          id: this.editingId, // MANTÉM O MESMO ID
          date: formattedDate + " às 00:00",
          subject,
          duration: time,
          questions: questions || 0,
          correct: correct || 0,
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
        date: formattedDate + " às 00:00",
        subject,
        duration: time,
        questions: questions || 0,
        correct: correct || 0,
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
