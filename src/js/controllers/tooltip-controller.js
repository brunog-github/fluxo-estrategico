import { TooltipUI } from "../ui/tooltipUI.js";

class TooltipController {
  constructor() {
    this.ui = new TooltipUI();
    this.activeTarget = null;

    this.bindEvents();
  }

  show(target) {
    const text = target.dataset.tooltip;
    const position = target.dataset.tooltipPosition || "bottom";

    this.ui.setContent(text, position);
    this.ui.show();

    requestAnimationFrame(() => this.ui.updatePosition(target));
  }

  hide() {
    this.ui.hide();
    this.activeTarget = null;
  }

  bindEvents() {
    document.addEventListener("mouseover", (e) => {
      if (window.innerWidth <= 768) return;
      const target = e.target.closest("[data-tooltip]");
      if (!target) return;

      this.activeTarget = target;
      this.show(target);
    });

    document.addEventListener("mouseout", (e) => {
      if (window.innerWidth <= 768) return;
      if (e.target.closest("[data-tooltip]")) this.hide();
    });

    document.addEventListener("click", (e) => {
      const target = e.target.closest("[data-tooltip]");

      if (!target) return this.hide();

      const isMobile = window.innerWidth <= 768;

      if (
        isMobile &&
        this.activeTarget === target &&
        this.ui.el.classList.contains("show")
      ) {
        this.hide();
        return;
      }

      this.activeTarget = target;
      this.show(target);
    });

    window.addEventListener("scroll", () => this.hide());
  }
}

export function initGlobalTooltip() {
  return new TooltipController();
}
