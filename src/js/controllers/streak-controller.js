import { StreakUI } from "../ui/streakUI.js";
import { dbService } from "../services/db/db-service.js";
import {
  parseDateStr,
  getMinutesStudiedOnDate,
} from "../utils/streak-utils.js";
import { formatMinutesToHm } from "../utils/utils.js";

export class StreakController {
  constructor(toast) {
    this.ui = new StreakUI();
    this.toast = toast;

    this.restDays = [];
  }

  async init() {
    this.restDays = (await dbService.getRestDays()) || [];
  }

  // Salvar dias de descanso
  async saveRestDays() {
    const checkboxes = document.querySelectorAll(".rest-day-check");

    const selected = [];
    checkboxes.forEach((cb) => {
      if (cb.checked) selected.push(parseInt(cb.value));
    });

    this.restDays = selected;
    await dbService.setRestDays(selected);

    this.toast.showToast("success", "Dias de descanso salvos!");
    await this.render();
  }

  // Preencher UI ao abrir as configurações
  async loadRestDaysUI() {
    const restDays = (await dbService.getRestDays()) || [];
    this.ui.setRestCheckboxes(restDays);
  }

  // ----------------------------------------------------
  //   LÓGICA PRINCIPAL DO STREAK
  // ----------------------------------------------------
  async calculateCurrentStreak(history) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Data inicial real no histórico
    let startDate = today;
    if (history.length > 0) {
      const timestamps = history.map((h) => parseDateStr(h.date).getTime());
      startDate = new Date(Math.min(...timestamps));
      startDate.setHours(0, 0, 0, 0);
    }

    let streak = 0;

    for (let i = 0; i < 365; i++) {
      const day = new Date(today);
      day.setDate(today.getDate() - i);
      day.setHours(0, 0, 0, 0);

      if (day < startDate && i > 0) break;

      const minutes = getMinutesStudiedOnDate(day, history);
      const isRest = this.restDays.includes(day.getDay());

      if (minutes >= 20) {
        streak++;
      } else if (isRest || i === 0) {
        continue;
      } else {
        break;
      }
    }

    return streak;
  }

  // ----------------------------------------------------
  //  RENDERIZAÇÃO COMPLETA
  // ----------------------------------------------------
  async render() {
    this.ui.clear();

    const history = await dbService.getHistory();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Descobrir data inicial real
    let startDate = new Date();
    if (history.length > 0) {
      const timestamps = history.map((h) => parseDateStr(h.date).getTime());
      startDate = new Date(Math.min(...timestamps));
    }
    startDate.setHours(0, 0, 0, 0);

    const streak = await this.calculateCurrentStreak(history);
    const bestStreak = await this.calculateBestStreak(history);

    this.ui.updateStreakDisplay(streak, bestStreak);

    // Contar dias únicos no histórico para determinar quantos dias renderizar
    const uniqueDays = new Set();
    history.forEach((item) => {
      const dateObj = parseDateStr(item.date);
      dateObj.setHours(0, 0, 0, 0);
      const dateKey = dateObj.getTime();
      uniqueDays.add(dateKey);
    });

    // Renderizar no mínimo 31 dias, ou todos os dias do histórico se for maior
    const daysToShow = Math.max(uniqueDays.size, 31);

    for (let i = daysToShow - 1; i >= 0; i--) {
      const day = new Date(today);
      day.setDate(today.getDate() - i);
      day.setHours(0, 0, 0, 0);

      const minutes = getMinutesStudiedOnDate(day, history);
      const isRest = this.restDays.includes(day.getDay());
      const dateStr = day.toLocaleDateString("pt-BR").slice(0, 5);
      const isToday = i === 0;

      let tooltip = "";
      let label = dateStr.split("/")[0];
      let className = "";

      if (minutes >= 60) {
        tooltip = `${dateStr} - ${formatMinutesToHm(minutes)}`;
      } else {
        tooltip = `${dateStr} - ${Math.round(minutes)} min`;
      }

      if (day < startDate) {
        className = "";
        label = "-";
        tooltip = `${dateStr} - Sem Dados`;
      } else if (minutes >= 20) {
        className = "success";
        label = "✓";
      } else if (isRest) {
        className = "rest";
        tooltip = `${dateStr} - Dia de descanso`;
        label = "😴";
      } else if (!isToday) {
        className = "fail";
        label = "✕";
        tooltip = `${dateStr} - Não estudou`;
      }

      this.ui.addDot({
        label,
        className,
        tooltip,
        isToday,
      });
    }

    this.ui.scrollToEnd();
  }
  // ----------------------------------------------------
  //  MAIOR STREAK DA VIDA (recorde)
  // ----------------------------------------------------
  async calculateBestStreak(history) {
    if (!history.length) return 0;

    // Transformar o histórico em mapa de minutos/dia
    const map = {};
    history.forEach((item) => {
      const dateObj = parseDateStr(item.date);
      dateObj.setHours(0, 0, 0, 0);
      const key = dateObj.getTime();

      map[key] = (map[key] || 0) + getMinutesStudiedOnDate(dateObj, history);
    });

    // Descobrir range total
    const timestamps = Object.keys(map).map(Number);
    const start = new Date(Math.min(...timestamps));
    const end = new Date(Math.max(...timestamps));

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    let best = 0;
    let current = 0;

    let d = new Date(start);

    while (d <= end) {
      const key = d.getTime();
      const minutes = map[key] || 0;
      const isRest = this.restDays.includes(d.getDay());

      if (minutes >= 20) {
        current++;
        if (current > best) best = current;
      } else if (isRest) {
        // rest day não quebra streak
      } else {
        current = 0;
      }

      d.setDate(d.getDate() + 1);
    }

    return best;
  }
}
