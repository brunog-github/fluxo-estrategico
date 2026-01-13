import { TimerUI } from "../ui/timerUI.js";
import { formatTime } from "../utils/utils.js";

export class TimerController {
  constructor(subjectsManager, screenNavigator, toast) {
    this.subjects = subjectsManager;
    this.screens = screenNavigator;
    this.toast = toast;

    // estado interno
    this.seconds = 0;
    this.timerInterval = null;
    this.startTime = null;
    this.accumulatedTime = 0;

    this.isPaused = false;
    this.pauseStartTime = null;
    this.totalPausedSeconds = 0;

    this.ui = new TimerUI();
  }

  // -------------------------------------------------------
  //  UI Helpers
  // -------------------------------------------------------
  updateTimerDisplay() {
    const h = Math.floor(this.seconds / 3600);
    const m = Math.floor((this.seconds % 3600) / 60);
    const s = this.seconds % 60;

    const text =
      `${h < 10 ? "0" + h : h}:` +
      `${m < 10 ? "0" + m : m}:` +
      `${s < 10 ? "0" + s : s}`;

    this.ui.updateTimerText(text);
    document.title = text + " - Fluxo ESTRATÉGICO";
  }

  updatePauseDisplay() {
    let currentSessionPause = 0;

    if (this.isPaused && this.pauseStartTime) {
      const now = Date.now();
      currentSessionPause = Math.floor((now - this.pauseStartTime) / 1000);
    }

    const total = this.totalPausedSeconds + currentSessionPause;
    this.ui.updatePausedText(formatTime(total), this.isPaused);
  }

  // -------------------------------------------------------
  //  Ticker principal
  // -------------------------------------------------------
  tick() {
    const now = Date.now();

    if (!this.isPaused && this.startTime) {
      const diff = Math.floor((now - this.startTime) / 1000);
      this.seconds = this.accumulatedTime + diff;
      localStorage.setItem("currentTimerSeconds", this.seconds);
      this.updateTimerDisplay();
    } else if (this.isPaused && this.pauseStartTime) {
      this.updatePauseDisplay();
    }
  }

  // -------------------------------------------------------
  //  Lógica de início
  // -------------------------------------------------------
  startStudy(isResuming = false) {
    if (this.subjects.subjects.length === 0) {
      this.toast.showToast(
        "error",
        "Adicione matérias na configuração primeiro!"
      );
      return;
    }

    let savedWasPaused = false;

    if (isResuming) {
      savedWasPaused = localStorage.getItem("isPaused") === "true";
    }

    if (!isResuming) {
      this.seconds = 0;
      this.accumulatedTime = 0;

      this.totalPausedSeconds = 0;
      this.pauseStartTime = null;
      this.isPaused = false;

      localStorage.setItem("currentTimerSeconds", 0);

      localStorage.removeItem("isPaused");
      localStorage.removeItem("pauseStartTime");
      localStorage.removeItem("totalPausedSeconds");
      localStorage.removeItem("accumulatedTime");
      localStorage.removeItem("sessionStartTimestamp");

      const sessionStartTimestamp = Date.now();
      localStorage.setItem("sessionStartTimestamp", sessionStartTimestamp);

      this.startTime = Date.now();
    } else {
      // Restaurar estado antigo
      this.seconds = parseInt(
        localStorage.getItem("currentTimerSeconds") || "0"
      );
      this.totalPausedSeconds = parseInt(
        localStorage.getItem("totalPausedSeconds") || "0"
      );

      if (savedWasPaused) {
        this.isPaused = true;
        this.startTime = null;
        this.pauseStartTime = parseInt(
          localStorage.getItem("pauseStartTime") || Date.now()
        );
        this.accumulatedTime = parseInt(
          localStorage.getItem("accumulatedTime") || "0"
        );
      } else {
        this.isPaused = false;
        this.startTime = Date.now();
        this.accumulatedTime = this.seconds;
      }
    }

    localStorage.setItem("appState", "timer");

    // UI
    const current = this.subjects.getCurrent();
    const next = this.subjects.getNext();
    this.ui.showTimerScreen(current, next);

    this.screens.switch("screen-timer");
    this.ui.updatePauseButton(this.isPaused);

    this.updateTimerDisplay();
    this.updatePauseDisplay();

    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => this.tick(), 1000);
  }

  // -------------------------------------------------------
  //  Pause / Resume
  // -------------------------------------------------------
  togglePause() {
    this.isPaused = !this.isPaused;
    localStorage.setItem("isPaused", this.isPaused);

    const now = Date.now();

    if (this.isPaused) {
      // Pausando
      this.ui.updatePauseButton(true);
      document.title = "(PAUSADO) - Fluxo ESTRATÉGICO";

      if (this.startTime) {
        const diff = Math.floor((now - this.startTime) / 1000);
        this.accumulatedTime += diff;
        this.startTime = null;
      }

      this.pauseStartTime = now;

      localStorage.setItem("pauseStartTime", this.pauseStartTime);
      localStorage.setItem("accumulatedTime", this.accumulatedTime);
      localStorage.setItem("currentTimerSeconds", this.seconds);

      this.updatePauseDisplay();
    } else {
      // Retomando
      this.ui.updatePauseButton(false);

      if (this.pauseStartTime) {
        const diff = Math.floor((now - this.pauseStartTime) / 1000);
        this.totalPausedSeconds += diff;
      }

      this.pauseStartTime = null;

      localStorage.removeItem("pauseStartTime");
      localStorage.setItem("totalPausedSeconds", this.totalPausedSeconds);
      localStorage.removeItem("accumulatedTime");

      this.startTime = Date.now();
    }
  }

  // -------------------------------------------------------
  //  Finalizar Sessão
  // -------------------------------------------------------
  finishSession() {
    clearInterval(this.timerInterval);

    localStorage.setItem("appState", "save-session");

    const subject = this.subjects.getCurrent();
    localStorage.setItem("finishScreenSubject", subject);
    const formatted = formatTime(
      parseInt(localStorage.getItem("currentTimerSeconds") || "0")
    );
    this.ui.showFinishScreen(subject, formatted);

    this.startTime = null;
    this.accumulatedTime = 0;
    this.pauseStartTime = null;
    this.totalPausedSeconds = 0;
    this.isPaused = false;

    localStorage.removeItem("isPaused");
    localStorage.removeItem("pauseStartTime");
    localStorage.removeItem("totalPausedSeconds");

    document.title = "Fluxo ESTRATÉGICO";
    this.screens.switch("screen-finish");
  }
}
