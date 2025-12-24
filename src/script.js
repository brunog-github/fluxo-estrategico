// Dados iniciais (padrão se não houver nada salvo)
let subjects = JSON.parse(localStorage.getItem("studyCycle")) || [
  "Português",
  "Matemática",
  "Informática",
  "Raciocínio Lógico",
];

// Índice da matéria atual (salvo no navegador)
let currentIndex = parseInt(localStorage.getItem("currentIndex")) || 0;

// Variáveis do Timer
let timerInterval;
let seconds = 0;
let isPaused = false;

// --- Funções de Navegação e Renderização ---

function init() {
  // Verifica se estava estudando antes de atualizar a página
  let savedState = localStorage.getItem("appState");

  if (savedState === "timer") {
    seconds = parseInt(localStorage.getItem("currentTimerSeconds") || 0);
    startStudy(true);
  } else {
    renderHome();
  }
}

function renderHome() {
  if (subjects.length === 0) {
    document.getElementById("home-subject-name").innerText = "Nenhuma matéria";
    document.getElementById("home-next-subject").innerText =
      "Configure o ciclo";
    return;
  }

  // Garante que o índice não estoure se removeu matérias
  if (currentIndex >= subjects.length) currentIndex = 0;

  let currentSubject = subjects[currentIndex];
  // Lógica circular: Se for o último, o próximo é o índice 0
  let nextIndex = (currentIndex + 1) % subjects.length;
  let nextSubject = subjects[nextIndex];

  document.getElementById("home-subject-name").innerText = currentSubject;
  document.getElementById("home-next-subject").innerText =
    "Depois: " + nextSubject;

  switchScreen("screen-home");
}

function switchScreen(screenId) {
  // Esconde todas as telas
  document.getElementById("screen-home").classList.add("hidden");
  document.getElementById("screen-timer").classList.add("hidden");
  document.getElementById("screen-finish").classList.add("hidden");
  document.getElementById("screen-config").classList.add("hidden");

  // Mostra a desejada
  document.getElementById(screenId).classList.remove("hidden");
}

// --- Lógica do Timer (Imagem 2) ---

function startStudy(isResuming = false) {
  if (subjects.length === 0) {
    showToast("error", "Adicione matérias na configuração primeiro!");
    return;
  }

  // Se não estiver retomando (é inicio novo), zera o tempo
  if (!isResuming) {
    seconds = 0;
    localStorage.setItem("currentTimerSeconds", 0);
  }

  // Salva que o app está no modo TIMER
  localStorage.setItem("appState", "timer");

  let currentSubject = subjects[currentIndex];
  let nextIndex = (currentIndex + 1) % subjects.length;

  document.getElementById("timer-subject-name").innerText = currentSubject;
  document.getElementById("timer-next-subject-display").innerText =
    "Próxima matéria: " + subjects[nextIndex];

  switchScreen("screen-timer");

  // Reseta e inicia timer
  isPaused = false;
  updateTimerDisplay();

  clearInterval(timerInterval);
  timerInterval = setInterval(timerTick, 1000);

  document.getElementById("btn-pause").innerText = "Pausar";
  document.getElementById("btn-pause").classList.remove("btn-outline");
}

function timerTick() {
  if (!isPaused) {
    seconds++;
    updateTimerDisplay();
    localStorage.setItem("currentTimerSeconds", seconds);
  }
}

function updateTimerDisplay() {
  let h = Math.floor(seconds / 3600);
  let m = Math.floor((seconds % 3600) / 60);
  let s = seconds % 60;

  // Formata para 00:00:00
  let text =
    (h < 10 ? "0" + h : h) +
    ":" +
    (m < 10 ? "0" + m : m) +
    ":" +
    (s < 10 ? "0" + s : s);

  document.getElementById("timer-count").innerText = text;
}

function togglePause() {
  isPaused = !isPaused;
  let btn = document.getElementById("btn-pause");
  if (isPaused) {
    btn.innerText = "Retomar";
    btn.classList.add("btn-outline"); // Muda estilo visual
  } else {
    btn.innerText = "Pausar";
    btn.classList.remove("btn-outline");
  }
}

function finishSession() {
  clearInterval(timerInterval);
  localStorage.setItem("appState", "home"); // voltamos para o estado neutro
  localStorage.removeItem("currentTimerSeconds"); // limpa o tempo salvo

  document.getElementById("finish-subject-name").innerText =
    subjects[currentIndex];
  // Limpa campos
  document.getElementById("input-questions").value = "";
  document.getElementById("input-correct").value = "";

  switchScreen("screen-finish");
}

function saveAndAdvance() {
  let questionsInput =
    parseInt(document.getElementById("input-questions").value) || 0;
  let correctQuestionsInput =
    parseInt(document.getElementById("input-correct").value) || 0;

  if (correctQuestionsInput > questionsInput) {
    showToast(
      "error",
      "Erro: O número de acertos não pode ser maior que o total de questões!"
    );
    return;
  }

  // 1. Capturar dados atuais
  let dateNow = new Date();
  // Formata data: 22/12/2025
  let dateString = dateNow.toLocaleDateString("pt-BR");
  // Formata hora: 14:30
  let timeString = dateNow.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  let entry = {
    id: Date.now(), // ID único baseado em timestamp
    date: dateString + " às " + timeString,
    subject: subjects[currentIndex],
    duration: document.getElementById("timer-count").innerText,
    questions: document.getElementById("input-questions").value || "0",
    correct: document.getElementById("input-correct").value || "0",
  };

  // 2. Salvar no LocalStorage (Histórico)
  // Pega o histórico existente ou cria array vazio
  let history = JSON.parse(localStorage.getItem("studyHistory")) || [];
  // Adiciona o novo registro no INÍCIO do array (unshift)
  history.unshift(entry);
  // Salva de volta
  localStorage.setItem("studyHistory", JSON.stringify(history));

  // 3. Lógica original de avançar o ciclo
  currentIndex++;
  if (currentIndex >= subjects.length) {
    currentIndex = 0;
  }
  localStorage.setItem("currentIndex", currentIndex);

  showToast("success", "Dados salvos no histórico!");
  renderHome();
}

// --- Lógica de Configuração (Imagem 3) ---

function showConfig() {
  renderConfigList();
  switchScreen("screen-config");
}

function renderConfigList() {
  let list = document.getElementById("config-list");
  list.innerHTML = "";

  subjects.forEach((subj, index) => {
    let li = document.createElement("li");
    li.setAttribute("data-name", subj);

    li.innerHTML = `
    <div style="display:flex; align-items:center;">
    <span class="drag-handle">::</span>
    <span>${index + 1}. ${subj}</span>
    </div>
                    <button style="background:red; color:white; border:none; border-radius:5px; cursor:pointer;" onclick="removeSubject(${index})"><i class="fa fa-trash-o"></i></button>
                `;
    list.appendChild(li);
  });

  //Chama a função que ativa o arrastar (definida abaixo)
  initSortable();
}

function addSubject() {
  let input = document.getElementById("new-subject-input");
  let val = input.value.trim();
  if (val) {
    subjects.push(val);
    localStorage.setItem("studyCycle", JSON.stringify(subjects));
    input.value = "";
    renderConfigList();
  }
}

function removeSubject(index) {
  subjects.splice(index, 1);
  localStorage.setItem("studyCycle", JSON.stringify(subjects));
  renderConfigList();
  showToast("success", "Matéria removida com sucesso!");
}

function goHome() {
  // Se o usuário deletou a matéria atual, reseta o índice
  if (currentIndex >= subjects.length) currentIndex = 0;

  if (subjects.length === 0) {
    showToast("warning", "Adicione pelo menos 1 matéria.");
    return;
  }

  localStorage.setItem("currentIndex", currentIndex);
  renderHome();
}

/* --- FUNÇÕES DE RELATÓRIO --- */

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

    showToast("success", "Matéria excluída!");
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

// Atualize a função switchScreen para incluir a nova tela 'screen-reports'
// Copie e substitua sua função switchScreen antiga por esta:
function switchScreen(screenId) {
  let screens = [
    "screen-home",
    "screen-timer",
    "screen-finish",
    "screen-config",
    "screen-reports",
  ];
  screens.forEach((id) => {
    let el = document.getElementById(id);
    if (el) {
      if (id === screenId) el.classList.remove("hidden");
      else el.classList.add("hidden");
    }
  });
}

// Variáveis globais para controlar as instâncias dos gráficos (para poder destruir e recriar)
let performanceChartInstance = null;
let timeChartInstance = null;

// --- NOVAS FUNÇÕES PARA OS GRÁFICOS ---

function timeToMinutes(timeStr) {
  // Converte "01:30:00" ou "00:10:00" para minutos (Number)
  if (!timeStr) return 0;
  const parts = timeStr.split(":");
  let h = parseInt(parts[0]) || 0;
  let m = parseInt(parts[1]) || 0;
  let s = parseInt(parts[2]) || 0;
  return h * 60 + m + s / 60; // Retorna minutos totais (com decimais se tiver segundos)
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

// Drag-drop screen-config

let sortableInstance = null; // guarda a instancia do sortable e não cria duplicatas

function initSortable() {
  let el = document.getElementById("config-list");

  // Se já existe, não recria, apenas atualiza
  if (sortableInstance) return;

  sortableInstance = new Sortable(el, {
    handle: ".drag-handle", // só arrasta se puxar pelo icone
    animation: 150,
    onEnd: function (evt) {
      updateOrder(); // quando solta o item ativa essa função
    },
  });
}

function updateOrder() {
  let listItems = document.querySelectorAll("#config-list li");

  let newSubjects = [];

  listItems.forEach((li) => {
    let name = li.getAttribute("data-name");
    newSubjects.push(name);
  });

  // 2 - Atualiza o array global
  subjects = newSubjects;

  // 3 - Salva no localstorage
  localStorage.setItem("studyCycle", JSON.stringify(subjects));

  // 4 - Re-renderiza a lista (para atualizar a ordem)
  renderConfigList();
}

// Toast de notificação

function showToast(type = "info", message, duration = 3500) {
  const container = document.getElementById("toast-container");

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  toast.innerHTML = `
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
      `;

  container.appendChild(toast);

  // Mostra com animação
  setTimeout(() => toast.classList.add("show"), 100);

  // Remove automaticamente
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400); // tempo da animação de saída
  }, duration);
}

/**
 * Mostra um toast de confirmação com botões Confirmar/Cancelar
 * @param {string} message - Texto da pergunta/confirmação
 * @param {function} onConfirm - Função que será executada ao clicar em Confirmar
 * @param {string} [title="Confirmação"] - Título opcional
 * @param {string} [confirmText="Confirmar"] - Texto do botão confirmar
 * @param {string} [cancelText="Cancelar"] - Texto do botão cancelar
 */
function confirmAction(
  message,
  onConfirm,
  title = "Confirmação",
  confirmText = "Confirmar",
  cancelText = "Cancelar"
) {
  const container = document.getElementById("toast-container");

  const toast = document.createElement("div");
  toast.className = "confirm-toast";

  toast.innerHTML = `
        <h3>${title}</h3>
        <p>${message}</p>
        <div class="confirm-buttons">
          <button class="btn btn-cancel">${cancelText}</button>
          <button class="btn btn-confirm">${confirmText}</button>
        </div>
      `;

  // Eventos dos botões
  const btnCancel = toast.querySelector(".btn-cancel");
  const btnConfirm = toast.querySelector(".btn-confirm");

  btnCancel.onclick = () => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  };

  btnConfirm.onclick = () => {
    onConfirm();
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  };

  container.appendChild(toast);

  // Animação de entrada
  setTimeout(() => toast.classList.add("show"), 50);
}

/* --- LÓGICA DE TEMA (DARK MODE) --- */

// 1. Verifica preferência salva ao carregar
document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    document.getElementById("theme-toggle").innerText = "☀️"; // Muda ícone para Sol
  }
});

function toggleTheme() {
  const html = document.documentElement;
  const btn = document.getElementById("theme-toggle");
  const currentTheme = html.getAttribute("data-theme");

  if (currentTheme === "dark") {
    html.removeAttribute("data-theme");
    localStorage.setItem("theme", "light");
    btn.innerText = "🌙";
  } else {
    html.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
    btn.innerText = "☀️";
  }

  // Atualiza os gráficos para corrigir a cor da fonte
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

// Inicia o app
init();
