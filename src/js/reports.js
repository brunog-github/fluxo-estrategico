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

  const timeInHours = timeData.map((str) => {
    const minutes = Number(str);
    const hours = minutes / 60;

    return hours.toFixed(2);
  });

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
        legend: { position: "bottom" },
      },
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
          label: "Tempo (hr)",
          data: timeInHours,
          indexAxis: "x",
        },
      ],
    },
    options: {
      indexAxis: "x",
      responsive: true,
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
        legend: { position: "bottom" },
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
            <div style="font-size:12px; opacity:0.7; color:#ff4444;">Erros</div>
            <div style="font-size:18px; font-weight:bold; color:#ff4444;">${totalE}</div>
        </div>
        <div>
            <div style="font-size:12px; opacity:0.7;">Precisão de Acertos</div>
            <div style="font-size:18px; font-weight:bold;">${accPerc}%</div>
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
  applyColors(timeChartInstance);
}

// --- NOVO CÓDIGO: EXPORTAR E IMPORTAR CSV ---

function exportToCSV() {
  let history = JSON.parse(localStorage.getItem("studyHistory")) || [];

  if (history.length === 0) {
    showToast("error", "Não há dados para exportar.");
    return;
  }

  // 1. Cabeçalho do CSV
  let csvContent = "Data,Hora,Materia,Tempo,Total Questoes,Acertos,Erros\n";

  // 2. Processar linhas
  history.forEach((row) => {
    // Separar data e hora que estão juntas na string
    let dateParts = row.date.split(" às ");
    let date = dateParts[0] || "";
    let time = dateParts[1] || "";

    // Tratar as observações para evitar quebra com vírgulas (coloca entre aspas)
    //let cleanNotes = row.notes ? `"${row.notes.replace(/"/g, '""')}"` : "";
    let incorretQuestions = row.questions - row.correct;

    let line = [
      date,
      time,
      row.subject,
      row.duration,
      row.questions,
      row.correct,
      incorretQuestions,
      //cleanNotes,
    ].join(",");

    csvContent += line + "\n";
  });

  // 3. Criar arquivo Blob com BOM para o Excel ler acentos (UTF-8)
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  // 4. Download automático
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `meus_estudos_fluxo_estrategico-${Date.now()}.csv`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast("success", "Exportação concluída com sucesso!");
}

function triggerImport() {
  document.getElementById("import-file").click();
}

function importFromCSV(input) {
  const file = input.files[0];
  if (!file) return;

  const fileName = file.name;
  const fileExtension = fileName
    .substring(fileName.lastIndexOf("."))
    .toLowerCase();

  if (fileExtension !== ".csv") {
    showToast(
      "error",
      "Erro de Importação: Por favor, selecione um arquivo no formato CSV (.csv)."
    );
    input.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    const text = e.target.result;
    try {
      processCSVData(text);
      showToast("success", "Importação concluída com sucesso!");
      renderHistoryTable(); // Atualiza tabela visual
      updateCharts(); // Atualiza gráficos
    } catch (err) {
      console.error(err);
      showToast(
        "error",
        "Erro ao ler o arquivo. Certifique-se que é o mesmo formato .CSV gerado pelo site."
      );
    }
    // Limpa o input para permitir importar o mesmo arquivo novamente se precisar
    input.value = "";
  };

  reader.readAsText(file);
}

function processCSVData(csvText) {
  const lines = csvText.split("\n");
  const newHistory = [];

  const expectedHeader = "Data,Hora,Materia,Tempo,Total Questoes,Acertos,Erros";
  const actualHeader = lines[0].trim();

  if (actualHeader !== expectedHeader) {
    showToast(
      "warning",
      `O arquivo não é compativel com as configurações. -- Cabeçalho Esperado: ${expectedHeader} -- Cabeçalho Encontrado: ${actualHeader}`
    );
    throw new Error("Arquivo incorreto!");
  }

  // Começa do 1 para pular o cabeçalho
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Lógica simples para separar por vírgula, mas respeitando aspas das observações
    // Regex: pega virgulas que não estão dentro de aspas
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

    if (cols.length >= 5) {
      let entry = {
        id: Date.now() + i, // Gera um ID único novo
        date: cols[0] + " às " + cols[1], // Remonta a string de data
        subject: cols[2],
        duration: cols[3],
        questions: cols[4],
        correct: cols[5],
      };
      newHistory.push(entry);
    }
  }

  // Mesclar com o histórico atual
  let currentHistory = JSON.parse(localStorage.getItem("studyHistory")) || [];
  let mergedHistory = newHistory.concat(currentHistory);

  localStorage.setItem("studyHistory", JSON.stringify(mergedHistory));
}
