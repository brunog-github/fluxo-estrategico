import { formatTime } from "../utils/utils.js";
import { dbService } from "../services/db/db-service.js";

export class StudySessionManager {
  constructor(subjectManager, achievementsController, toast, notesController) {
    this.subjectManager = subjectManager;
    this.achievements = achievementsController;
    this.toast = toast;
    this.notesController = notesController;
  }

  async getCategories() {
    const categoriesData = await dbService.getCategories();
    const configuredCategories = categoriesData.map((c) => c.name || c);

    // Pega categorias do histórico
    const history = await dbService.getHistory();
    const historicalCategories = history
      .map((item) => item.category)
      .filter((cat) => cat && cat !== "-"); // Remove undefined, null e "-"

    // Combina, remove duplicatas e ordena
    return [
      ...new Set([...configuredCategories, ...historicalCategories]),
    ].sort();
  }

  async loadCategorySelect() {
    const select = document.getElementById("input-category");
    const formGroup = select ? select.closest(".form-group") : null;

    if (!select) return;

    const categories = await this.getCategories();

    // Esconder a categoria se não houver nenhuma
    if (formGroup) {
      formGroup.style.display = categories.length > 0 ? "block" : "none";
    }

    // Limpa opções anteriores mantendo placeholder
    const placeholderOption = select.querySelector("option[value='']");
    select.innerHTML = "";

    if (placeholderOption) {
      select.appendChild(placeholderOption);
    } else {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Selecione uma categoria...";
      select.appendChild(option);
    }

    categories.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = cat;
      select.appendChild(option);
    });
  }

  async saveSession() {
    const questions =
      parseInt(document.getElementById("input-questions").value) || 0;
    const correct =
      parseInt(document.getElementById("input-correct").value) || 0;
    const category = document.getElementById("input-category").value;
    const seconds = parseInt(
      localStorage.getItem("currentTimerSeconds") || "0",
    );

    // Validar categoria obrigatória
    if (!category) {
      this.toast.showToast(
        "info",
        "Selecione uma categoria antes de concluir.",
      );
      return false;
    }

    if (correct > questions) {
      this.toast.showToast(
        "error",
        "Os acertos não podem ser maiores que o total.",
      );
      return false;
    }

    const sessionStartTimestamp = parseInt(
      localStorage.getItem("sessionStartTimestamp"),
    );
    const startDate = sessionStartTimestamp
      ? new Date(sessionStartTimestamp)
      : new Date();

    const entryId = Date.now();

    const entry = {
      id: entryId,
      date:
        startDate.toLocaleDateString("pt-BR") +
        " às " +
        startDate.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      subject: this.subjectManager.getCurrent(),
      duration: formatTime(seconds),
      questions,
      correct,
      category,
    };

    // Adicionar novo entry ao histórico
    await dbService.addHistoryEntry(entry);

    this.notesController.saveFinalNote(entryId);

    localStorage.setItem("appState", "home");
    localStorage.removeItem("currentTimerSeconds");
    localStorage.removeItem("accumulatedTime");
    localStorage.removeItem("finishScreenSubject");
    localStorage.removeItem("sessionStartTimestamp");

    await this.achievements.checkAndUnlockAchievements();

    await this.subjectManager.next();

    this.toast.showToast("success", "Dados salvos!");
    return true;
  }

  cancelSession() {
    localStorage.removeItem("currentTimerSeconds");
    localStorage.removeItem("accumulatedTime");
    localStorage.removeItem("sessionStartTimestamp");
    localStorage.setItem("appState", "home");
  }
}

