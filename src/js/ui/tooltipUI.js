export class TooltipUI {
  constructor() {
    this.el = document.createElement("div");
    this.el.className = "tooltip-floating";
    document.body.appendChild(this.el);
  }

  setContent(text, position) {
    this.el.innerText = text;
    this.el.classList.remove("tooltip-top", "tooltip-bottom");
    this.el.classList.add(
      position === "top" ? "tooltip-top" : "tooltip-bottom"
    );
  }

  show() {
    this.el.classList.add("show");
  }

  hide() {
    this.el.classList.remove("show");
  }

  updatePosition(target) {
    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;

    const isMobile = window.innerWidth <= 768;
    let left = centerX;
    let arrowX = "50%";

    if (isMobile) {
      const tooltipWidth = this.el.offsetWidth;
      const padding = 8;

      const minLeft = tooltipWidth / 2 + padding;
      const maxLeft = window.innerWidth - tooltipWidth / 2 - padding;

      if (left < minLeft) {
        arrowX = ((centerX - minLeft) / tooltipWidth) * 100 + 50 + "%";
        left = minLeft;
      } else if (left > maxLeft) {
        arrowX = ((centerX - maxLeft) / tooltipWidth) * 100 + 50 + "%";
        left = maxLeft;
      }
    }

    this.el.style.left = left + "px";
    this.el.style.setProperty("--arrow-x", arrowX);

    const position = target.dataset.tooltipPosition || "bottom";
    this.el.style.top =
      position === "top"
        ? rect.top - this.el.offsetHeight - 10 + "px"
        : rect.bottom + 10 + "px";
  }
}
