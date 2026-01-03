// js/5-app.js

// --- LÓGICA DO CALENDÁRIO MODAL ---

let calendarCursorDate = new Date(); // Data que está sendo visualizada no calendário

const CAL_MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function toggleCalendarModal() {
  const modal = document.getElementById("calendar-modal");
  modal.classList.toggle("hidden");

  // Se abriu, reseta para o mês atual e renderiza
  if (!modal.classList.contains("hidden")) {
    calendarCursorDate = new Date(); // Reseta para hoje
    renderCalendarGrid();
  }
}

function changeCalendarMonth(offset) {
  calendarCursorDate.setMonth(calendarCursorDate.getMonth() + offset);
  renderCalendarGrid();
}

// Helper para converter string "DD/MM/YYYY" em número YYYYMMDD (para comparação fácil)
function dateStrToInt(dateStr) {
  const parts = dateStr.split("/");
  if (parts.length < 3) return 0;
  // Retorna 20251217 por exemplo
  return parseInt(parts[2] + parts[1] + parts[0]);
}

function renderCalendarGrid() {
  const grid = document.getElementById("calendar-grid");
  const title = document.getElementById("cal-month-year");
  if (!grid) return;

  grid.innerHTML = ""; // Limpa o grid anterior

  const year = calendarCursorDate.getFullYear();
  const month = calendarCursorDate.getMonth(); // 0 a 11

  title.innerText = `${CAL_MONTHS[month]} ${year}`;

  // Dados do LocalStorage
  const history = JSON.parse(localStorage.getItem("studyHistory")) || [];
  const restDaysIndexes = JSON.parse(localStorage.getItem("restDays")) || []; // Ex: [0, 6] para Dom/Sáb

  // Objeto para somar os minutos por dia: {"DD/MM/YYYY": totalMinutos}
  const dailyStudyTotals = {};

  // Variáveis para descobrir o intervalo do histórico
  let minDateInt = 99999999; // Valor alto inicial
  let maxDateIntFromHistory = 0; // Valor baixo inicial

  history.forEach((item) => {
    if (item.date && typeof item.date === "string" && item.duration) {
      // Pega apenas a primeira parte antes do " às "
      const dateOnly = item.date.split(" ")[0]; // Resultado: "17/12/2025"
      const durationInMinutes = timeToMinutes(item.duration);

      // Soma a duração para o dia específico
      dailyStudyTotals[dateOnly] =
        (dailyStudyTotals[dateOnly] || 0) + durationInMinutes;

      const dateInt = dateStrToInt(dateOnly);
      if (dateInt < minDateInt) minDateInt = dateInt;
      if (dateInt > maxDateIntFromHistory) maxDateIntFromHistory = dateInt;
    }
  });

  const studiedSet = new Set();
  const MIN_DURATION = 20;

  for (const dateKey in dailyStudyTotals) {
    if (dailyStudyTotals[dateKey] >= MIN_DURATION) {
      studiedSet.add(dateKey); // Adiciona a data SÓ SE for >= 20 min
    }
  }

  // Se não tiver histórico nenhum, define limites vazios
  if (history.length === 0) {
    minDateInt = 0;
  }

  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 (Dom) a 6 (Sáb) do dia 1º
  const daysInMonth = new Date(year, month + 1, 0).getDate(); // Total de dias no mês

  // Data de hoje para destaque
  const todayObj = new Date();
  const todayStr = `${String(todayObj.getDate()).padStart(2, "0")}/${String(
    todayObj.getMonth() + 1
  ).padStart(2, "0")}/${todayObj.getFullYear()}`;

  const maxDateInt = dateStrToInt(todayStr);

  for (let i = 0; i < firstDayIndex; i++) {
    grid.innerHTML += `<div class="cal-day empty"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    // Formata a data atual do loop
    const dayStr = String(day).padStart(2, "0");
    const monthStr = String(month + 1).padStart(2, "0");
    const dateKey = `${dayStr}/${monthStr}/${year}`;
    const dateInt = dateStrToInt(dateKey); // YYYYMMDD do dia sendo desenhado

    const currentDayDate = new Date(year, month, day);
    const dayOfWeekIndex = currentDayDate.getDay();

    let statusClass = "";

    let todayStrFormattedForVerification = todayStr
      .split("/")
      .reverse()
      .join("");

    if (studiedSet.has(dateKey)) {
      statusClass = "studied";
    } else if (
      dateInt >= minDateInt &&
      dateInt <= maxDateInt &&
      studiedSet.size !== 0
    ) {
      if (restDaysIndexes.includes(dayOfWeekIndex)) {
        statusClass = "rest";
      } else if (dateInt != todayStrFormattedForVerification) {
        statusClass = "missed";
      }
    }

    const isToday =
      dateKey === todayStr && statusClass != "studied" && statusClass != "rest"
        ? "today"
        : "";

    grid.innerHTML += `
            <div class="cal-day ${statusClass} ${isToday}">
                ${day}
            </div>
        `;
  }
}

window.addEventListener("click", function (event) {
  const modal = document.getElementById("calendar-modal");
  if (event.target === modal) {
    modal.classList.add("hidden");
  }
});
