export class TimerUI {
  updateTimerText(text) {
    const el = document.getElementById("timer-count");
    if (el) el.innerText = text;

    document.title = `(${text}) - Fluxo ESTRATÉGICO`;
  }

  updatePausedText(formattedTime, isPaused) {
    const el = document.getElementById("timer-paused-display");
    if (!el) return;

    el.innerText = "Tempo Pausado: " + formattedTime;
    el.style.display =
      formattedTime !== "00:00:00" || isPaused ? "block" : "none";
  }

  updatePauseButton(isPaused) {
    const btn = document.getElementById("btn-study-pause");
    if (!btn) return;

    if (isPaused) {
      btn.innerText = "Retomar";
      btn.classList.add("btn-outline");
      document.title = "(PAUSADO) - Fluxo ESTRATÉGICO";
    } else {
      btn.innerText = "Pausar";
      btn.classList.remove("btn-outline");
    }
  }

  showTimerScreen(currentSubject, nextSubject) {
    document.getElementById("timer-subject-name").innerText = currentSubject;
    document.getElementById("timer-next-subject-display").innerText =
      "Próxima matéria: " + nextSubject;
  }

  showFinishScreen(currentSubject, formattedTime) {
    document.getElementById("finish-subject-name").innerText = currentSubject;
    document.getElementById("finish-study-time").innerText = formattedTime;

    document.getElementById("input-questions").value = "";
    document.getElementById("input-correct").value = "";
  }
}
