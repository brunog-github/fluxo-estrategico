import { ViewLoader } from "../view/view-loader.js";

// Database & Migration
import { migrateFromLocalStorage } from "./services/db/migration.js";
import { supabaseService } from "./services/supabase/supabase-service.js";

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
import { GeneralizedStudyController } from "./controllers/generalized-study-controller.js";
import { StreakController } from "./controllers/streak-controller.js";
import { SettingsController } from "./controllers/settings-controller.js";
import { PinController } from "./controllers/pin-controller.js";
import { ReportsController } from "./controllers/report-controller.js";
import { ManualEntryController } from "./controllers/manual-entry-controller.js";
import { HistoryFilterController } from "./controllers/history-filter-controller.js";
import { LifetimeController } from "./controllers/lifetime-controller.js";
import { NotesController } from "./controllers/notes-controller.js";
import { BackupSyncController } from "./controllers/backup-sync-controller.js";
import { WeeklyGoalsController } from "./controllers/weekly-goals-controller.js";
import { SimuladosSalvosController } from "./controllers/simulados-salvos-controller.js";

// UIs
import { ConfigUI } from "./ui/configUI.js";
import { HomeUI } from "./ui/homeUI.js";
import { BackupUI } from "./ui/backupUI.js";
import { SimuladosSalvosUI } from "./ui/simulados-salvosUI.js";

// Data & Utils
import { ACHIEVEMENTS } from "./data/achievements.js";
import { formatTime } from "./utils/utils.js";
import { DevToolsProtection } from "./utils/devtools-protection.js";

// Events Initializers
import { initAchievementsEvents } from "./events/achievements-events.js";
import { initCalendarEvents } from "./events/calendar-events.js";
import { initFinishStudyEvents } from "./events/finish-study-events.js";
import { initConfigScreenEvents } from "./events/config-screen-events.js";
import { initTimerScreenEvents } from "./events/timer-screen-events.js";
import { initNotesEvents } from "./events/notes-events.js";
import { initReportsScreenEvents } from "./events/reports-screen-events.js";
import { initManualEntryEvents } from "./events/manual-entry-events.js";
import { initFiltersEvents } from "./events/filters-events.js";
import { setupEditaiVerticalizedEvents } from "./events/edital-verticalizado-events.js";
import { setupSimuladosSalvosEvents } from "./events/simulados-salvos-events.js";
import { initGlobalTooltip } from "./controllers/tooltip-controller.js"; // Caso seja função
import { generateFakeData } from "./data/fake-data.js";

const VIEWS_CONFIG = [
  { id: "screen-home", url: "src/view/home.html" },
  { id: "screen-timer", url: "src/view/timer.html" },
  { id: "screen-finish", url: "src/view/finish.html" },
  { id: "screen-config", url: "src/view/config.html" },
  { id: "screen-reports", url: "src/view/reports.html" },
  { id: "screen-achievements", url: "src/view/achievements.html" },
  { id: "screen-edital", url: "src/view/edital-verticalizado.html" },
  { id: "screen-simulados-salvos", url: "src/view/simulados-salvos.html" },
];

class App {
  constructor() {
    this.services = {};
  }

  // Ponto de entrada
  async start() {
    try {
      new DevToolsProtection({
        debug: false, // Mude para false em produção real
        blockKeyboard: true,
        clearConsole: true,
        disableRightClick: true,
        detectSize: true,
        redirectOnDetect: true,
        onDetect: (info) => {
          console.warn("🚨 DevTools detectado!", info);
        },
      });

      // Passo 1: Migrar dados do localStorage se necessário
      await migrateFromLocalStorage();

      // Passo 1: Carregar HTML
      await ViewLoader.load(VIEWS_CONFIG);

      // Passo 2: Criar Controladores
      await this._initServices();

      // Passo 3: Ligar Eventos e UI
      await this._setupBindings();
      this._initGlobalEvents();

      // Passo 4: Restaurar Estado (Timer ou Home)
      await this._handleInitialState();

      // Passo 5: Verificar PIN de bloqueio
      await this.services.pin.checkAndLock();
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
    const weeklyGoals = new WeeklyGoalsController(toast);

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

    // Estudo Generalizado (Floating Button)
    const generalizedStudy = new GeneralizedStudyController(
      subjects,
      null, // dbService será utilizado por padrão dentro do controlador
      toast,
      notes,
    );

    // Controladores de Backup
    const backupSync = new BackupSyncController(toast, confirm);
    await backupSync.init();

    // Controladores de Telas
    const settings = new SettingsController(toast, confirm);
    await settings.init();
    const pin = new PinController(toast);
    const reports = new ReportsController(toast, confirm, screens);
    const manualEntry = new ManualEntryController(toast, reports);
    const filters = new HistoryFilterController(reports);
    manualEntry.filterController = filters;
    manualEntry.notesController = notes;

    // UIs
    const configUI = new ConfigUI(subjects, toast);
    const homeUI = new HomeUI(subjects, screens);
    const backupUI = new BackupUI(confirm, toast);

    const simuladosSalvosController = new SimuladosSalvosController(
      toast,
      confirm,
    );
    const simuladosSalvosUI = new SimuladosSalvosUI();
    simuladosSalvosUI.setController(simuladosSalvosController);

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
      weeklyGoals,
      streak,
      session,
      timer,
      generalizedStudy,
      settings,
      pin,
      reports,
      manualEntry,
      backupSync,
      filters,
      configUI,
      homeUI,
      backupUI,
      simuladosSalvosUI,
      simuladosSalvosController,
      theme,
    };
  }

  // Faz as ligações específicas entre controladores (Wiring)
  async _setupBindings() {
    const s = this.services;

    // Inicializa Tooltips e Tema
    initGlobalTooltip();
    await s.theme.initTheme();

    // Inicializar streak com dados do DB
    await s.streak.init();

    // Inicializar metas semanais
    await s.weeklyGoals.init();

    // Renderizações iniciais
    await s.streak.render();

    // ✅ Renderizar botão de backup no header
    const backupButtonContainer = document.getElementById(
      "backup-button-container",
    );
    if (backupButtonContainer) {
      //backupSync.headerButtonContainer = backupButtonContainer;

      await s.backupUI.renderHeaderButton(backupButtonContainer, s.backupSync);
    }

    // ✅ NOVO: Registrar UI no supabaseService para atualizar banner automaticamente
    supabaseService.setBackupUI(s.backupUI);

    // Criar Floating Button de Estudo Rápido
    s.generalizedStudy.ui.createFloatingButton();
    s.generalizedStudy.initFloatingButton();
    s.generalizedStudy.backupSync = s.backupSync; // Injetar referência do backupSync

    // Ligações de callbacks
    s.screens.on("screen-home", async () => {
      s.homeUI.render();
      await s.streak.render();
      await s.weeklyGoals.render();

      // ✅ Verificar sincronização de backup quando chegar na home-screen
      if (s.backupSync) {
        await s.backupSync.checkSyncStatus();
      }
    });

    s.reports.setNotesAction(async (linkedId) => {
      await s.notes.openLinkedNote(linkedId);
    });

    s.reports.setEditAction(async (itemToEdit) => {
      await s.manualEntry.openToEdit(itemToEdit);
    });

    // Ação quando abre a tela de simulados salvos
    s.screens.on("screen-simulados-salvos", async () => {
      await s.simuladosSalvosUI.render();
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
    initFinishStudyEvents(s.session, s.screens, s.confirm, s.notes);
    initConfigScreenEvents(
      s.screens,
      s.configUI,
      s.streak,
      s.subjects,
      s.settings,
      s.pin,
    );
    initReportsScreenEvents(s.reports, s.screens, s.lifetime, s.filters);
    initManualEntryEvents(s.manualEntry, s.lifetime);
    initFiltersEvents(s.filters);
    initNotesEvents(s.notes);

    // Timer Events (passando Notes também)
    initTimerScreenEvents(s.screens, s.timer, s.notes);

    // Edital Verticalizado Events
    setupEditaiVerticalizedEvents(s.toast, s.confirm, s.screens);

    // Simulados Salvos Events
    setupSimuladosSalvosEvents(s.screens, s.simuladosSalvosUI);
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
  //generateFakeData();
});
