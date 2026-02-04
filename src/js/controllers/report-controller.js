import { ReportsUI } from "../ui/reportUI.js";
import { ReportsCharts } from "../utils/chart-utils.js";
import { getFilteredHistory } from "../utils/reports-utils.js";
import { dbService } from "../services/db/db-service.js";
import { EditaisSummaryUI } from "../ui/editais-summaryUI.js";

export class ReportsController {
  constructor(toast, confirm, screenNavigator) {
    this.toast = toast;
    this.confirm = confirm;
    this.screens = screenNavigator;
    this.onViewNotesHandler = null;

    this.charts = new ReportsCharts();
    this.ui = new ReportsUI(toast, confirm, this.charts);

    window.addEventListener("resize", () => this.ui.updateRotateTip());
  }

  // 2. Método público para "receber" a função de editar depois
  setEditAction(callback) {
    this.onEditHandler = callback;
  }

  setNotesAction(callback) {
    this.onViewNotesHandler = callback;
  }

  async show() {
    await this.renderHistory();
    await this.updateCharts();
    await this.updateSummary();
    await EditaisSummaryUI.render("editais-summary-container-reports");
    this.ui.updateRotateTip();

    // Inicializar modal de visualização detalhada
    this.ui.initDetailedViewModal();

    // Renderizar dados detalhados
    const history = await dbService.getHistory();
    const simulados = await dbService.getAllSimulados();
    await this.ui.renderDetailedView(history, simulados);

    this.screens.switch("screen-reports");
  }

  async renderHistory() {
    let raw = await dbService.getHistory();
    let filtered = getFilteredHistory(raw);
    const allNotes = await dbService.getNotes();

    await this.ui.renderHistoryTable(
      filtered,
      (id) => this.deleteEntry(id),
      (item) => {
        if (this.onEditHandler) {
          this.onEditHandler(item);
        } else {
          console.warn("No edit handler defined.");
        }
      },
      (id) => {
        if (this.onViewNotesHandler) {
          this.onViewNotesHandler(id);
        } else {
          console.warn("No notes handler defined.");
        }
      },
      allNotes,
    );
  }

  deleteEntry(id) {
    this.confirm.confirm("Excluir este registro?", async () => {
      await dbService.deleteHistoryEntry(id);

      await this.renderHistory();
      await this.updateCharts();
      await this.updateSummary();

      this.toast.showToast("success", "Registro removido!");
    });
  }

  clearAll() {
    this.confirm.confirm(
      "Tem certeza que deseja apagar todo o histórico de estudos?",
      async () => {
        await dbService.clearHistory();
        await dbService.clearAchievements();
        location.reload();
      },
    );
  }

  async updateCharts() {
    const history = await dbService.getHistory();
    const simulados = await dbService.getAllSimulados();

    if (!history.length && !simulados.length) return;

    this.charts.destroy();
    this.charts.allHistory = history; // guardar histórico completo
    this.charts.allSimulados = simulados; // guardar simulados para filtros

    // Usar requestAnimationFrame para não bloquear a UI
    await new Promise((resolve) => {
      requestAnimationFrame(async () => {
        this.charts.updateTotalDisplay(history, simulados);

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

        const ctx1 = document
          .getElementById("chart-performance")
          .getContext("2d");
        this.charts.buildPerformanceChart(ctx1, perfLabels, perfC, perfW);

        // time chart - incluir simulados
        const timeLabels = [...labels];
        const timeHours = labels.map((l) => (stats[l].time / 60).toFixed(2));

        // Calcular tempo total dos simulados
        if (simulados.length > 0) {
          let totalSimuladosMinutes = 0;
          simulados.forEach((s) => {
            if (s.tempo) {
              const [hh, mm, ss] = s.tempo.split(":").map(Number);
              totalSimuladosMinutes += hh * 60 + mm + ss / 60;
            }
          });
          const simuladosHours = (totalSimuladosMinutes / 60).toFixed(2);
          timeLabels.push("SIMULADOS");
          timeHours.push(simuladosHours);
        }

        const ctx2 = document.getElementById("chart-time").getContext("2d");
        this.charts.buildTimeChart(ctx2, timeLabels, timeHours);

        // Setup filtros
        this.setupTimeFilterButtons();

        // theme
        const isDark =
          document.documentElement.getAttribute("data-theme") === "dark";
        this.charts.updateTheme(isDark);

        resolve();
      });
    });
  }

  setupTimeFilterButtons() {
    const buttons = document.querySelectorAll(".btn-time-filter");
    buttons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const filter = e.target.dataset.filter;

        // Atualizar UI dos botões
        buttons.forEach((b) => {
          if (b.dataset.filter === filter) {
            b.style.background = "var(--primary-color)";
            b.style.color = "white";
            b.classList.add("active");
          } else {
            b.style.background = "transparent";
            b.style.color = "var(--primary-color)";
            b.classList.remove("active");
          }
        });

        // Atualizar gráfico
        this.charts.updateTimeChartFilter(filter);
      });
    });
  }

  async updateSummary(filtered = null, filters = null) {
    let history = [];
    let title = "Todas as Matérias";

    if (filtered) {
      history = filtered;
      title = this.getTitleFromItems(history, filters);
    } else {
      // Se não há filtro específico, busca todo o histórico do banco
      let raw = await dbService.getHistory();
      history = getFilteredHistory(raw);
      title = "Todas as Matérias";
    }

    let totalQ = 0;
    let totalC = 0;

    history.forEach((h) => {
      totalQ += parseInt(h.questions) || 0;
      totalC += parseInt(h.correct) || 0;
    });

    const totalE = Math.max(totalQ - totalC, 0);
    const accPerc = totalQ > 0 ? ((totalC / totalQ) * 100).toFixed(0) : 0;

    this.ui.renderSummary(totalQ, totalC, totalE, accPerc, title);
  }

  getTitleFromItems(items, filters = null) {
    if (!items || items.length === 0) {
      // Se houver filtro ativo mas sem resultados, mostra o que foi filtrado
      if (filters) {
        if (filters.subject && filters.category)
          return `${filters.subject} - ${filters.category}`;
        if (filters.subject) return filters.subject;
        if (filters.category) return filters.category;
      }
      return "";
    }

    // Lógica de Prioridade do Título
    if (filters) {
      // 1. Matéria + Categoria
      if (filters.subject && filters.category) {
        return `${filters.subject} - ${filters.category}`;
      }
      // 2. Só Matéria
      if (filters.subject) {
        return filters.subject;
      }
      // 3. Só Categoria (AQUI ESTÁ A MUDANÇA SOLICITADA)
      if (filters.category) {
        return filters.category; // Ex: "Teoria"
      }
      if (filters.hasNotes) {
        return "Com Anotações";
      }
    }

    const subjects = [...new Set(items.map((i) => i.subject))];

    if (subjects.length === 1) return subjects[0];

    if (
      !filters ||
      (filters.subject == "" &&
        filters.start == "" &&
        filters.end == "" &&
        filters.category == "")
    ) {
      return `Todas as Matérias`;
    }

    // converter "05/01/2026 às 17:19" → Date real
    const parseDate = (str) => {
      const [date] = str.split(" às ");
      const [d, m, y] = date.split("/");
      return new Date(`${y}-${m}-${d}T00:00:00`);
    };

    const sorted = items.map((i) => parseDate(i.date)).sort((a, b) => a - b);

    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    // formatar para "dd/mm/yy"
    const fmt = (d) => {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yy = String(d.getFullYear()).slice(2);
      return `${dd}/${mm}/${yy}`;
    };

    return `${fmt(first)} - ${fmt(last)}`;
  }
}
