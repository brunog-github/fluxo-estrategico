import { pluralize } from "../utils/streak-utils.js";

export class StreakUI {
  constructor() {
    this.container = document.getElementById("streak-visual");
    this.countDisplay = document.getElementById("streak-count");

    // Virtual scrolling data
    this.dotsData = [];
    this.dotWidth = 32; // min-width do .streak-dot
    this.dotGap = 6; // gap do #streak-visual
    this.buffer = 5; // dots extras fora da área visível
    this.renderedRange = { start: -1, end: -1 };
    this.spacerLeft = null;
    this.spacerRight = null;
    this.dotsContainer = null;
    this.scrollRAF = null;

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

    // Virtual scroll: atualizar dots visíveis durante scroll
    this.container.addEventListener("scroll", () => {
      if (this.scrollRAF) return;
      this.scrollRAF = requestAnimationFrame(() => {
        this.renderVisibleDots();
        this.scrollRAF = null;
      });
    });
  }

  clear() {
    if (this.container) this.container.innerHTML = "";
    this.dotsData = [];
    this.renderedRange = { start: -1, end: -1 };
  }

  // Mostra placeholder de loading enquanto os dados carregam
  showLoading() {
    if (!this.container) return;

    this.container.innerHTML = "";

    // Cria dots placeholder animados
    const fragment = document.createDocumentFragment();
    const placeholderCount =
      Math.floor(this.container.clientWidth / (this.dotWidth + this.dotGap)) ||
      10;

    for (let i = 0; i < placeholderCount; i++) {
      const dot = document.createElement("div");
      dot.className = "streak-dot streak-dot-loading";
      dot.style.opacity = "0.3";
      dot.style.animation = `pulse 1.5s ease-in-out ${i * 0.1}s infinite`;
      fragment.appendChild(dot);
    }

    this.container.appendChild(fragment);
  }

  updateStreakDisplay(streak, best) {
    const el = document.getElementById("streak-count");
    if (!el) return;

    if (streak === 0 && best === 0) {
      el.innerHTML = "";
      return;
    }

    const streakText = pluralize(streak, "dia", "dias");
    const recordText = pluralize(best, "dia", "dias");

    const isRecord = best > streak;

    el.innerHTML = `
    ${streak > 0 ? `<span class="streak-count-text">${streakText} <span class="fire-animation"></span></span>` : ``} 
    ${
      isRecord
        ? `<span class="record">Seu recorde é de ${recordText}</span>`
        : `<span class="record record-equal">Novo recorde!</span>`
    }
  `;
  }

  // Define todos os dados dos dots de uma vez (para virtual scrolling)
  setDotsData(data) {
    this.dotsData = data;
    this.setupVirtualScroll();
  }

  setupVirtualScroll() {
    if (!this.container || this.dotsData.length === 0) return;

    // Limpa container
    this.container.innerHTML = "";

    // Calcula largura total
    const itemWidth = this.dotWidth + this.dotGap;
    const totalWidth = this.dotsData.length * itemWidth - this.dotGap;

    // Cria spacer esquerdo (para manter posição do scroll)
    this.spacerLeft = document.createElement("div");
    this.spacerLeft.className = "streak-spacer-left";
    this.spacerLeft.style.flexShrink = "0";
    this.spacerLeft.style.width = "0px";

    // Container dos dots visíveis
    this.dotsContainer = document.createElement("div");
    this.dotsContainer.className = "streak-dots-container";
    this.dotsContainer.style.display = "flex";
    this.dotsContainer.style.gap = `${this.dotGap}px`;
    this.dotsContainer.style.flexShrink = "0";

    // Cria spacer direito
    this.spacerRight = document.createElement("div");
    this.spacerRight.className = "streak-spacer-right";
    this.spacerRight.style.flexShrink = "0";
    this.spacerRight.style.width = `${totalWidth}px`;

    this.container.appendChild(this.spacerLeft);
    this.container.appendChild(this.dotsContainer);
    this.container.appendChild(this.spacerRight);

    // Reset range
    this.renderedRange = { start: -1, end: -1 };

    // Renderiza dots visíveis
    this.renderVisibleDots();
  }

  renderVisibleDots() {
    if (!this.container || !this.dotsContainer || this.dotsData.length === 0)
      return;

    const itemWidth = this.dotWidth + this.dotGap;
    const scrollLeft = this.container.scrollLeft;
    const viewportWidth = this.container.clientWidth;

    // Calcula índices visíveis
    let startIndex = Math.floor(scrollLeft / itemWidth) - this.buffer;
    let endIndex =
      Math.ceil((scrollLeft + viewportWidth) / itemWidth) + this.buffer;

    // Limita aos bounds
    startIndex = Math.max(0, startIndex);
    endIndex = Math.min(this.dotsData.length - 1, endIndex);

    // Se o range não mudou, não precisa re-renderizar
    if (
      startIndex === this.renderedRange.start &&
      endIndex === this.renderedRange.end
    ) {
      return;
    }

    // Atualiza spacers
    const leftSpacerWidth = startIndex * itemWidth;
    const rightSpacerWidth = Math.max(
      0,
      (this.dotsData.length - endIndex - 1) * itemWidth,
    );

    this.spacerLeft.style.width = `${leftSpacerWidth}px`;
    this.spacerRight.style.width = `${rightSpacerWidth}px`;

    // Limpa e renderiza dots
    this.dotsContainer.innerHTML = "";

    for (let i = startIndex; i <= endIndex; i++) {
      const dot = this.createDotElement(this.dotsData[i]);
      this.dotsContainer.appendChild(dot);
    }

    this.renderedRange = { start: startIndex, end: endIndex };
  }

  createDotElement({ label, className, tooltip, isToday }) {
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

    return div;
  }

  // Método legado para compatibilidade (não usado com virtual scroll)
  addDot({ label, className, tooltip, isToday }) {
    const div = this.createDotElement({ label, className, tooltip, isToday });
    this.container.appendChild(div);
  }

  scrollToEnd() {
    // Aguarda um frame para garantir que o layout foi calculado
    requestAnimationFrame(() => {
      this.container.scrollLeft = this.container.scrollWidth;
      // Renderiza dots após scroll
      this.renderVisibleDots();
    });
  }

  setRestCheckboxes(restDays) {
    const boxes = document.querySelectorAll(".rest-day-check");
    boxes.forEach((cb) => {
      cb.checked = restDays.includes(parseInt(cb.value));
    });
  }
}
