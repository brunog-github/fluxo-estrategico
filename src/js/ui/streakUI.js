import { pluralize } from "../utils/streak-utils.js";

export class StreakUI {
  constructor() {
    this.container = document.getElementById("streak-visual");
    this.countDisplay = document.getElementById("streak-count");
  }

  clear() {
    if (this.container) this.container.innerHTML = "";
  }

  updateStreakDisplay(streak, best) {
    const el = document.getElementById("streak-count");
    if (!el) return;

    if (streak === 0) {
      el.innerHTML = "";
      return;
    }

    const streakText = pluralize(streak, "dia", "dias");
    const recordText = pluralize(best, "dia", "dias");

    const isRecord = best > streak;

    el.innerHTML = `
    <span class="streak-count-text"">${streakText} 🔥</span>
    ${
      isRecord
        ? `<span class="record">Seu recorde é de ${recordText}</span>`
        : `<span class="record record-equal">Novo recorde!</span>`
    }
  `;
  }

  addDot({ label, className, tooltip, isToday }) {
    const div = document.createElement("div");
    div.className = "streak-dot " + className;

    if (isToday && className !== "rest" && className !== "success") {
      div.style.backgroundColor = "transparent";
      div.style.color = "var(--text-color)";
      div.className = "streak-dot " + "today";
    }

    if (label === "-") {
      div.style.opacity = "0.3";
    }

    div.innerHTML = label;
    div.dataset.tooltip = tooltip;

    this.container.appendChild(div);
  }

  scrollToEnd() {
    setTimeout(() => {
      this.container.scrollLeft = this.container.scrollWidth;
    }, 0);
  }

  setRestCheckboxes(restDays) {
    const boxes = document.querySelectorAll(".rest-day-check");
    boxes.forEach((cb) => {
      cb.checked = restDays.includes(parseInt(cb.value));
    });
  }
}
