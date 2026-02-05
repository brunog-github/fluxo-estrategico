import { CalendarUI } from "../ui/calendarUI.js";
import { dbService } from "../services/db/db-service.js";
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

  async toggleModal() {
    const opened = this.ui.toggleModal();
    if (opened) {
      this.cursorDate = new Date();
      await this.render();
    }
  }

  changeMonth(offset) {
    this.cursorDate.setMonth(this.cursorDate.getMonth() + offset);
    this.render();
  }

  async render() {
    const grid = this.ui.grid;
    if (!grid) return;

    this.ui.clearGrid();

    const year = this.cursorDate.getFullYear();
    const month = this.cursorDate.getMonth();

    this.ui.renderTitle(CAL_MONTHS[month], year);

    // Storage
    const history = await dbService.getHistory();
    const simulados = await dbService.getAllSimulados();
    const restDays = (await dbService.getRestDays()) || [];

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

    // Adicionar simulados ao dailyTotals
    simulados.forEach((simulado) => {
      if (!simulado.data || !simulado.tempo) return;

      // Converter "YYYY-MM-DD" para "DD/MM/YYYY"
      const [y, m, d] = simulado.data.split("-");
      const dateOnly = `${d}/${m}/${y}`;
      const mins = timeToMinutes(simulado.tempo);

      dailyTotals[dateOnly] = (dailyTotals[dateOnly] || 0) + mins;

      const dateInt = dateStrToInt(dateOnly);
      if (dateInt < minDateInt) minDateInt = dateInt;
      if (dateInt > maxHistoryInt) maxHistoryInt = dateInt;
    });

    if (history.length === 0 && simulados.length === 0) minDateInt = 0;

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
