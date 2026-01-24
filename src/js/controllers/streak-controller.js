import { StreakUI } from "../ui/streakUI.js";
import { dbService } from "../services/db/db-service.js";
import {
  parseDateStr,
  getMinutesStudiedOnDate,
} from "../utils/streak-utils.js";
import { formatMinutesToHm, timeToMinutes } from "../utils/utils.js";

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
    if (!history.length) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Criar mapa de dias estudados para acesso rápido
    const dailyMinutes = {};
    history.forEach((item) => {
      const dateObj = parseDateStr(item.date);
      dateObj.setHours(0, 0, 0, 0);
      const dayKeyStr = dateObj.toISOString().split("T")[0]; // "YYYY-MM-DD"

      const minutes = timeToMinutes(item.duration);
      dailyMinutes[dayKeyStr] = (dailyMinutes[dayKeyStr] || 0) + minutes;
    });

    // Obter data mais antiga
    const dayKeys = Object.keys(dailyMinutes).sort();
    const firstDay = new Date(dayKeys[0] + "T00:00:00");

    let streak = 0;
    // Começar de HOJE e iterar para trás
    let currentDay = new Date(today);

    // Iterar de hoje para trás
    while (currentDay >= firstDay) {
      const dayKeyStr = currentDay.toISOString().split("T")[0];
      const studyMinutes = dailyMinutes[dayKeyStr] || 0;
      const isRest = this.restDays.includes(currentDay.getDay());
      const isToday = dayKeyStr === today.toISOString().split("T")[0];

      if (studyMinutes >= 20) {
        // Estudou o mínimo necessário
        streak++;
      } else if (isRest) {
        // Dia de descanso sem estudo não quebra o streak
        // Continua verificando dias anteriores
      } else if (isToday) {
        // Se é TODAY e não tem 20 min, NÃO quebra
        // Apenas não incrementa streak, mas continua verificando dias anteriores
      } else {
        // Não estudou em dia PASSADO e não é dia de descanso: quebra o streak
        break;
      }

      // Dia anterior
      currentDay.setDate(currentDay.getDate() - 1);
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
  // Lógica:
  // 1. Agrupa estudo por dia (soma múltiplos estudos do mesmo dia)
  // 2. Se dia >= 20 min: +1 streak
  // 3. Se dia de descanso: não quebra (continua)
  // 4. Se não estudou (< 20 min e não é rest day): reseta para 0
  // ----------------------------------------------------
  async calculateBestStreak(history) {
    if (!history.length) return 0;

    // 1. Criar mapa: data (string "YYYY-MM-DD") => minutos totais do dia
    const dailyMinutes = {};

    history.forEach((item) => {
      const dateObj = parseDateStr(item.date);
      dateObj.setHours(0, 0, 0, 0);
      const dayKeyStr = dateObj.toISOString().split("T")[0]; // "YYYY-MM-DD"

      // Converter "HH:MM:SS" para minutos
      const minutes = timeToMinutes(item.duration);
      dailyMinutes[dayKeyStr] = (dailyMinutes[dayKeyStr] || 0) + minutes;
    });

    // 2. Obter range de datas (primeiro e último dia com histórico)
    const dayKeys = Object.keys(dailyMinutes).sort();

    if (dayKeys.length === 0) return 0;

    const firstDay = new Date(dayKeys[0] + "T00:00:00");
    const lastDay = new Date(dayKeys[dayKeys.length - 1] + "T00:00:00");

    // 3. Percorrer cada dia do range e calcular streaks
    let bestStreak = 0;
    let currentStreak = 0;
    let currentDay = new Date(firstDay);
    let studiedDaysCount = 0;

    while (currentDay <= lastDay) {
      const dayKeyStr = currentDay.toISOString().split("T")[0];
      const studyMinutes = dailyMinutes[dayKeyStr] || 0;
      const dayOfWeek = currentDay.getDay(); // 0=domingo, 1=segunda, ..., 6=sábado
      const isRestDay = this.restDays.includes(dayOfWeek);

      if (studyMinutes >= 20) {
        // Estudou o mínimo necessário
        studiedDaysCount++;
        currentStreak++;
        if (currentStreak > bestStreak) {
          bestStreak = currentStreak;
        }
      } else if (isRestDay) {
        // Dia de descanso: não quebra o streak
        // Continua sem incrementar
      } else {
        // Não estudou e não é dia de descanso: quebra o streak
        currentStreak = 0;
      }

      // Próximo dia
      currentDay.setDate(currentDay.getDate() + 1);
    }

    return bestStreak;
  }
}
