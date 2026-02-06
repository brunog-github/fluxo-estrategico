import { timeToMinutes, formatMinutesToHm } from "./utils.js";

export class ReportsCharts {
  constructor() {
    this.performanceChart = null;
    this.timeChart = null;
    this.currentTimeFilter = "today"; // filtro ativo atualmente
    this.currentPerformanceFilter = "today"; // filtro ativo para performance
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
        item.date.split(" às ")[0].split("/").reverse().join("-"),
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
  updateTotalDisplay(history, simulados = []) {
    let totalMinutes = history.reduce(
      (acc, item) => acc + timeToMinutes(item.duration),
      0,
    );

    // Adicionar tempo dos simulados
    simulados.forEach((s) => {
      if (s.tempo) {
        const [hh, mm, ss] = s.tempo.split(":").map(Number);
        totalMinutes += hh * 60 + mm + ss / 60;
      }
    });

    const h = Math.floor(totalMinutes / 60);
    const m = Math.floor(totalMinutes % 60);

    // Formatação pedida: "221h 36min"
    const text = h > 0 ? `${h}h ${m}min` : `${m} minutos`;

    const el = document.getElementById("chart-time-total");
    if (el) el.textContent = text;
  }

  buildPerformanceChart(ctx, labels, correct, wrong) {
    // Abreviar "Direito" para "D."
    const abbreviatedLabels = labels.map((label) =>
      label.replace(/DIREITO/g, "D."),
    );

    // Ajustar altura do container com base no número de labels
    const container = document.getElementById("chart-performance-container");
    if (container) {
      const minHeight = Math.max(300, labels.length * 35);
      container.style.minHeight = `${minHeight}px`;
    }

    this.performanceChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: abbreviatedLabels,
        datasets: [
          {
            label: "Acertos",
            data: correct,
            backgroundColor: "#4CAF50",
          },
          {
            label: "Erros",
            data: wrong,
            backgroundColor: "#F44336",
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 0,
        },
        scales: {
          x: {
            stacked: true,
            //ticks: { autoSkip: false, maxRotation: 90, minRotation: 45 },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: {
              autoSkip: false, // NÃO pular matérias
            },
          },
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

    // Paleta de cores bem distintas e sem repetição
    const colors = [
      "#FF4444",
      "#0066FF",
      "#00AA00",
      "#FF9900",
      "#9933FF",
      "#FF6666",
      "#33CC33",
      "#FFAA00",
      "#CC66FF",
      "#003399",
      "#CC6600",
      "#6600CC",
      "#00CCFF",
      "#66FF33",
      "#FFCC00",
      "#FF00FF",
      "#CC0000",
      "#0033FF",
      "#FF3300",
    ];

    // Atribuir cores com base no índice dos labels
    const backgroundColor = labels.map(
      (_, index) => colors[index % colors.length],
    );

    // Detectar se é mobile
    const isMobile = window.innerWidth < 768;

    // Ajustar container do gráfico para mobile
    const container = document.getElementById("chart-time-container");
    if (container && isMobile) {
      container.style.height = "600px";
      container.style.maxHeight = "100%";
    }

    this.timeChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            label: "Tempo (hr)",
            data: hours,
            borderWidth: 1,
            backgroundColor: backgroundColor,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 0,
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              usePointStyle: true,
              padding: isMobile ? 8 : 12,
              color: textColor,
              font: {
                size: isMobile ? 11 : 13,
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

  updatePerformanceChartFilter(filter) {
    if (!this.allHistory.length) {
      // Mostrar placeholder mesmo sem dados
      const placeholder = document.getElementById(
        "chart-performance-placeholder",
      );
      const canvas = document.getElementById("chart-performance");
      if (placeholder && canvas) {
        placeholder.style.display = "block";
        canvas.style.display = "none";
        if (filter === "today") {
          placeholder.textContent = "Você ainda não resolveu questões hoje 😞";
        } else if (filter === "week") {
          placeholder.textContent = "Nenhuma questão resolvida esta semana 😞";
        } else if (filter === "month") {
          placeholder.textContent = "Nenhuma questão resolvida este mês 😞";
        } else {
          placeholder.textContent = "Nenhum registro de questões encontrado 😞";
        }
      }
      return;
    }

    this.currentPerformanceFilter = filter;
    const filtered = this.filterHistoryByPeriod(this.allHistory || [], filter);

    const stats = this.buildStats(filtered);
    const labels = [];
    const correct = [];
    const wrong = [];

    Object.keys(stats).forEach((l) => {
      const s = stats[l];
      if (s.correct + s.wrong > 0) {
        labels.push(l);
        correct.push(s.correct);
        wrong.push(s.wrong);
      }
    });

    // Mostrar/ocultar placeholder e gráfico
    const placeholder = document.getElementById(
      "chart-performance-placeholder",
    );
    const canvas = document.getElementById("chart-performance");
    const hasData = labels.length > 0;

    if (placeholder && canvas) {
      if (hasData) {
        placeholder.style.display = "none";
        canvas.style.display = "block";
      } else {
        placeholder.style.display = "block";
        canvas.style.display = "none";
        if (filter === "today") {
          placeholder.textContent = "Você ainda não resolveu questões hoje 😞";
        } else if (filter === "week") {
          placeholder.textContent = "Nenhuma questão resolvida esta semana 😞";
        } else if (filter === "month") {
          placeholder.textContent = "Nenhuma questão resolvida este mês 😞";
        } else {
          placeholder.textContent = "Nenhum registro de questões encontrado 😞";
        }
      }
    }

    // Abreviar "Direito" para "D."
    const abbreviatedLabels = labels.map((label) =>
      label.replace(/DIREITO/g, "D."),
    );

    // Ajustar altura do container com base no número de labels
    const container = document.getElementById("chart-performance-container");
    if (container && hasData) {
      const minHeight = Math.max(300, labels.length * 35);
      container.style.minHeight = `${minHeight}px`;
    }

    if (this.performanceChart) {
      this.performanceChart.data.labels = abbreviatedLabels;
      this.performanceChart.data.datasets[0].data = correct;
      this.performanceChart.data.datasets[1].data = wrong;
      this.performanceChart.update();
    }
  }

  updateTimeChartFilter(filter) {
    if (
      !this.allHistory.length &&
      (!this.allSimulados || !this.allSimulados.length)
    )
      return;

    this.currentTimeFilter = filter;
    const filtered = this.filterHistoryByPeriod(this.allHistory || [], filter);
    const filteredSimulados = this.filterSimuladosByPeriod(
      this.allSimulados || [],
      filter,
    );

    // ATUALIZA O TEXTO DO TOTAL AQUI
    this.updateTotalDisplay(filtered, filteredSimulados);

    const stats = this.buildStats(filtered);
    const labels = Object.keys(stats);
    const timeHours = labels.map((l) => (stats[l].time / 60).toFixed(2));

    // Adicionar simulados ao gráfico
    if (filteredSimulados.length > 0) {
      let totalSimuladosMinutes = 0;
      filteredSimulados.forEach((s) => {
        if (s.tempo) {
          const [hh, mm, ss] = s.tempo.split(":").map(Number);
          totalSimuladosMinutes += hh * 60 + mm + ss / 60;
        }
      });
      const simuladosHours = (totalSimuladosMinutes / 60).toFixed(2);
      labels.push("SIMULADOS");
      timeHours.push(simuladosHours);
    }

    // Mostrar/ocultar placeholder e gráfico
    const placeholder = document.getElementById("chart-time-placeholder");
    const canvas = document.getElementById("chart-time");
    const hasData = labels.length > 0;

    if (placeholder && canvas) {
      if (hasData) {
        placeholder.style.display = "none";
        canvas.style.display = "block";
      } else {
        placeholder.style.display = "block";
        canvas.style.display = "none";
        // Atualizar mensagem do placeholder baseado no filtro
        if (filter === "today") {
          placeholder.textContent = "Você ainda não estudou hoje 😞";
        } else if (filter === "week") {
          placeholder.textContent = "Nenhum estudo registrado esta semana 😞";
        } else if (filter === "month") {
          placeholder.textContent = "Nenhum estudo registrado este mês 😞";
        } else {
          placeholder.textContent = "Nenhum registro de estudo encontrado 😞";
        }
      }
    }

    if (this.timeChart) {
      this.timeChart.data.labels = labels;
      this.timeChart.data.datasets[0].data = timeHours;
      this.timeChart.update();
    }
  }

  filterSimuladosByPeriod(simulados, filter) {
    if (filter === "all") return simulados;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return simulados.filter((s) => {
      const itemDate = new Date(s.data);

      if (filter === "today") {
        return itemDate >= today;
      } else if (filter === "week") {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return itemDate >= weekAgo;
      } else if (filter === "month") {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return itemDate >= monthAgo;
      }
      return true;
    });
  }
}
