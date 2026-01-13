import { ReportsUI } from "../ui/reportUI.js";
import { ReportsCharts } from "../utils/chart-utils.js";
import { getFilteredHistory } from "../utils/reports-utils.js";

export class ReportsController {
  constructor(toast, confirm, screenNavigator) {
    this.toast = toast;
    this.confirm = confirm;
    this.screens = screenNavigator;

    this.charts = new ReportsCharts();
    this.ui = new ReportsUI(toast, confirm, this.charts);

    window.addEventListener("resize", () => this.ui.updateRotateTip());
  }

  // 2. Método público para "receber" a função de editar depois
  setEditAction(callback) {
    this.onEditHandler = callback;
  }

  show() {
    this.renderHistory();
    this.updateCharts();
    this.updateSummary();
    this.ui.updateRotateTip();

    this.screens.switch("screen-reports");
  }

  renderHistory() {
    let raw = JSON.parse(localStorage.getItem("studyHistory")) || [];
    let filtered = getFilteredHistory(raw);
    this.ui.renderHistoryTable(
      filtered,
      (id) => this.deleteEntry(id),
      (item) => {
        if (this.onEditHandler) {
          this.onEditHandler(item);
        } else {
          console.warn("No edit handler defined.");
        }
      }
    );
  }

  deleteEntry(id) {
    this.confirm.confirm("Excluir este registro?", () => {
      let history = JSON.parse(localStorage.getItem("studyHistory")) || [];
      let filtered = history.filter((h) => h.id !== id);
      localStorage.setItem("studyHistory", JSON.stringify(filtered));

      this.renderHistory();
      this.updateCharts();
      this.updateSummary();

      this.toast.showToast("success", "Registro removido!");
    });
  }

  clearAll() {
    this.confirm.confirm(
      "Tem certeza que deseja apagar todo o histórico de estudos?",
      () => {
        localStorage.removeItem("studyHistory");
        localStorage.removeItem("unlockedAchievements");
        location.reload();
      }
    );
  }

  updateCharts() {
    const history = JSON.parse(localStorage.getItem("studyHistory")) || [];
    if (!history.length) return;

    this.charts.destroy();

    const stats = this.charts.buildStats(history);
    const labels = Object.keys(stats);

    // performance chart
    let perfLabels = [];
    let perfC = [];
    let perfW = [];

    labels.forEach((l) => {
      const s = stats[l];
      if (s.correct + s.wrong > 0) {
        perfLabels.push(l);
        perfC.push(s.correct);
        perfW.push(s.wrong);
      }
    });

    const ctx1 = document.getElementById("chart-performance").getContext("2d");
    this.charts.buildPerformanceChart(ctx1, perfLabels, perfC, perfW);

    // time chart
    const timeHours = labels.map((l) => (stats[l].time / 60).toFixed(2));
    const ctx2 = document.getElementById("chart-time").getContext("2d");
    this.charts.buildTimeChart(ctx2, labels, timeHours);

    // theme
    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";
    this.charts.updateTheme(isDark);
  }

  updateSummary() {
    const history = JSON.parse(localStorage.getItem("studyHistory")) || [];

    let totalQ = 0;
    let totalC = 0;

    history.forEach((h) => {
      totalQ += parseInt(h.questions) || 0;
      totalC += parseInt(h.correct) || 0;
    });

    const totalE = Math.max(totalQ - totalC, 0);
    const accPerc = totalQ > 0 ? ((totalC / totalQ) * 100).toFixed(1) : 0;

    this.ui.renderSummary(totalQ, totalC, totalE, accPerc);
  }
}
