// --- LÓGICA DE CONSTÂNCIA (STREAK) ---

function renderStreak() {
  const container = document.getElementById("streak-visual");
  const countDisplay = document.getElementById("streak-count");

  if (!container) return;

  container.innerHTML = "";

  const history = JSON.parse(localStorage.getItem("studyHistory")) || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Zerar hora para comparação justa

  // 1. Descobrir a data de INÍCIO REAL (Data mais antiga do histórico)
  let startDate = new Date();

  if (history.length > 0) {
    // Encontrar a data mais antiga no array
    // Formato esperado history[i].date: "31/12/2025 às 14:00"
    let timestamps = history.map((h) => parseDateStr(h.date).getTime());
    let oldestTs = Math.min(...timestamps);
    startDate = new Date(oldestTs);
  }
  startDate.setHours(0, 0, 0, 0);

  // 2. Calcular Streak Atual (Lógica numérica)
  let currentStreak = 0;

  // Loop de segurança de 365 dias para trás para calcular o número
  for (let i = 0; i < 365; i++) {
    let day = new Date(today);
    day.setDate(today.getDate() - i); // Começa hoje e vai voltando
    day.setHours(0, 0, 0, 0);

    // Se chegamos numa data ANTERIOR ao inicio real, paramos de exigir streak
    if (day < startDate && i > 0) break;

    let minutes = getMinutesStudiedOnDate(day, history);
    let dayOfWeek = day.getDay();
    let isRest = restDays.includes(dayOfWeek);

    if (minutes >= 20) {
      currentStreak++;
    } else if (isRest) {
      // Descanso mantém o streak mas não soma
      continue;
    } else if (i === 0) {
      // Se é hoje e ainda não estudou, não quebra (ainda)
      continue;
    } else {
      // Quebrou
      break;
    }
  }
  countDisplay.innerText = `${currentStreak} dias seguidos 🔥`;

  // 3. Renderizar as bolinhas (VISUAL)
  // Vamos mostrar fixo os últimos 14 dias para preencher a div visualmente
  // Mas só vamos julgar (Vermelho/Verde) se a data for >= startDate

  const daysToShow = 14; // Aumentei para 14 para ficar mais cheio

  for (let i = daysToShow - 1; i >= 0; i--) {
    let day = new Date(today);
    day.setDate(today.getDate() - i);
    day.setHours(0, 0, 0, 0);

    let minutesStuded = getMinutesStudiedOnDate(day, history);
    let dayOfWeek = day.getDay();
    let isRest = restDays.includes(dayOfWeek);
    let dateStr = day.toLocaleDateString("pt-BR").slice(0, 5); // "31/12"

    let div = document.createElement("div");
    div.className = "streak-dot";

    let minutesSplit = (minutesStuded / 60).toFixed(2);
    let hour = minutesSplit.split(".")[0];
    let minutes = ((minutesSplit - hour) * 60).toFixed(0);

    if (minutesStuded >= 60) {
      div.title = `${dateStr}: ${hour}h ${minutes}min`;
    } else {
      div.title = `${dateStr}: ${minutesStuded.toFixed(0)} min`;
    }

    div.innerText = dateStr.split("/")[0]; // Dia do mês

    // Lógica de Cores
    if (day < startDate) {
      // Data ANTERIOR ao começo do uso do app
      // Deixa cinza padrão, sem ícone, indicando "não existia"
      div.style.opacity = "0.3";
      div.innerText = "-";
    } else if (minutesStuded >= 20) {
      div.classList.add("success");
      div.innerHTML = "✓";
    } else if (isRest) {
      div.classList.add("rest");
      div.title = `${dateStr} - Dia de Descanso`;
      div.innerHTML = "😴";
    } else if (i === 0) {
      // Hoje (Ainda incompleto)
      div.classList.add("today");
      div.style.backgroundColor = "transparent";
      div.style.color = "var(--text-color)";
    } else {
      // Falha
      div.classList.add("fail");
      div.title = `${dateStr} - Não estudou esse dia`;
      div.innerHTML = "✕";
    }

    container.appendChild(div);
  }

  setTimeout(() => {
    container.scrollLeft = container.scrollWidth;
  }, 0);
}

// Helper: Converte string "dd/mm/aaaa às HH:MM" para Date Object real
function parseDateStr(str) {
  // Pega só a parte da data: "31/12/2025"
  let datePart = str.split(" às ")[0];
  let parts = datePart.split("/");
  // Construtor Date aceita (ano, mes-index, dia)
  // Mês em JS começa em 0 (Jan=0), por isso parts[1]-1
  return new Date(parts[2], parts[1] - 1, parts[0]);
}

// Helper: Soma minutos estudados numa data específica
function getMinutesStudiedOnDate(dateObj, history) {
  // Formata data para dd/mm/yyyy para comparar com o histórico
  let dateStr = dateObj.toLocaleDateString("pt-BR");

  let totalMinutes = 0;

  history.forEach((item) => {
    // item.date é "dd/mm/yyyy às HH:MM"
    let itemDateStr = item.date.split(" às ")[0];

    if (itemDateStr === dateStr) {
      totalMinutes += timeToMinutes(item.duration);
    }
  });

  return totalMinutes;
}

// Helper: Salvar dias de descanso (chamado pelo botão na config)
function saveRestDays() {
  let checkboxes = document.querySelectorAll(".rest-day-check");
  let selected = [];
  checkboxes.forEach((cb) => {
    if (cb.checked) selected.push(parseInt(cb.value));
  });

  restDays = selected;
  localStorage.setItem("restDays", JSON.stringify(restDays));
  showToast("success", "Dias de descanso salvos!");
  renderStreak(); // Atualiza visual se estiver visível
}

// Helper: Preencher checkboxes ao abrir config
function loadRestDaysUI() {
  let checkboxes = document.querySelectorAll(".rest-day-check");
  checkboxes.forEach((cb) => {
    if (restDays.includes(parseInt(cb.value))) {
      cb.checked = true;
    } else {
      cb.checked = false;
    }
  });
}
