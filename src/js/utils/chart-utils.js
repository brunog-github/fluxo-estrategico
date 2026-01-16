import { timeToMinutes, formatMinutesToHm } from "./utils.js";

export class ReportsCharts {
  constructor() {
    this.performanceChart = null;
    this.timeChart = null;
    this.currentTimeFilter = "all"; // filtro ativo atualmente
    this.allHistory = []; // guardar histórico completo
  }

  destroy() {
    if (this.performanceChart) this.performanceChart.destroy();
    if (this.timeChart) this.timeChart.destroy();
  }

  buildStats(history) {
    let stats = {};

    history.forEach((item) => {
      let subj = item.subject.toUpperCase();

      if (!stats[subj]) {
        stats[subj] = { correct: 0, wrong: 0, time: 0 };
      }

      const totalQ = parseInt(item.questions) || 0;
      const acertos = parseInt(item.correct) || 0;
      const erros = Math.max(totalQ - acertos, 0);

      stats[subj].correct += acertos;
      stats[subj].wrong += erros;
      stats[subj].time += timeToMinutes(item.duration);
    });

    return stats;
  }

  // Filtrar histórico por período
  filterHistoryByPeriod(history, filter) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return history.filter((item) => {
      const itemDate = new Date(
        item.date.split(" às ")[0].split("/").reverse().join("-")
      );
      const daysAgo = Math.floor((now - itemDate) / (1000 * 60 * 60 * 24));

      switch (filter) {
        case "today":
          return daysAgo === 0;
        case "week":
          return daysAgo < 7;
        case "month":
          return daysAgo < 30;
        case "all":
        default:
          return true;
      }
    });
  }

  // --- NOVO MÉTODO: Atualiza o texto de tempo total ---
  updateTotalDisplay(history) {
    const totalMinutes = history.reduce(
      (acc, item) => acc + timeToMinutes(item.duration),
      0
    );

    const h = Math.floor(totalMinutes / 60);
    const m = Math.floor(totalMinutes % 60);

    // Formatação pedida: "221h 36min"
    const text = h > 0 ? `${h}h ${m}min` : `${m} minutos`;

    const el = document.getElementById("chart-time-total");
    if (el) el.textContent = text;
  }

  buildPerformanceChart(ctx, labels, correct, wrong) {
    this.performanceChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "Acertos", data: correct, backgroundColor: "#4CAF50" },
          { label: "Erros", data: wrong, backgroundColor: "#F44336" },
        ],
      },
      options: {
        indexAxis: "x",
        responsive: true,
        scales: {
          x: {
            stacked: true,
            ticks: { autoSkip: false, maxRotation: 90, minRotation: 45 },
          },
          y: { stacked: true, beginAtZero: true },
        },
        plugins: {
          legend: {
            position: "bottom",
            onHover: (event, legendItem, legend) => {
              event.native.target.style.cursor = "pointer";
            },
            onLeave: (event, legendItem, legend) => {
              event.native.target.style.cursor = "default";
            },
          },
        },
      },
    });
  }

  buildTimeChart(ctx, labels, hours) {
    const textColor =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "#e0e0e0"
        : "#333333";

    this.timeChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            label: "Tempo (hr)",
            data: hours,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        animation: {
          duration: 0,
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              usePointStyle: true,
              padding: 12,
              color: textColor,
              font: {
                size: 13,
              },
            },
            onHover: (event, legendItem, legend) => {
              event.native.target.style.cursor = "pointer";
            },
            onLeave: (event, legendItem, legend) => {
              event.native.target.style.cursor = "default";
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const value = ctx.raw * 60;
                const h = Math.floor(value / 60);
                const m = Math.floor(value % 60);

                // Formatação pedida: "221h 36min"
                const text = h > 0 ? `${h}h ${m}min` : `${m} minutos`;
                return text;
              },
            },
          },
        },
      },
    });
  }

  updateTheme(isDark) {
    const textColor = isDark ? "#e0e0e0" : "#333333";
    const gridColor = isDark ? "#444444" : "#dddddd";

    const apply = (chart) => {
      if (!chart) return;
      chart.options.scales.x.ticks.color = textColor;
      chart.options.scales.y.ticks.color = textColor;
      chart.options.scales.x.grid.color = gridColor;
      chart.options.scales.y.grid.color = gridColor;
      chart.options.plugins.legend.labels.color = textColor;
      chart.update();
    };

    apply(this.performanceChart);
  }

  updateTimeChartFilter(filter) {
    if (!this.allHistory.length) return;

    this.currentTimeFilter = filter;
    const filtered = this.filterHistoryByPeriod(this.allHistory, filter);

    // ATUALIZA O TEXTO DO TOTAL AQUI
    this.updateTotalDisplay(filtered);

    const stats = this.buildStats(filtered);
    const labels = Object.keys(stats);
    const timeHours = labels.map((l) => (stats[l].time / 60).toFixed(2));

    if (this.timeChart) {
      this.timeChart.data.labels = labels;
      this.timeChart.data.datasets[0].data = timeHours;
      this.timeChart.update();
    }
  }
}
