// --- RELATÓRIOS (GRÁFICOS E TABELAS) ---

function showReports() {
  renderHistoryTable(); // Sua função antiga da tabela
  updateCharts(); // NOVA função dos gráficos
  switchScreen("screen-reports");
}

function renderHistoryTable() {
  let listBody = document.getElementById("history-list");
  let emptyMsg = document.getElementById("empty-history-msg");
  let history = JSON.parse(localStorage.getItem("studyHistory")) || [];

  listBody.innerHTML = ""; // Limpa tabela atual

  if (history.length === 0) {
    emptyMsg.style.display = "block";
  } else {
    emptyMsg.style.display = "none";

    // Loop para criar as linhas
    history.forEach((item) => {
      let tr = document.createElement("tr");

      // Simplificando a data para caber melhor na tabela (ex: pega só dd/mm)
      let shortDate = item.date.split(" às ")[0].slice(0, 5);

      tr.innerHTML = `
                <td><small>${shortDate}</small></td>
                <td style="text-align:left; font-weight:bold;">${
                  item.subject
                }</td>
                <td>${item.duration}</td>
                <td>${item.questions}</td>
                <td style="color:${item.correct > 0 ? "green" : "#333"}">${
        item.correct
      }</td>
      <td>
      <button
      onClick="deleteHistoryItem(${item.id})";
      style="background:transparent;
      border:none;
      font-size:16px;
      color:red;
      cursor:pointer;
      font-weight:bold;"><i class="fa fa-trash-o"></i>
      </button>
      </td>
            `;
      listBody.appendChild(tr);
    });
  }
}

function deleteHistoryItem(id) {
  //if (!confirm("Deseja apagar este registro ?")) return;
  confirmAction("Tem certeza que deseja excluir este registro?", () => {
    let history = JSON.parse(localStorage.getItem("studyHistory")) || [];

    // Filtra mantendo apenas os itens que não têm esse ID
    let newHistory = history.filter((item) => item.id !== id);

    localStorage.setItem("studyHistory", JSON.stringify(newHistory));

    // Atualiza a tabela e o gráfico
    renderHistoryTable();
    updateCharts();

    showToast("success", "Registro excluído!");
  });
}

function clearHistory() {
  confirmAction(
    "Tem certeza que deseja apagar todo o histórico de estudos?",
    () => {
      localStorage.removeItem("studyHistory");
      renderHistoryTable();
    }
  );
}

function updateCharts() {
  const history = JSON.parse(localStorage.getItem("studyHistory")) || [];
  if (history.length === 0) return;

  // 1. Processamento (Agrupar dados)
  let stats = {};

  history.forEach((item) => {
    let subj = item.subject;
    if (!stats[subj]) {
      stats[subj] = { correct: 0, wrong: 0, time: 0 };
    }

    let totalQ = parseInt(item.questions) || 0;
    let acertos = parseInt(item.correct) || 0;
    let erros = totalQ - acertos;
    if (erros < 0) erros = 0;

    stats[subj].correct += acertos;
    stats[subj].wrong += erros;
    stats[subj].time += timeToMinutes(item.duration);
  });

  // 2. Filtragem para o Gráfico de Desempenho (Ignora quem tem 0 questões)
  const allLabels = Object.keys(stats);

  // Arrays filtrados apenas para o gráfico de barras (Acerto/Erro)
  let perfLabels = [];
  let perfCorrect = [];
  let perfWrong = [];

  allLabels.forEach((label) => {
    let s = stats[label];
    // SÓ ADICIONA SE TIVER PELO MENOS 1 QUESTÃO RESPONDIDA (Certa ou Errada)
    if (s.correct + s.wrong > 0) {
      perfLabels.push(label);
      perfCorrect.push(s.correct);
      perfWrong.push(s.wrong);
    }
  });

  // Dados para o gráfico de Tempo (Mostra tudo, pois pode ter estudado sem fazer questões)
  const timeData = allLabels.map((l) => stats[l].time.toFixed(1));

  // --- RENDERIZAR GRÁFICO 1 (Desempenho) ---
  const ctxPerformance = document
    .getElementById("chart-performance")
    .getContext("2d");
  if (performanceChartInstance) performanceChartInstance.destroy();

  performanceChartInstance = new Chart(ctxPerformance, {
    type: "bar",
    data: {
      labels: perfLabels, // Usa as labels filtradas
      datasets: [
        { label: "Acertos", data: perfCorrect, backgroundColor: "#4CAF50" },
        { label: "Erros", data: perfWrong, backgroundColor: "#F44336" },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
    },
  });

  // --- RENDERIZAR GRÁFICO 2 (Tempo) ---
  const ctxTime = document.getElementById("chart-time").getContext("2d");
  if (timeChartInstance) timeChartInstance.destroy();

  timeChartInstance = new Chart(ctxTime, {
    type: "bar",
    data: {
      labels: allLabels, // Usa todas as labels
      datasets: [
        {
          label: "Tempo (min)",
          data: timeData,
          indexAxis: "y",
        },
      ],
    },
    options: { indexAxis: "y", responsive: true },
  });

  updateChartTheme();
}

function updateChartTheme() {
  // Se os gráficos não foram criados ainda, ignora
  if (!performanceChartInstance && !timeChartInstance) return;

  // Define cor baseada no tema
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const textColor = isDark ? "#e0e0e0" : "#333333";
  const gridColor = isDark ? "#444444" : "#dddddd";

  // Helper para atualizar um gráfico específico
  const applyColors = (chart) => {
    if (!chart) return;
    chart.options.scales.x.ticks.color = textColor;
    chart.options.scales.y.ticks.color = textColor;
    chart.options.scales.x.grid.color = gridColor;
    chart.options.scales.y.grid.color = gridColor;
    chart.options.plugins.legend.labels.color = textColor;
    chart.update();
  };

  applyColors(performanceChartInstance);
  applyColors(timeChartInstance);
}
