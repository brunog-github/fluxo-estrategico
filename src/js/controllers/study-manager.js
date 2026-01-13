import { formatTime } from "../utils/utils.js";

export class StudySessionManager {
  constructor(subjectManager, achievementsController, toast) {
    this.subjectManager = subjectManager;
    this.achievements = achievementsController;
    this.toast = toast;
  }

  saveSession() {
    const questions =
      parseInt(document.getElementById("input-questions").value) || 0;
    const correct =
      parseInt(document.getElementById("input-correct").value) || 0;
    const seconds = parseInt(
      localStorage.getItem("currentTimerSeconds") || "0"
    );

    if (correct > questions) {
      this.toast.showToast(
        "error",
        "Os acertos não podem ser maiores que o total."
      );
      return false;
    }

    const now = new Date();

    const entry = {
      id: Date.now(),
      date:
        now.toLocaleDateString("pt-BR") +
        " às " +
        now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      subject: this.subjectManager.getCurrent(),
      duration: formatTime(seconds),
      questions,
      correct,
    };

    const history = JSON.parse(localStorage.getItem("studyHistory")) || [];
    history.unshift(entry);
    localStorage.setItem("studyHistory", JSON.stringify(history));

    localStorage.setItem("appState", "home");
    localStorage.removeItem("currentTimerSeconds");
    localStorage.removeItem("accumulatedTime");
    localStorage.removeItem("finishScreenSubject");

    this.achievements.checkAndUnlockAchievements();

    this.subjectManager.next();

    this.toast.showToast("success", "Dados salvos!");
    return true;
  }

  cancelSession() {
    localStorage.removeItem("currentTimerSeconds");
    localStorage.removeItem("accumulatedTime");
    localStorage.setItem("appState", "home");
  }
}
