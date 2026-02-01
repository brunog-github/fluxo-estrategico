import { GeneralizedStudyUI } from "../ui/generalizedStudyUI.js";
import { formatTime } from "../utils/utils.js";
import { dbService } from "../services/db/db-service.js";

export class GeneralizedStudyController {
  constructor(subjectsManager, db, toast, notes) {
    this.subjects = subjectsManager;
    this.db = db || dbService;
    this.toast = toast;
    this.notesController = notes;

    this.ui = new GeneralizedStudyUI();

    // Estado do timer rápido - usando a mesma lógica do TimerController
    this.seconds = 0;
    this.timerInterval = null;
    this.startTime = null;
    this.accumulatedTime = 0;
    this.isPaused = false;
    this.pauseStartTime = null;
    this.totalPausedSeconds = 0;
    this.sessionStartDate = null; // Data de início capturada quando clica no botão
    this.hasBeenPausedOnce = false; // Flag para manter o label visível após primeira pausa
    this.currentSessionId = null; // ID da sessão atual para vincular notas

    // Armazenar referências dos handlers para poder remover depois
    this.finishBtnHandler = null;
    this.cancelBtnHandler = null;
    this.pauseBtnHandler = null;
    this.playBtnHandler = null;
    this.pauseIconBtnHandler = null;
  }

  initFloatingButton() {
    const btn = document.getElementById("btn-generalized-study");
    if (btn) {
      btn.addEventListener("click", () => this.startQuickStudy());
    }

    const noSubjectCheckbox = document.getElementById(
      "quick-study-no-subject-checkbox",
    );
    if (noSubjectCheckbox) {
      noSubjectCheckbox.addEventListener("change", (e) => {
        this.ui.toggleSubjectField(e.target.checked);
      });
    }

    // Adicionar evento para o botão de toggle do formulário
    const toggleFormBtn = document.getElementById("btn-toggle-form");
    if (toggleFormBtn) {
      toggleFormBtn.addEventListener("click", () => {
        this.toggleFormVisibility();
        toggleFormBtn.classList.toggle("collapsed");
      });
    }
  }

  toggleFormVisibility() {
    const form = document.getElementById("form-quick-study");
    const controls = document.querySelector(".quick-study-controls-collapsed");

    if (!form.classList.contains("hidden")) {
      // FECHAR
      form.style.height = form.scrollHeight + "px";

      requestAnimationFrame(() => {
        form.style.height = "0px";
      });

      form.addEventListener(
        "transitionend",
        () => {
          form.classList.add("hidden");
          // Mostrar controles quando colapsado
          if (controls) controls.style.display = "flex";
        },
        { once: true },
      );
    } else {
      // ABRIR
      // Esconder controles quando expandido
      if (controls) controls.style.display = "none";

      form.classList.remove("hidden");
      form.style.height = form.scrollHeight + "px";

      form.addEventListener(
        "transitionend",
        () => {
          form.style.height = "auto";
        },
        { once: true },
      );
    }
  }

  reset() {
    clearInterval(this.timerInterval);
    this.timerInterval = null;

    this.seconds = 0;
    this.startTime = null;
    this.accumulatedTime = 0;
    this.isPaused = false;
    this.pauseStartTime = null;
    this.totalPausedSeconds = 0;
    this.currentSessionId = null;

    document.title = "Fluxo ESTRATÉGICO";
  }

  // Reutilizar a mesma lógica do TimerController
  tick() {
    const now = Date.now();

    if (!this.isPaused && this.startTime) {
      const diff = Math.floor((now - this.startTime) / 1000);
      this.seconds = this.accumulatedTime + diff;
      this.updateTimerDisplay();
    } else if (this.isPaused && this.pauseStartTime) {
      this.updatePauseDisplay();
    }
  }

  updateTimerDisplay() {
    const h = Math.floor(this.seconds / 3600);
    const m = Math.floor((this.seconds % 3600) / 60);
    const s = this.seconds % 60;

    const text =
      `${h < 10 ? "0" + h : h}:` +
      `${m < 10 ? "0" + m : m}:` +
      `${s < 10 ? "0" + s : s}`;

    const timerDisplay = document.getElementById("quick-study-timer-display");
    if (timerDisplay) {
      timerDisplay.innerText = text;
    }

    document.title = text + " - Fluxo ESTRATÉGICO";
  }

  updatePauseDisplay() {
    let currentSessionPause = 0;

    if (this.isPaused && this.pauseStartTime) {
      const now = Date.now();
      currentSessionPause = Math.floor((now - this.pauseStartTime) / 1000);
    }

    const total = this.totalPausedSeconds + currentSessionPause;
    this.ui.updatePausedDisplay(formatTime(total), this.isPaused);
  }

  async getCategories() {
    try {
      const categoriesData = await this.db.getCategories();
      const configuredCategories = categoriesData.map((c) => c.name || c);

      // Pega categorias do histórico
      const history = await this.db.getHistory();
      const historicalCategories = history
        .map((item) => item.category)
        .filter((cat) => cat && cat !== "-");

      // Combina, remove duplicatas e ordena
      return [
        ...new Set([...configuredCategories, ...historicalCategories]),
      ].sort();
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
      return [];
    }
  }

  async startQuickStudy() {
    // Resetar estado anterior
    this.reset();

    // Gerar ID único para esta sessão (será usado para vincular notas)
    this.currentSessionId = Date.now();

    const categories = await this.getCategories();
    this.ui.loadCategorySelectForQuickStudy(categories);
    this.ui.loadSubjectSelectForQuickStudy(this.subjects.subjects || []);

    // Mostrar modal
    this.ui.showQuickStudyModal(0);

    // O formulário já abre colapsado, então mostrar os controles com pause visível
    const playBtn = document.getElementById("btn-quick-study-play");
    const pauseIconBtn = document.getElementById("btn-quick-study-play-pause");
    const controls = document.querySelector(".quick-study-controls-collapsed");

    if (playBtn) playBtn.style.display = "none"; // Play escondido (timer não está pausado)
    if (pauseIconBtn) pauseIconBtn.style.display = "flex"; // Pause visível (timer rodando)
    if (controls) controls.style.display = "flex"; // Controles visíveis (formulário já começa colapsado)

    // Iniciar timer
    this.startTime = Date.now();
    this.accumulatedTime = 0;
    this.seconds = 0;

    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => this.tick(), 1000);

    // Adicionar event listeners dos botões do modal
    this.attachModalEvents();
  }

  attachModalEvents() {
    const finishBtn = document.getElementById("btn-quick-study-finish");
    const cancelBtn = document.getElementById("btn-quick-study-cancel");
    const pauseBtn = document.getElementById("btn-quick-study-pause");
    const playBtn = document.getElementById("btn-quick-study-play");
    const pauseIconBtn = document.getElementById("btn-quick-study-play-pause");

    // Remover listeners antigos se existirem
    if (this.finishBtnHandler && finishBtn) {
      finishBtn.removeEventListener("click", this.finishBtnHandler);
    }
    if (this.cancelBtnHandler && cancelBtn) {
      cancelBtn.removeEventListener("click", this.cancelBtnHandler);
    }
    if (this.pauseBtnHandler && pauseBtn) {
      pauseBtn.removeEventListener("click", this.pauseBtnHandler);
    }
    if (this.playBtnHandler && playBtn) {
      playBtn.removeEventListener("click", this.playBtnHandler);
    }
    if (this.pauseIconBtnHandler && pauseIconBtn) {
      pauseIconBtn.removeEventListener("click", this.pauseIconBtnHandler);
    }

    // Criar novos handlers
    this.finishBtnHandler = () => this.finishQuickStudy();
    this.cancelBtnHandler = () => this.cancelQuickStudy();
    this.pauseBtnHandler = () => this.togglePauseQuickStudy();
    this.playBtnHandler = () => this.togglePauseQuickStudy(); // Play retoma o timer
    this.pauseIconBtnHandler = () => this.togglePauseQuickStudy(); // Pause pausa o timer

    // Adicionar novos listeners
    if (finishBtn) {
      finishBtn.addEventListener("click", this.finishBtnHandler);
    }
    if (cancelBtn) {
      cancelBtn.addEventListener("click", this.cancelBtnHandler);
    }
    if (pauseBtn) {
      pauseBtn.addEventListener("click", this.pauseBtnHandler);
    }
    if (playBtn) {
      playBtn.addEventListener("click", this.playBtnHandler);
    }
    if (pauseIconBtn) {
      pauseIconBtn.addEventListener("click", this.pauseIconBtnHandler);
    }
  }

  togglePauseQuickStudy = () => {
    this.isPaused = !this.isPaused;
    const pauseBtn = document.getElementById("btn-quick-study-pause");
    const playBtn = document.getElementById("btn-quick-study-play");
    const pauseIconBtn = document.getElementById("btn-quick-study-play-pause");

    const now = Date.now();

    if (this.isPaused) {
      // Pausando
      if (this.startTime) {
        const diff = Math.floor((now - this.startTime) / 1000);
        this.accumulatedTime += diff;
        this.startTime = null;
      }

      this.pauseStartTime = now;
      this.hasBeenPausedOnce = true; // Marcar que foi pausado

      if (pauseBtn) {
        pauseBtn.innerText = "Retomar";
        pauseBtn.classList.add("btn-outline");
      }

      // Mostrar botão de play, esconder de pause
      if (playBtn) playBtn.style.display = "flex";
      if (pauseIconBtn) pauseIconBtn.style.display = "none";

      document.title = "(PAUSADO) - Fluxo ESTRATÉGICO";
      this.updatePauseDisplay();
    } else {
      // Retomando
      if (this.pauseStartTime) {
        const diff = Math.floor((now - this.pauseStartTime) / 1000);
        this.totalPausedSeconds += diff;
      }

      this.pauseStartTime = null;
      this.startTime = Date.now();

      if (pauseBtn) {
        pauseBtn.innerText = "Pausar";
        pauseBtn.classList.remove("btn-outline");
      }

      // Esconder botão de play, mostrar de pause
      if (playBtn) playBtn.style.display = "none";
      if (pauseIconBtn) pauseIconBtn.style.display = "flex";

      // Não limpar exibição de tempo pausado - manter visível após primeira pausa
    }
  };

  finishQuickStudy = () => {
    const data = this.ui.getQuickStudyData();

    // Validar categoria (obrigatória)
    if (!data.category) {
      this.toast.showToast(
        "warning",
        "Selecione uma categoria antes de finalizar.",
      );
      return;
    }

    // Validar matéria (obrigatória se o checkbox não estiver marcado)
    if (!data.noSubject && !data.subject) {
      this.toast.showToast(
        "warning",
        "Selecione uma matéria ou marque a opção 'Não associar a uma matéria'.",
      );
      return;
    }

    // Salvar no banco de dados
    this.saveQuickStudySession(data);

    this.ui.hideQuickStudyModal();
    this.reset();
    this.toast.showToast("success", "Estudo rápido registrado com sucesso!");
  };

  cancelQuickStudy = () => {
    // Resetar anotações ao cancelar
    if (this.notesController) {
      this.notesController.reset();
    }

    this.ui.hideQuickStudyModal();
    this.reset();
  };

  async saveQuickStudySession(data) {
    try {
      // Formatar data no padrão brasileiro: "21/01/2026 às 18:17"
      const formattedDate = this.sessionStartDate
        ? this.sessionStartDate.toLocaleDateString("pt-BR") +
          " às " +
          this.sessionStartDate.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : new Date().toLocaleDateString("pt-BR") +
          " às " +
          new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          });

      const id = Date.now();

      const entry = {
        id: id,
        date: formattedDate,
        subject: data.noSubject ? "Sem Matéria" : data.subject || "Sem Matéria",
        duration: formatTime(this.seconds),
        questions: data.questions > 0 ? data.questions : 0,
        correct: data.correct > 0 ? data.correct : 0,
        category: data.category || "Sem Categoria",
      };

      // Salvar anotações vinculadas a esta sessão
      if (this.notesController && this.currentSessionId) {
        this.notesController.saveFinalNote(id);
      }

      // Salvar no banco de dados usando o método correto
      if (this.db && this.db.addHistoryEntry) {
        await this.db.addHistoryEntry(entry);
      }
    } catch (error) {
      console.error("Erro ao salvar sessão rápida:", error);
      this.toast.showToast("error", "Erro ao salvar estudo");
    }
  }
}
