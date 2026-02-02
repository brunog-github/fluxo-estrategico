export class ScreenNavigator {
  constructor() {
    this.renderActions = {};
  }

  on(screenId, action) {
    this.renderActions[screenId] = action;
  }

  switch(screenId) {
    const screens = [
      "screen-home",
      "screen-timer",
      "screen-finish",
      "screen-config",
      "screen-reports",
      "screen-achievements",
      "screen-edital",
      "screen-simulados-salvos",
    ];

    screens.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (id === screenId) el.classList.remove("hidden");
      else el.classList.add("hidden");
    });

    if (this.renderActions[screenId]) {
      this.renderActions[screenId]();
    }
  }

  goHome() {
    this.switch("screen-home");
  }

  goHomeFromTimer() {
    const state = localStorage.getItem("appState");

    if (state === "timer") {
      localStorage.setItem("appState", "home");
      localStorage.removeItem("currentTimerSeconds");
      localStorage.removeItem("isPaused");
      localStorage.removeItem("totalPausedSeconds");
      localStorage.removeItem("pauseStartTime");
      localStorage.removeItem("accumulatedTime");
      localStorage.removeItem("sessionStartTimestamp");

      document.title = "Fluxo ESTRATÉGICO";
    }

    this.goHome();
  }
}
