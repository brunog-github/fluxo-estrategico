let activeTooltipTarget = null;

function initGlobalTooltip() {
  const tooltipEl = document.createElement("div");
  tooltipEl.className = "tooltip-floating";
  document.body.appendChild(tooltipEl);

  function positionTooltip(target) {
    const rect = target.getBoundingClientRect();
    const position = target.dataset.tooltipPosition || "bottom";

    const centerX = rect.left + rect.width / 2;
    let leftMobile = centerX;
    let arrowX = "50%"; // Posição padrão da seta

    // ✅ CORREÇÃO APENAS PARA MOBILE (evita overflow)
    if (window.innerWidth <= 768) {
      const tooltipWidth = tooltipEl.offsetWidth;
      const padding = 8;

      const minLeft = tooltipWidth / 2 + padding;
      const maxLeft = window.innerWidth - tooltipWidth / 2 - padding;

      if (leftMobile < minLeft) {
        arrowX = ((centerX - minLeft) / tooltipWidth) * 100 + 50 + "%";
        leftMobile = minLeft;
      }
      if (leftMobile > maxLeft) {
        arrowX = ((centerX - maxLeft) / tooltipWidth) * 100 + 50 + "%";
        leftMobile = maxLeft;
      }
    }

    tooltipEl.style.left = leftMobile + "px";
    tooltipEl.style.setProperty("--arrow-x", arrowX);

    if (position === "top") {
      tooltipEl.style.top = rect.top - tooltipEl.offsetHeight - 10 + "px";
    } else {
      // bottom (padrão)
      tooltipEl.style.top = rect.bottom + 10 + "px";
    }
  }

  function showTooltip(target) {
    const position = target.dataset.tooltipPosition || "bottom";

    tooltipEl.innerText = target.dataset.tooltip;

    tooltipEl.classList.remove("tooltip-top", "tooltip-bottom");
    tooltipEl.classList.add(
      position === "top" ? "tooltip-top" : "tooltip-bottom"
    );

    tooltipEl.classList.add("show");

    requestAnimationFrame(() => {
      positionTooltip(target);
    });
  }

  function hideTooltip() {
    tooltipEl.classList.remove("show");
  }

  // Desktop - hover
  document.addEventListener("mouseover", (e) => {
    if (window.innerWidth <= 768) return;

    const target = e.target.closest("[data-tooltip]");
    if (!target) return;

    activeTooltipTarget = target;
    showTooltip(target);
  });

  document.addEventListener("mouseout", (e) => {
    if (window.innerWidth <= 768) return;

    if (e.target.closest("[data-tooltip]")) {
      hideTooltip();
      activeTooltipTarget = null;
    }
  });

  // Mobile + Desktop - click
  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-tooltip]");

    // Clicou fora → fecha
    if (!target) {
      hideTooltip();
      activeTooltipTarget = null;
      return;
    }

    // Mobile: toggle no mesmo elemento
    if (window.innerWidth <= 768) {
      if (
        tooltipEl.classList.contains("show") &&
        activeTooltipTarget === target
      ) {
        tooltipEl.classList.remove("show");
        activeTooltipTarget = null;
        return;
      }
    }

    // Abre tooltip
    activeTooltipTarget = target;
    showTooltip(target);
  });

  // Reposiciona se rolar a tela
  window.addEventListener("scroll", hideTooltip);
}
