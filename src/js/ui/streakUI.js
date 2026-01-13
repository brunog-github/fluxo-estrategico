import { pluralize } from "../utils/streak-utils.js";

export class StreakUI {
  constructor() {
    this.container = document.getElementById("streak-visual");
    this.countDisplay = document.getElementById("streak-count");

    // Adiciona suporte a scroll horizontal com mouse wheel e drag
    this.initScrollHandlers();
  }

  initScrollHandlers() {
    if (!this.container) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    // Suporte a drag horizontal (funciona em desktop e mobile)
    this.container.addEventListener("mousedown", (e) => {
      isDown = true;
      startX = e.pageX - this.container.offsetLeft;
      scrollLeft = this.container.scrollLeft;
      this.container.style.cursor = "grabbing";
    });

    this.container.addEventListener("mouseleave", () => {
      isDown = false;
      this.container.style.cursor = "grab";
    });

    this.container.addEventListener("mouseup", () => {
      isDown = false;
      this.container.style.cursor = "grab";
    });

    this.container.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - this.container.offsetLeft;
      const walk = (x - startX) * 1; // multiplicador de velocidade
      this.container.scrollLeft = scrollLeft - walk;
    });

    // Suporte a scroll com mouse wheel
    this.container.addEventListener("wheel", (e) => {
      if (this.container.scrollWidth > this.container.clientWidth) {
        e.preventDefault();
        this.container.scrollLeft += e.deltaY > 0 ? 50 : -50;
      }
    });
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
