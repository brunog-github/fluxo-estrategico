import { ViewLoader } from "../view/view-loader.js";

// Controllers
import { ToastController } from "./controllers/toast-controller.js";
import { ConfirmController } from "./controllers/confirm-toast-controller.js";
import { ThemeManager } from "./controllers/theme-manager.js";
import { AchievementsController } from "./controllers/achievements-controller.js";
import { CalendarController } from "./controllers/calendar-controller.js";
import { ScreenNavigator } from "./controllers/screen-navigator-controller.js";
import { SubjectsManager } from "./controllers/subjects-manager.js";
import { StudySessionManager } from "./controllers/study-manager.js";
import { TimerController } from "./controllers/timer-controller.js";
import { StreakController } from "./controllers/streak-controller.js";
import { SettingsController } from "./controllers/settings-controller.js";
import { ReportsController } from "./controllers/report-controller.js";
import { ManualEntryController } from "./controllers/manual-entry-controller.js";
import { HistoryFilterController } from "./controllers/history-filter-controller.js";
import { LifetimeController } from "./controllers/lifetime-controller.js";
import { NotesController } from "./controllers/notes-controller.js";

// UIs
import { ConfigUI } from "./ui/configUI.js";
import { HomeUI } from "./ui/homeUI.js";

// Data & Utils
import { ACHIEVEMENTS } from "./data/achievements.js";
import { formatTime } from "./utils/utils.js";

// Events Initializers
import { initAchievementsEvents } from "./events/achievements-events.js";
import { initCalendarEvents } from "./events/calendar-events.js";
import { initFinishStudyEvents } from "./events/finish-study-events.js";
import { initConfigScreenEvents } from "./events/config-screen-events.js";
import { initTimerScreenEvents } from "./events/timer-screen-events.js";
import { initReportsScreenEvents } from "./events/reports-screen-events.js";
import { initManualEntryEvents } from "./events/manual-entry-events.js";
import { initFiltersEvents } from "./events/filters-events.js";
import { initGlobalTooltip } from "./controllers/tooltip-controller.js"; // Caso seja função

const VIEWS_CONFIG = [
  { id: "screen-home", url: "src/view/home.html" },
  { id: "screen-timer", url: "src/view/timer.html" },
  { id: "screen-finish", url: "src/view/finish.html" },
  { id: "screen-config", url: "src/view/config.html" },
  { id: "screen-reports", url: "src/view/reports.html" },
  { id: "screen-achievements", url: "src/view/achievements.html" },
];

class App {
  constructor() {
    this.services = {};
  }

  // Ponto de entrada
  async start() {
    try {
      // Passo 1: Carregar HTML
      await ViewLoader.load(VIEWS_CONFIG);

      // Passo 2: Criar Controladores
      await this._initServices();

      // Passo 3: Ligar Eventos e UI
      await this._setupBindings();
      this._initGlobalEvents();

      // Passo 4: Restaurar Estado (Timer ou Home)
      await this._handleInitialState();

      console.log("Fluxo Estratégico iniciado com sucesso!");
    } catch (error) {
      console.error("Erro fatal ao iniciar aplicação:", error);
    }
  }

  async _initServices() {
    // Utilitários Globais
    const toast = new ToastController();
    const confirm = new ConfirmController();
    const screens = new ScreenNavigator();
    const calendar = new CalendarController();
    const lifetime = new LifetimeController();

    // Gerenciadores de Dados
    const subjects = new SubjectsManager(toast);
    await subjects.init();
    const achievements = new AchievementsController(ACHIEVEMENTS);
    const notes = new NotesController(); // Instancia o NotesController

    // Core da Aplicação
    const streak = new StreakController(toast);
    const session = new StudySessionManager(
      subjects,
      achievements,
      toast,
      notes,
    );
    const timer = new TimerController(subjects, screens, toast);
    timer.session = session; // Dependência circular resolvida

    // Controladores de Telas
    const settings = new SettingsController(toast, confirm);
    await settings.init();
    const reports = new ReportsController(toast, confirm, screens);
    const manualEntry = new ManualEntryController(toast, reports);
    const filters = new HistoryFilterController(reports);

    // UIs
    const configUI = new ConfigUI(subjects, toast);
    const homeUI = new HomeUI(subjects, screens);
    const theme = new ThemeManager({
      toggleButtonId: "theme-toggle",
      onThemeChange: async () =>
        await achievements.checkAndUnlockAchievements(),
    });

    // Salva tudo no objeto services para acesso fácil
    this.services = {
      toast,
      confirm,
      screens,
      calendar,
      lifetime,
      subjects,
      achievements,
      notes,
      streak,
      session,
      timer,
      settings,
      reports,
      manualEntry,
      filters,
      configUI,
      homeUI,
      theme,
    };
  }

  // Faz as ligações específicas entre controladores (Wiring)
  async _setupBindings() {
    const s = this.services;

    // Inicializa Tooltips e Tema
    initGlobalTooltip();
    await s.theme.initTheme();

    // Renderizações iniciais
    s.streak.render();

    // Ligações de callbacks
    s.screens.on("screen-home", () => {
      s.homeUI.render();
      s.streak.render();
    });

    s.reports.setNotesAction(async (linkedId) => {
      await s.notes.openLinkedNote(linkedId);
    });

    s.reports.setEditAction(async (itemToEdit) => {
      await s.manualEntry.openToEdit(itemToEdit);
    });
  }

  // Inicializa os arquivos de Eventos (passando as dependências necessárias)
  _initGlobalEvents() {
    const s = this.services;

    // Eventos de Navegação e Tema
    document
      .getElementById("theme-toggle")
      .addEventListener("click", async () => {
        await s.theme.toggleTheme();
      });

    // Chamadas dos inicializadores de eventos
    initAchievementsEvents(s.screens, s.achievements);
    initCalendarEvents(s.calendar);
    initFinishStudyEvents(s.session, s.screens, s.confirm);
    initConfigScreenEvents(
      s.screens,
      s.configUI,
      s.streak,
      s.subjects,
      s.settings,
    );
    initReportsScreenEvents(s.reports, s.screens, s.lifetime, s.filters);
    initManualEntryEvents(s.manualEntry, s.lifetime);
    initFiltersEvents(s.filters);

    // Timer Events (passando Notes também)
    initTimerScreenEvents(s.screens, s.timer, s.notes);
  }

  // Lógica de recuperação de sessão (F5 ou reabertura)
  async _handleInitialState() {
    const s = this.services;
    const savedState = localStorage.getItem("appState");

    if (savedState === "timer") {
      // Recuperar Timer Ativo
      const seconds = parseInt(
        localStorage.getItem("currentTimerSeconds") || "0",
      );
      // Precisamos injetar o tempo no controller se ele não ler sozinho,
      // mas o startStudy(true) geralmente lida com isso.
      s.timer.startStudy(true);
    } else if (savedState === "save-session") {
      // Recuperar Tela de Finalização
      const subject = localStorage.getItem("finishScreenSubject");
      const seconds = parseInt(
        localStorage.getItem("currentTimerSeconds") || "0",
      );

      if (subject) {
        s.timer.ui.showFinishScreen(subject, formatTime(seconds));
        await s.session.loadCategorySelect();
      }
      s.screens.switch("screen-finish");
    } else {
      // Estado Normal (Home)
      // Se você implementou o roteador da resposta anterior, use s.screens.handleInitialLoad()
      // Senão, mantenha o padrão:
      s.homeUI.render();
      await s.achievements.checkAndUnlockAchievements();
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new App().start();
});
