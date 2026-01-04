// --- LÓGICA DE CONSTÂNCIA (STREAK) ---

function renderStreak() {
  const container = document.getElementById("streak-visual");
  const countDisplay = document.getElementById("streak-count");

  if (!container) return;

  container.innerHTML = "";

  const history = JSON.parse(localStorage.getItem("studyHistory")) || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Descobrir data inicial real
  let startDate = new Date();
  if (history.length > 0) {
    const timestamps = history.map((h) => parseDateStr(h.date).getTime());
    startDate = new Date(Math.min(...timestamps));
  }
  startDate.setHours(0, 0, 0, 0);

  // 2. Calcular streak atual
  let currentStreak = 0;

  for (let i = 0; i < 365; i++) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    day.setHours(0, 0, 0, 0);

    if (day < startDate && i > 0) break;

    const minutes = getMinutesStudiedOnDate(day, history);
    const isRest = restDays.includes(day.getDay());

    if (minutes >= 20) {
      currentStreak++;
    } else if (isRest || i === 0) {
      continue;
    } else {
      break;
    }
  }

  countDisplay.innerText = `${currentStreak} dias seguidos 🔥`;

  // 3. Render visual (últimos 14 dias)
  const daysToShow = 14;

  for (let i = daysToShow - 1; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    day.setHours(0, 0, 0, 0);

    const minutesStuded = getMinutesStudiedOnDate(day, history);
    const isRest = restDays.includes(day.getDay());
    const dateStr = day.toLocaleDateString("pt-BR").slice(0, 5);

    const div = document.createElement("div");
    div.className = "streak-dot";
    div.innerText = dateStr.split("/")[0];

    // Cálculo de horas/minutos
    let tooltipText;
    if (minutesStuded >= 60) {
      const totalMinutes = Math.round(minutesStuded);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      tooltipText = `${dateStr} - ${h}h ${m}min`;
    } else {
      tooltipText = `${dateStr} - ${Math.round(minutesStuded)} min`;
    }

    // Lógica visual + tooltip
    if (day < startDate) {
      div.style.opacity = "0.3";
      div.innerText = "-";
      tooltipText = `${dateStr} - Sem dados`;
    } else if (minutesStuded >= 20) {
      div.classList.add("success");
      div.innerHTML = "✓";
    } else if (isRest) {
      div.classList.add("rest");
      div.innerHTML = "😴";
      tooltipText = `${dateStr} - Dia de descanso`;
    } else if (i === 0) {
      div.classList.add("today");
      div.style.backgroundColor = "transparent";
      div.style.color = "var(--text-color)";
      tooltipText = `${dateStr} - Hoje`;
    } else {
      div.classList.add("fail");
      div.innerHTML = "✕";
      tooltipText = `${dateStr} - Não estudou`;
    }

    // 🔥 Tooltip global
    div.dataset.tooltip = tooltipText;

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
