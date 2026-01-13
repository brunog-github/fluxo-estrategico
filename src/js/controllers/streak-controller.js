import { StreakUI } from "../ui/streakUI.js";
import {
  parseDateStr,
  getMinutesStudiedOnDate,
} from "../utils/streak-utils.js";

export class StreakController {
  constructor(toast) {
    this.ui = new StreakUI();
    this.toast = toast;

    this.restDays = JSON.parse(localStorage.getItem("restDays")) || [];
  }

  // Salvar dias de descanso
  saveRestDays() {
    const checkboxes = document.querySelectorAll(".rest-day-check");

    const selected = [];
    checkboxes.forEach((cb) => {
      if (cb.checked) selected.push(parseInt(cb.value));
    });

    this.restDays = selected;
    localStorage.setItem("restDays", JSON.stringify(selected));

    this.toast.showToast("success", "Dias de descanso salvos!");
    this.render();
  }

  // Preencher UI ao abrir as configurações
  loadRestDaysUI() {
    this.ui.setRestCheckboxes(this.restDays);
  }

  // ----------------------------------------------------
  //   LÓGICA PRINCIPAL DO STREAK
  // ----------------------------------------------------
  calculateCurrentStreak(history) {
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
  render() {
    this.ui.clear();

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

    const streak = this.calculateCurrentStreak(history);
    const bestStreak = this.calculateBestStreak(history);

    this.ui.updateStreakDisplay(streak, bestStreak);

    const daysToShow = 18;

    for (let i = daysToShow - 1; i >= 0; i--) {
      const day = new Date(today);
      day.setDate(today.getDate() - i);
      day.setHours(0, 0, 0, 0);

      const minutes = getMinutesStudiedOnDate(day, history);
      const isRest = this.restDays.includes(day.getDay());
      const dateStr = day.toLocaleDateString("pt-BR").slice(0, 5);
      const isToday = i === 0;

      let label = dateStr.split("/")[0];
      let className = "";
      let tooltip = `${dateStr} - ${Math.round(minutes)} min`;

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
  calculateBestStreak(history) {
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
