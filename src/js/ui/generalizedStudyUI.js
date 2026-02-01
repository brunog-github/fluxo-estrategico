export class GeneralizedStudyUI {
  // Criar botão flutuante na home
  createFloatingButton() {
    const container = document.getElementById("generalized-study-container");
    if (!container) return;

    const html = `
      <button 
        id="btn-generalized-study" 
        class="floating-study-btn"
        title="Iniciar estudo rápido"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path>
          <path d="M12 6v6l4 2"></path>
        </svg>
      </button>
    `;

    container.innerHTML = html;
  }

  // Mostrar modal de estudo rápido
  showQuickStudyModal(elapsedSeconds) {
    const modal = document.getElementById("quick-study-modal");
    if (!modal) return;

    // Formatar tempo decorrido
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;

    const formattedTime =
      `${hours < 10 ? "0" + hours : hours}:` +
      `${minutes < 10 ? "0" + minutes : minutes}:` +
      `${seconds < 10 ? "0" + seconds : seconds}`;

    document.getElementById("quick-study-timer-display").innerText =
      formattedTime;
    document.getElementById("quick-study-questions").value = "";
    document.getElementById("quick-study-correct").value = "";
    document.getElementById("quick-study-category").value = "";
    document.getElementById("quick-study-subject").value = "";
    document.getElementById("quick-study-no-subject-checkbox").checked = false;
    document.getElementById("quick-study-subject-group").style.display =
      "block";

    // Limpar display de tempo pausado
    const pausedDisplay = document.getElementById("quick-study-paused-display");
    if (pausedDisplay) {
      pausedDisplay.style.display = "none";
      pausedDisplay.innerText = "";
    }

    modal.style.display = "flex";
  }

  updatePausedDisplay(formattedTime, isPaused) {
    const el = document.getElementById("quick-study-paused-display");
    if (!el) return;

    el.innerText = "Tempo Pausado: " + formattedTime;
    el.style.display =
      formattedTime !== "00:00:00" || isPaused ? "block" : "none";
  }

  hideQuickStudyModal() {
    const modal = document.getElementById("quick-study-modal");
    if (modal) {
      modal.style.display = "none";
    }
  }

  getQuickStudyData() {
    return {
      questions: parseInt(
        document.getElementById("quick-study-questions").value || "0",
      ),
      correct: parseInt(
        document.getElementById("quick-study-correct").value || "0",
      ),
      category: document.getElementById("quick-study-category").value,
      subject: document.getElementById("quick-study-subject").value,
      noSubject: document.getElementById("quick-study-no-subject-checkbox")
        .checked,
    };
  }

  loadCategorySelectForQuickStudy(categories) {
    const select = document.getElementById("quick-study-category");
    if (!select) return;

    select.innerHTML = '<option value="">Selecione uma categoria...</option>';
    categories.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = cat;
      select.appendChild(option);
    });
  }

  loadSubjectSelectForQuickStudy(subjects) {
    const select = document.getElementById("quick-study-subject");
    if (!select) return;

    select.innerHTML = '<option value="">Sem matéria específica</option>';
    subjects.forEach((subject) => {
      const option = document.createElement("option");
      option.value = subject;
      option.textContent = subject;
      select.appendChild(option);
    });
  }

  toggleSubjectField(isDisabled) {
    const subjectGroup = document.getElementById("quick-study-subject-group");
    const subjectSelect = document.getElementById("quick-study-subject");

    if (isDisabled) {
      subjectGroup.style.display = "none";
      subjectSelect.value = "";
    } else {
      subjectGroup.style.display = "block";
    }
  }
}
