// Variáveis dos Gráficos (Para poder destruir/atualizar)
let performanceChartInstance = null;
let timeChartInstance = null;

function showReports() {
  renderHistoryTable(); // Sua função antiga da tabela
  updateCharts(); // NOVA função dos gráficos
  showMobileRotateTip();
  updateLifetimeStats();
  switchScreen("screen-reports");
}

function renderHistoryTable() {
  populateFilterSubjects();

  let listBody = document.getElementById("history-list");
  let emptyMsg = document.getElementById("empty-history-msg");
  let rawHistory = JSON.parse(localStorage.getItem("studyHistory")) || [];

  let history = getFilteredHistory(rawHistory);

  listBody.innerHTML = ""; // Limpa tabela atual

  if (history.length === 0) {
    emptyMsg.style.display = "block";
  } else {
    emptyMsg.style.display = "none";

    history.sort((a, b) => {
      const parse = (s) => {
        const [dmy, hm] = s.split(" às ");
        const [day, mon, year] = dmy.split("/").map(Number);
        const [hh, mm] = hm.split(":").map(Number);
        return new Date(year, mon - 1, day, hh, mm).getTime();
      };
      return parse(b.date) - parse(a.date);
    });

    // Loop para criar as linhas
    history.forEach((item) => {
      let tr = document.createElement("tr");

      // Simplificando a data para caber melhor na tabela (ex: pega só dd/mm)
      let [date] = item.date.split(" às ");
      const [day, mon, year] = date.split("/");
      const yearShort = year.slice(-2);

      tr.innerHTML = `
                <td><small>${day}/${mon}/${yearShort}</small></td>
                <td style="text-align:left; font-weight:bold; text-transform: capitalize;">${
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
    updateLifetimeStats();

    showToast("success", "Registro excluído!");
  });
}

function clearHistory() {
  confirmAction(
    "Tem certeza que deseja apagar todo o histórico de estudos?",
    () => {
      localStorage.removeItem("studyHistory");
      renderHistoryTable();
      localStorage.removeItem("unlockedAchievements");
      location.reload();
    }
  );
}

function updateCharts() {
  const history = JSON.parse(localStorage.getItem("studyHistory")) || [];
  if (history.length === 0) return;

  // 1. Processamento (Agrupar dados)
  let stats = {};

  history.forEach((item) => {
    let subj = item.subject.toUpperCase(); // deixa as letras maiusculas para os graficos
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
    let subject = stats[label];
    // SÓ ADICIONA SE TIVER PELO MENOS 1 QUESTÃO RESPONDIDA (Certa ou Errada)
    if (subject.correct + subject.wrong > 0) {
      perfLabels.push(label);
      perfCorrect.push(subject.correct);
      perfWrong.push(subject.wrong);
    }
  });

  // Dados para o gráfico de Tempo (Mostra tudo, pois pode ter estudado sem fazer questões)
  const timeData = allLabels.map((l) => stats[l].time.toFixed(1));

  const timeInHours = timeData.map((str) => {
    const minutes = Number(str);
    const hours = minutes / 60;

    return hours.toFixed(2);
  });

  // --- RENDERIZAR GRÁFICO 1 (Desempenho) ---
  const ctxPerformance = document
    .getElementById("chart-performance")
    .getContext("2d");

  const divChartPerformance = document.getElementById("chart-subjects");

  if (perfLabels.length === 0) {
    divChartPerformance.style.display = "none";
  }

  if (performanceChartInstance) performanceChartInstance.destroy();

  performanceChartInstance = new Chart(ctxPerformance, {
    type: "bar",
    data: {
      labels: perfLabels.map((m) => {
        if (!m.startsWith("DIREITO")) return m;

        const resto = m.replace("DIREITO", "").trim();
        return `D. ${resto}`;
      }), // Usa as labels filtradas
      datasets: [
        {
          label: "Acertos",
          data: perfCorrect,
          backgroundColor: "#4CAF50",
        },
        {
          label: "Erros",
          data: perfWrong,
          backgroundColor: "#F44336",
        },
      ],
    },
    options: {
      indexAxis: "x",
      responsive: true,
      scales: {
        x: {
          stacked: true,
          maintainAspectRatio: false, // Importante para mobile
          ticks: {
            autoSkip: false, // <--- OBRIGA A MOSTRAR TODAS AS MATÉRIAS
            maxRotation: 90, // Permite girar até 90 graus (vertical)
            minRotation: 45, // Mínimo de 45 graus de inclinação
            font: {
              size: 11, // Reduz um pouco a fonte para caber mais
            },
          },
        },
        y: {
          stacked: true,
          beginAtZero: true,
        },
      },
      plugins: {
        legend: { position: "bottom" }, //text-transform: capitalize
      },
    },
  });

  // --- RENDERIZAR GRÁFICO 2 (Tempo) ---
  const ctxTime = document.getElementById("chart-time").getContext("2d");
  if (timeChartInstance) timeChartInstance.destroy();

  timeChartInstance = new Chart(ctxTime, {
    type: "pie",
    data: {
      labels: allLabels.map((m) => {
        if (!m.startsWith("DIREITO")) return m;

        const resto = m.replace("DIREITO", "").trim();
        return `D. ${resto}`;
      }), // Usa todas as labels
      datasets: [
        {
          label: "Tempo (hr)",
          data: timeInHours,
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
      },
    },
  });

  updateChartTheme();

  summaryQuestions(history);
}

function summaryQuestions(history) {
  // --- NOVO: RESUMO GERAL DE QUESTÕES ---
  // Calcula os totais
  let totalQ = 0;
  let totalC = 0;

  history.forEach((h) => {
    totalQ += parseInt(h.questions) || 0;
    totalC += parseInt(h.correct) || 0;
  });

  let totalE = totalQ - totalC;
  let accPerc = totalQ > 0 ? ((totalC / totalQ) * 100).toFixed(1) : 0;

  // Encontra o container onde o gráfico de matérias está
  const subjectChartContainer =
    document.getElementById("chart-subjects").parentElement;

  // Cria (ou atualiza) o elemento de resumo
  let summaryDiv = document.getElementById("report-summary-box");
  if (!summaryDiv) {
    summaryDiv = document.createElement("div");
    summaryDiv.id = "report-summary-box";
    summaryDiv.style.cssText = `
            display: flex; 
            justify-content: space-around; 
            background: var(--card-bg); 
            padding: 15px; 
            border-radius: 8px; 
            margin-top: 15px; 
            border: 1px solid var(--border-color);
            text-align: center;
            flex-wrap: wrap; 
            gap: 10px;
        `;
    // Insere DEPOIS do gráfico de matérias
    subjectChartContainer.appendChild(summaryDiv);
  }

  let accPercTextColor = "";

  if (accPerc < 50) {
    accPercTextColor = "#ff5252";
  } else if (accPerc >= 70) {
    accPercTextColor = "#28a745";
  } else {
    accPercTextColor = "#ffc107";
  }

  summaryDiv.innerHTML = `
        <div>
            <div style="font-size:12px; opacity:0.7;">Questões</div>
            <div style="font-size:18px; font-weight:bold;">${totalQ}</div>
        </div>
        <div>
            <div style="font-size:12px; opacity:0.7; color:var(--success-color);">Acertos</div>
            <div style="font-size:18px; font-weight:bold; color:var(--success-color);">${totalC}</div>
        </div>
        <div>
            <div style="font-size:12px; opacity:0.7; color:#ff0000;">Erros</div>
            <div style="font-size:18px; font-weight:bold; color:#ff4444;">${totalE}</div>
        </div>
        <div>
            <div style="font-size:12px; opacity:0.7;">Precisão de Acertos</div>
            <div style="font-size:18px; font-weight:bold; color:${accPercTextColor}">${accPerc}%</div>
        </div>
    `;
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
}

/**
 * Exibe a dica para girar a tela apenas se for detectado um dispositivo mobile/estreito.
 */
function showMobileRotateTip() {
  const tipElement = document.getElementById("rotate-tip");
  if (!tipElement) return;

  // Se a largura da janela for menor que 600px, consideramos ser um celular em retrato
  if (window.innerWidth < 600) {
    tipElement.style.display = "block";
    // Adiciona um ícone simples de celular girando (usando SVG ou Unicode)
    tipElement.innerHTML = `
            <span style="font-size: 1.5em; vertical-align: middle; margin-right: 5px;">📱⟳</span>
            Gire o celular para melhor visualização do gráfico.
        `;
  } else {
    tipElement.style.display = "none";
  }
}

// É uma boa prática também checar a dica se o usuário redimensionar a tela
window.addEventListener("resize", showMobileRotateTip);
