import { timeToMinutes, formatMinutesToHm } from "./utils.js";

export class ReportsCharts {
  constructor() {
    this.performanceChart = null;
    this.timeChart = null;
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
        plugins: { legend: { position: "bottom" } },
      },
    });
  }

  buildTimeChart(ctx, labels, hours) {
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
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              usePointStyle: true,
              padding: 12,
              color:
                document.documentElement.getAttribute("data-theme") === "dark"
                  ? "#e0e0e0"
                  : "#333333",
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const value = ctx.raw * 60; // minutos
                return formatMinutesToHm(value); // usa sua função
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
}
