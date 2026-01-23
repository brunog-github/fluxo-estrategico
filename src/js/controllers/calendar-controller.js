import { CalendarUI } from "../ui/calendarUI.js";
import {
  dateStrToInt,
  formatDate,
  CAL_MONTHS,
} from "../utils/calendar-utils.js";
import { timeToMinutes } from "../utils/utils.js"; // usa sua função existente

export class CalendarController {
  constructor() {
    this.ui = new CalendarUI();
    this.cursorDate = new Date();

    this.ui.enableClickToClose();
  }

  toggleModal() {
    const opened = this.ui.toggleModal();
    if (opened) {
      this.cursorDate = new Date();
      this.render();
    }
  }

  changeMonth(offset) {
    this.cursorDate.setMonth(this.cursorDate.getMonth() + offset);
    this.render();
  }

  render() {
    const grid = this.ui.grid;
    if (!grid) return;

    this.ui.clearGrid();

    const year = this.cursorDate.getFullYear();
    const month = this.cursorDate.getMonth();

    this.ui.renderTitle(CAL_MONTHS[month], year);

    // Storage
    const history = JSON.parse(localStorage.getItem("studyHistory")) || [];
    const restDays = JSON.parse(localStorage.getItem("restDays")) || [];

    // Somas de minutos por dia
    const dailyTotals = {};

    let minDateInt = 99999999;
    let maxHistoryInt = 0;

    history.forEach((item) => {
      if (!item.date || !item.duration) return;

      const dateOnly = item.date.split(" ")[0];
      const mins = timeToMinutes(item.duration);

      dailyTotals[dateOnly] = (dailyTotals[dateOnly] || 0) + mins;

      const dateInt = dateStrToInt(dateOnly);
      if (dateInt < minDateInt) minDateInt = dateInt;
      if (dateInt > maxHistoryInt) maxHistoryInt = dateInt;
    });

    if (history.length === 0) minDateInt = 0;

    // Datas estudadas
    const studiedSet = new Set();
    const MIN_DURATION = 20;

    for (const dateKey in dailyTotals) {
      if (dailyTotals[dateKey] >= MIN_DURATION) studiedSet.add(dateKey);
    }

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Hoje
    const todayStr = formatDate(new Date());
    const todayInt = dateStrToInt(todayStr);

    // Preenche espaços vazios
    for (let i = 0; i < firstDayIndex; i++) {
      this.ui.addEmptyDay();
    }

    // Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, "0");
      const monthStr = String(month + 1).padStart(2, "0");
      const dateKey = `${dayStr}/${monthStr}/${year}`;
      const dateInt = dateStrToInt(dateKey);

      const dow = new Date(year, month, day).getDay();

      let status = "";

      if (studiedSet.has(dateKey)) {
        status = "studied";
      } else if (
        dateInt >= minDateInt &&
        dateInt <= todayInt &&
        studiedSet.size !== 0
      ) {
        if (restDays.includes(dow)) {
          status = "rest";
        } else if (dateInt !== todayInt) {
          status = "missed";
        }
      }

      const isToday =
        dateKey === todayStr && status !== "studied" && status !== "rest"
          ? "today"
          : "";

      this.ui.addDay(day, status, isToday);
    }
  }
}

