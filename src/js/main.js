import { initGlobalTooltip } from "./controllers/tooltip-controller.js";
import { ToastController } from "./controllers/toast-controller.js";
import { ConfirmController } from "./controllers/confirm-toast-controller.js";
import { ThemeManager } from "./controllers/theme-manager.js";
import { AchievementsController } from "./controllers/achievements-controller.js";
import { ACHIEVEMENTS } from "./data/achievements.js";
import { CalendarController } from "./controllers/calendar-controller.js";
import { ScreenNavigator } from "./controllers/screen-navigator-controller.js";
import { SubjectsManager } from "./controllers/subjects-manager.js";
import { ConfigUI } from "./ui/configUI.js";
import { HomeUI } from "./ui/homeUI.js";
import { StudySessionManager } from "./controllers/study-manager.js";
import { TimerController } from "./controllers/timer-controller.js";
import { StreakController } from "./controllers/streak-controller.js";
import { SettingsController } from "./controllers/settings-controller.js";
import { ReportsController } from "./controllers/report-controller.js";
import { ManualEntryController } from "./controllers/manual-entry-controller.js";
import { HistoryFilterController } from "./controllers/history-filter-controller.js";
import { LifetimeController } from "./controllers/lifetime-controller.js";
import { formatTime } from "./utils/utils.js";

import { initAchievementsEvents } from "./events/achievements-events.js";
import { initCalendarEvents } from "./events/calendar-events.js";
import { initFinishStudyEvents } from "./events/finish-study-events.js";
import { initConfigScreenEvents } from "./events/config-screen-events.js";
import { initTimerScreenEvents } from "./events/timer-screen-events.js";
import { initReportsScreenEvents } from "./events/reports-screen-events.js";
import { initManualEntryEvents } from "./events/manual-entry-events.js";
import { initFiltersEvents } from "./events/filters-events.js";

// -----------------------------------------
// INSTÂNCIAS GLOBAIS
// -----------------------------------------

export const toast = new ToastController();
export const confirm = new ConfirmController();

const streak = new StreakController(toast);

const achievements = new AchievementsController(ACHIEVEMENTS);

const theme = new ThemeManager({
  toggleButtonId: "theme-toggle",
  onThemeChange: () => {
    //updateChartTheme();  // se existir
    achievements.checkAndUnlockAchievements();
  },
});

const calendar = new CalendarController();
const screens = new ScreenNavigator();
const subjects = new SubjectsManager(toast);
const configUI = new ConfigUI(subjects, toast);
const homeUI = new HomeUI(subjects, screens);
screens.on("screen-home", () => {
  homeUI.render();
  streak.render();
});
const session = new StudySessionManager(subjects, achievements, toast);
const timer = new TimerController(subjects, screens, toast);
timer.session = session; // Adiciona referência à session
const settings = new SettingsController(toast, confirm);
const reports = new ReportsController(toast, confirm, screens);
const manualEntry = new ManualEntryController(toast, reports);
const filterController = new HistoryFilterController(reports);
const lifetime = new LifetimeController();

let seconds = 0;

document.addEventListener("DOMContentLoaded", () => {
  const savedState = localStorage.getItem("appState");

  theme.initTheme();

  initGlobalTooltip();

  document.getElementById("theme-toggle").addEventListener("click", () => {
    theme.toggleTheme();
  });

  streak.render();

  reports.setEditAction((itemToEdit) => {
    manualEntry.openToEdit(itemToEdit);
  });

  if (savedState === "timer") {
    // carregar segundos salvos
    seconds = parseInt(localStorage.getItem("currentTimerSeconds") || "0");

    timer.startStudy(true);
  } else if (savedState === "save-session") {
    const subject = localStorage.getItem("finishScreenSubject");
    const seconds = parseInt(
      localStorage.getItem("currentTimerSeconds") || "0"
    );
    const formattedTime = formatTime(seconds);

    if (subject) {
      timer.ui.showFinishScreen(subject, formattedTime);
      session.loadCategorySelect();
    }

    screens.switch("screen-finish");
  } else {
    // estado normal
    homeUI.render();
    achievements.checkAndUnlockAchievements();
  }

  initAchievementsEvents(screens, achievements);
  initCalendarEvents(calendar);
  initFinishStudyEvents(session, screens, confirm);
  initConfigScreenEvents(screens, configUI, streak, subjects, settings);
  initTimerScreenEvents(screens, timer);
  initReportsScreenEvents(reports, screens, lifetime, filterController);
  initManualEntryEvents(manualEntry, lifetime);
  initFiltersEvents(filterController);
});
