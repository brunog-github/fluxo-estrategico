/**
 * Weekly Goals Controller
 * Gerencia a lógica de metas semanais de estudo
 */

import { dbService } from "../services/db/db-service.js";
import { WeeklyGoalsUI } from "../ui/weekly-goalsUI.js";

export class WeeklyGoalsController {
  constructor(toast) {
    this.ui = new WeeklyGoalsUI();
    this.toast = toast;
    this.currentGoals = null;
  }

  /**
   * Inicializar o controller
   */
  async init() {
    await this.loadGoals();
    this.attachEvents();
    await this.render();
  }

  /**
   * Carregar metas do banco de dados
   */
  async loadGoals() {
    try {
      const goals = await dbService.getSetting("weeklyGoals");
      this.currentGoals = goals || { duration: "", questions: "" };
    } catch (error) {
      console.error("[WEEKLY_GOALS] Erro ao carregar metas:", error);
      this.currentGoals = { duration: "", questions: "" };
    }
  }

  /**
   * Calcular progresso da semana atual (segunda a domingo)
   * @returns {Promise<Object>} { duration: { current, percentage }, questions: { current, percentage } }
   */
  async calculateWeeklyProgress() {
    try {
      // Calcular início da semana (segunda-feira)
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado

      // Calcular a segunda-feira da semana atual
      let daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Se for domingo, volta 6 dias; senão, volta (dia - 1) dias
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - daysToMonday);
      weekStart.setHours(0, 0, 0, 0);

      // Calcular o domingo da semana atual
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const allHistory = await dbService.getHistory();

      // Filtrar histórico da semana atual (segunda a domingo)
      const weeklyHistory = allHistory.filter((entry) => {
        if (!entry.date) return false;
        const entryDate = this.parseHistoryDate(entry.date);
        return entryDate >= weekStart && entryDate <= weekEnd;
      });

      // Calcular totais
      const totalDuration = this.calculateTotalDuration(weeklyHistory);
      const totalQuestions = weeklyHistory.reduce((sum, entry) => {
        return sum + (parseInt(entry.questions) || 0);
      }, 0);

      // Calcular percentuais
      const durationGoal = this.parseGoalDuration(this.currentGoals.duration);
      const questionsGoal = parseInt(this.currentGoals.questions) || 0;

      const durationPercentage =
        durationGoal > 0 ? (totalDuration / durationGoal) * 100 : 0;
      const questionsPercentage =
        questionsGoal > 0 ? (totalQuestions / questionsGoal) * 100 : 0;

      return {
        duration: {
          current: this.formatMinutesToHHMM(totalDuration),
          percentage: Math.min(durationPercentage, 100),
        },
        questions: {
          current: totalQuestions,
          percentage: Math.min(questionsPercentage, 100),
        },
      };
    } catch (error) {
      console.error("[WEEKLY_GOALS] Erro ao calcular progresso:", error);
      return {
        duration: { current: "00:00", percentage: 0 },
        questions: { current: 0, percentage: 0 },
      };
    }
  }

  /**
   * Parsear data do histórico (formato: "DD/MM/YYYY às HH:MM")
   * @param {string} dateStr
   * @returns {Date}
   */
  parseHistoryDate(dateStr) {
    const [datePart] = dateStr.split(" às ");
    const [day, month, year] = datePart.split("/");
    return new Date(year, month - 1, day);
  }

  /**
   * Calcular duração total em minutos
   * @param {Array} history
   * @returns {number} Total em minutos
   */
  calculateTotalDuration(history) {
    return history.reduce((totalMinutes, entry) => {
      const [hours, minutes, seconds] = (entry.duration || "0:0:0")
        .split(":")
        .map(Number);
      const entryMinutes = hours * 60 + minutes + (seconds >= 30 ? 1 : 0);
      return totalMinutes + entryMinutes;
    }, 0);
  }

  /**
   * Parsear duração da meta (formato: "HH:MM")
   * @param {string} goalDuration
   * @returns {number} Total em minutos
   */
  parseGoalDuration(goalDuration) {
    if (!goalDuration) return 0;
    const [hours, minutes] = goalDuration.split(":").map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  }

  /**
   * Formatar minutos para HH:MM
   * @param {number} minutes
   * @returns {string}
   */
  formatMinutesToHHMM(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}`;
  }

  /**
   * Renderizar o card com progresso
   */
  async render() {
    await this.loadGoals();
    const progress = await this.calculateWeeklyProgress();
    this.ui.renderCard(this.currentGoals, progress);
  }

  /**
   * Anexar event listeners
   */
  attachEvents() {
    // Botão de editar (abre modal)
    // Usar closest() para capturar cliques no botão ou em seus filhos (como o ícone)
    document.addEventListener("click", (e) => {
      if (e.target.closest("#btn-edit-weekly-goals")) {
        this.openModal();
      }
    });

    // Fechar modal
    this.ui.closeBtn.addEventListener("click", () => this.closeModal());
    this.ui.cancelBtn.addEventListener("click", () => this.closeModal());

    // Salvar
    this.ui.form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.save();
    });

    // Formatar duração enquanto digita
    this.ui.durationInput.addEventListener("input", (e) => {
      const formatted = this.ui.formatDurationInput(e.target.value);
      e.target.value = formatted;
    });
  }

  /**
   * Abrir modal
   */
  async openModal() {
    await this.loadGoals();
    this.ui.loadFormData(this.currentGoals);
    this.ui.openModal();
    // Focar no primeiro input
    setTimeout(() => this.ui.durationInput.focus(), 100);
  }

  /**
   * Fechar modal
   */
  closeModal() {
    this.ui.closeModal();
  }

  /**
   * Validar se um valor de duração é válido (não é "00:00")
   * @param {string} duration
   * @returns {boolean}
   */
  isValidGoalDuration(duration) {
    if (!duration || duration === "00:00" || duration === "0:00") return false;
    return true;
  }

  /**
   * Validar se um valor de questões é válido (não é 0)
   * @param {string|number} questions
   * @returns {boolean}
   */
  isValidGoalQuestions(questions) {
    if (!questions) return false;
    const num = parseInt(questions);
    return !isNaN(num) && num > 0;
  }

  /**
   * Salvar metas
   */
  async save() {
    const formData = this.ui.getFormData();

    // Validar duração
    const hasValidDuration =
      formData.duration && this.isValidGoalDuration(formData.duration);
    const hasValidQuestions =
      formData.questions && this.isValidGoalQuestions(formData.questions);

    // Se tem duração, validar o formato
    if (formData.duration && !this.ui.isValidDuration(formData.duration)) {
      this.toast.showToast(
        "error",
        "Formato de duração inválido. Use HH:MM (ex: 15:30)",
      );
      return;
    }

    // Se tem questões, validar se é número
    if (formData.questions && isNaN(parseInt(formData.questions))) {
      this.toast.showToast("error", "Questões deve ser um número válido");
      return;
    }

    try {
      // Salvar no banco de dados
      // Se ambos estão vazios/zerados, salva como vazio (nenhuma meta)
      const goalsToSave = {
        duration: hasValidDuration ? formData.duration : "",
        questions: hasValidQuestions ? parseInt(formData.questions) : "",
      };

      await dbService.setSetting("weeklyGoals", goalsToSave);
      this.currentGoals = goalsToSave;

      // Fechar modal e atualizar renderização
      this.ui.closeModal();
      await this.render();

      // Feedback visual
      const message =
        hasValidDuration || hasValidQuestions
          ? "Metas salvas com sucesso!"
          : "Metas removidas.";
      this.toast.showToast("success", message);
    } catch (error) {
      console.error("[WEEKLY_GOALS] Erro ao salvar metas:", error);
      this.toast.showToast("error", "Erro ao salvar metas. Tente novamente.");
    }
  }

  /**
   * Obter metas atuais
   * @returns {Object} { duration, questions }
   */
  getGoals() {
    return this.currentGoals;
  }
}
