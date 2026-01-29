/**
 * Weekly Goals UI
 * Responsável pela renderização visual do card e modal de metas semanais
 */

export class WeeklyGoalsUI {
  constructor() {
    this.modal = document.getElementById("modal-weekly-goals");
    this.modalContainer = document.querySelector(
      ".weekly-goals-modal-container",
    );
    this.durationInput = document.getElementById("weekly-duration");
    this.questionsInput = document.getElementById("weekly-questions");
    this.form = document.getElementById("form-weekly-goals");
    this.closeBtn = document.getElementById("close-weekly-goals-modal");
    this.cancelBtn = document.getElementById("btn-cancel-weekly-goals");
    this.saveBtn = document.getElementById("btn-save-weekly-goals");

    // Fechar ao clicar fora do modal
    window.addEventListener("click", (event) => {
      if (event.target === this.modal) {
        this.closeModal();
      }
    });
  }

  /**
   * Validar se um valor de duração é considerado "vazio" (00:00, 0:00, etc)
   * @param {string} duration
   * @returns {boolean}
   */
  isDurationEmpty(duration) {
    return !duration || duration === "00:00" || duration === "0:00";
  }

  /**
   * Validar se um valor de questões é considerado "vazio" (0, "", etc)
   * @param {string|number} questions
   * @returns {boolean}
   */
  isQuestionsEmpty(questions) {
    return !questions || parseInt(questions) === 0;
  }

  /**
   * Renderizar o card de metas semanais na home
   * @param {Object} goals - { duration: "15:30", questions: 100 } ou null
   * @param {Object} progress - { duration: { current, percentage }, questions: { current, percentage } }
   */
  renderCard(goals, progress = null) {
    const container = document.getElementById("weekly-goals-container");
    if (!container) return;

    // Considerar como vazio se não tem metas ou se as metas têm valores zerados/vazios
    const hasDuration =
      goals?.duration && !this.isDurationEmpty(goals.duration);
    const hasQuestions =
      goals?.questions && !this.isQuestionsEmpty(goals.questions);
    const hasAnyGoal = hasDuration || hasQuestions;

    if (!hasAnyGoal) {
      // Estado vazio
      container.innerHTML = `
        <div class="weekly-goals-card-header">
          <strong class="weekly-goals-card-title">
            METAS DE ESTUDO
          </strong>
          <button
            id="btn-edit-weekly-goals"
            class="weekly-goals-btn-edit"
            title="Editar metas"
          >
            <i class="fa-regular fa-pen-to-square"></i>
          </button>
        </div>
        <div class="weekly-goals-empty-state">
          <p class="weekly-goals-empty-state-text">
            Nenhuma meta configurada
          </p>
        </div>
      `;
    } else {
      // Com dados
      const durationPercentage = progress?.duration?.percentage || 0;
      const questionsPercentage = progress?.questions?.percentage || 0;
      const durationCurrent = progress?.duration?.current || "00:00";
      const questionsCurrent = progress?.questions?.current || 0;

      const goalsDurationFormatted = `${goals.duration.split(":")[0]}h${goals.duration.split(":")[1]}min`;
      const durationCurrentFormatted = `${durationCurrent.split(":")[0]}h${durationCurrent.split(":")[1]}min`;

      container.innerHTML = `
        <div class="weekly-goals-card-header">
          <strong class="weekly-goals-card-title">
            METAS DE ESTUDO SEMANAL
          </strong>
          <button
            id="btn-edit-weekly-goals"
            class="weekly-goals-btn-edit"
            title="Editar metas"
            style="background:transparent; border:none; font-size:16px; cursor:pointer;"
          >
            <i class="fa-regular fa-pen-to-square"></i>
          </button>
        </div>
        <div class="weekly-goals-content">
          ${
            hasDuration
              ? `
            <div class="weekly-goals-item">
              <div class="weekly-goals-header-row">
                <span class="weekly-goals-item-label">Horas de Estudo</span>
                <span class="weekly-goals-progress-text">${durationCurrentFormatted}/${goalsDurationFormatted}</span>
              </div>
              <div class="weekly-goals-progress-bar">
                <div class="weekly-goals-progress-fill" style="width: ${durationPercentage}%"></div>
              </div>
              <span class="weekly-goals-progress-percentage">${Math.round(durationPercentage)}%</span>
            </div>
          `
              : ""
          }
          ${
            hasQuestions
              ? `
            <div class="weekly-goals-item">
              <div class="weekly-goals-header-row">
                <span class="weekly-goals-item-label">Questões</span>
                <span class="weekly-goals-progress-text">${questionsCurrent}/${goals.questions}</span>
              </div>
              <div class="weekly-goals-progress-bar">
                <div class="weekly-goals-progress-fill" style="width: ${questionsPercentage}%"></div>
              </div>
              <span class="weekly-goals-progress-percentage">${Math.round(questionsPercentage)}%</span>
            </div>
          `
              : ""
          }
        </div>
      `;
    }
  }

  /**
   * Abrir modal de metas
   */
  openModal() {
    this.modal.classList.remove("hidden");
  }

  /**
   * Fechar modal
   */
  closeModal() {
    this.modal.classList.add("hidden");
  }

  /**
   * Carregar valores no formulário
   * @param {Object} goals - { duration: "15:30", questions: 100 }
   */
  loadFormData(goals) {
    if (goals) {
      this.durationInput.value = goals.duration || "";
      this.questionsInput.value = goals.questions || "";
    } else {
      this.durationInput.value = "";
      this.questionsInput.value = "";
    }
  }

  /**
   * Obter dados do formulário
   * @returns {Object} { duration, questions }
   */
  getFormData() {
    return {
      duration: this.durationInput.value.trim(),
      questions: this.questionsInput.value.trim(),
    };
  }

  /**
   * Validar formato da duração (HH:MM)
   * @param {string} duration
   * @returns {boolean}
   */
  isValidDuration(duration) {
    const regex = /^(\d{1,2}):(\d{2})$/;
    if (!regex.test(duration)) return false;

    const [_, hours, minutes] = duration.match(regex);
    return parseInt(minutes) < 60;
  }

  /**
   * Formatar entrada de duração automaticamente
   * @param {string} value
   * @returns {string}
   */
  formatDurationInput(value) {
    // Remove caracteres não numéricos
    let cleaned = value.replace(/\D/g, "");

    // Limita a 4 dígitos
    if (cleaned.length > 4) {
      cleaned = cleaned.slice(0, 4);
    }

    // Formata como HH:MM
    if (cleaned.length >= 3) {
      return cleaned.slice(0, -2) + ":" + cleaned.slice(-2);
    }

    return cleaned;
  }

  /**
   * Limpar formulário
   */
  clearForm() {
    this.form.reset();
  }
}
