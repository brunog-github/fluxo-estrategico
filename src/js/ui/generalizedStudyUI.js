export class GeneralizedStudyUI {
  constructor() {
    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.hasMoved = false; // Flag para saber se houve movimento
    this.dragThreshold = 5; // Pixels de threshold para considerar um drag
  }

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

    // Restaurar posição salva e inicializar drag
    this.restoreFloatingButtonPosition();
    this.initFloatingButtonDrag();
  }

  // Inicializar evento de drag
  initFloatingButtonDrag() {
    const container = document.getElementById("generalized-study-container");
    const button = document.getElementById("btn-generalized-study");
    if (!container) return;

    // Events de drag no container - MOUSE
    container.addEventListener("mousedown", (e) =>
      this.handleDragStart(e, container),
    );
    document.addEventListener("mousemove", (e) =>
      this.handleDragMove(e, container),
    );
    document.addEventListener("mouseup", (e) =>
      this.handleDragEnd(e, container),
    );

    // Events de drag no container - TOUCH (para celular)
    container.addEventListener("touchstart", (e) =>
      this.handleTouchStart(e, container),
    );
    document.addEventListener("touchmove", (e) =>
      this.handleTouchMove(e, container),
    );
    document.addEventListener("touchend", (e) =>
      this.handleTouchEnd(e, container),
    );

    // Prevenir clique do botão se houve drag - usar capture phase
    if (button) {
      button.addEventListener(
        "click",
        (e) => {
          if (this.hasMoved) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            this.hasMoved = false; // Reset para próxima interação
          }
        },
        true, // capture phase - executa antes de outros listeners
      );
    }
  }

  // Handle do início do drag
  handleDragStart(e, container) {
    if (e.button !== 0) return; // Apenas botão esquerdo

    this.isDragging = true;
    this.hasMoved = false; // Reset flag de movimento

    // Rastrear posição inicial do mouse
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;

    // Calcular offset do mouse em relação ao container
    const rect = container.getBoundingClientRect();
    this.dragOffsetX = e.clientX - rect.left;
    this.dragOffsetY = e.clientY - rect.top;

    container.style.cursor = "grabbing";
  }

  // Handle do movimento do drag
  handleDragMove(e, container) {
    if (!this.isDragging) return;

    // Calcular distância movida desde o início
    const distX = Math.abs(e.clientX - this.dragStartX);
    const distY = Math.abs(e.clientY - this.dragStartY);

    // Se ultrapassou o threshold, marcar como movimento real
    if (distX > this.dragThreshold || distY > this.dragThreshold) {
      this.hasMoved = true;
    }

    // Só mover o container se houver movimento real
    if (!this.hasMoved) return;

    const x = e.clientX - this.dragOffsetX;
    const y = e.clientY - this.dragOffsetY;

    // Limitar movimento dentro da viewport
    const newX = Math.max(
      0,
      Math.min(x, window.innerWidth - container.offsetWidth),
    );
    const newY = Math.max(
      0,
      Math.min(y, window.innerHeight - container.offsetHeight),
    );

    container.style.position = "fixed";
    container.style.left = newX + "px";
    container.style.top = newY + "px";
    container.style.right = "auto";
    container.style.bottom = "auto";
  }

  // Handle do fim do drag
  handleDragEnd(e, container) {
    if (!this.isDragging) return;

    this.isDragging = false;
    container.style.cursor = "grab";

    // Se houve movimento, salvar a nova posição e NÃO ativar o clique
    if (this.hasMoved) {
      const rect = container.getBoundingClientRect();
      const position = {
        x: rect.left,
        y: rect.top,
      };
      localStorage.setItem("floatingButtonPosition", JSON.stringify(position));

      // Prevenir o clique do botão
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // ============================================================
  // TOUCH EVENTS - Para dispositivos móveis
  // ============================================================

  handleTouchStart(e, container) {
    if (e.touches.length !== 1) return; // Apenas um dedo

    this.isDragging = true;
    this.hasMoved = false;

    const touch = e.touches[0];

    // Rastrear posição inicial do toque
    this.dragStartX = touch.clientX;
    this.dragStartY = touch.clientY;

    // Calcular offset do toque em relação ao container
    const rect = container.getBoundingClientRect();
    this.dragOffsetX = touch.clientX - rect.left;
    this.dragOffsetY = touch.clientY - rect.top;

    container.style.cursor = "grabbing";
  }

  handleTouchMove(e, container) {
    if (!this.isDragging || e.touches.length !== 1) return;

    const touch = e.touches[0];

    // Calcular distância movida desde o início
    const distX = Math.abs(touch.clientX - this.dragStartX);
    const distY = Math.abs(touch.clientY - this.dragStartY);

    // Se ultrapassou o threshold, marcar como movimento real
    if (distX > this.dragThreshold || distY > this.dragThreshold) {
      this.hasMoved = true;
    }

    // Só mover o container se houver movimento real
    if (!this.hasMoved) return;

    const x = touch.clientX - this.dragOffsetX;
    const y = touch.clientY - this.dragOffsetY;

    // Limitar movimento dentro da viewport
    const newX = Math.max(
      0,
      Math.min(x, window.innerWidth - container.offsetWidth),
    );
    const newY = Math.max(
      0,
      Math.min(y, window.innerHeight - container.offsetHeight),
    );

    container.style.position = "fixed";
    container.style.left = newX + "px";
    container.style.top = newY + "px";
    container.style.right = "auto";
    container.style.bottom = "auto";

    // Prevenir scroll enquanto arrasta
    e.preventDefault();
  }

  handleTouchEnd(e, container) {
    if (!this.isDragging) return;

    this.isDragging = false;
    container.style.cursor = "grab";

    // Se houve movimento, salvar a nova posição
    if (this.hasMoved) {
      const rect = container.getBoundingClientRect();
      const position = {
        x: rect.left,
        y: rect.top,
      };
      localStorage.setItem("floatingButtonPosition", JSON.stringify(position));

      e.preventDefault();
    }
  }

  // Restaurar posição salva do localStorage
  restoreFloatingButtonPosition() {
    const container = document.getElementById("generalized-study-container");
    if (!container) return;

    const savedPosition = localStorage.getItem("floatingButtonPosition");
    if (savedPosition) {
      try {
        const { x, y } = JSON.parse(savedPosition);
        container.style.position = "fixed";
        container.style.left = x + "px";
        container.style.top = y + "px";
        container.style.right = "auto";
        container.style.bottom = "auto";
      } catch (error) {
        console.error("Erro ao restaurar posição do botão flutuante:", error);
      }
    }
  }

  // Mostrar modal de estudo rápido
  showQuickStudyModal(elapsedSeconds, restoreMode = false) {
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

    // Só limpar campos se não for restauração
    if (!restoreMode) {
      document.getElementById("quick-study-questions").value = "";
      document.getElementById("quick-study-correct").value = "";
      document.getElementById("quick-study-category").value = "";
      document.getElementById("quick-study-subject").value = "";
      document.getElementById("quick-study-no-subject-checkbox").checked =
        false;
      document.getElementById("quick-study-subject-group").style.display =
        "block";

      // Limpar display de tempo pausado
      const pausedDisplay = document.getElementById(
        "quick-study-paused-display",
      );
      if (pausedDisplay) {
        pausedDisplay.style.display = "none";
        pausedDisplay.innerText = "";
      }
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
