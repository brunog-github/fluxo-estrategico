export class AchievementsUI {
  constructor() {
    this.list = document.getElementById("achievements-grid");
    this.filterSelect = document.getElementById("ach-filter");
    this.counterDisplay = document.getElementById("ach-counter");
  }

  getFilter() {
    return this.filterSelect?.value ?? "all";
  }

  updateCounter(unlocked, total) {
    if (!this.counterDisplay) return;

    this.counterDisplay.innerText = `${unlocked} / ${total}`;
    const completed = unlocked === total;

    this.counterDisplay.style.color = completed
      ? "#2ecc71"
      : "var(--text-color)";
    this.counterDisplay.style.borderColor = completed
      ? "#2ecc71"
      : "var(--border-color)";
  }

  renderList(
    processedList,
    emptyMsg = "Nenhuma conquista encontrada neste filtro."
  ) {
    if (!this.list) return;

    this.list.innerHTML = "";

    if (processedList.length === 0) {
      this.list.innerHTML = `<p style="text-align:center; opacity:0.5; margin-top:20px;">${emptyMsg}</p>`;
      return;
    }

    processedList.forEach((ach) => {
      const card = document.createElement("div");
      card.className = `ach-card ${ach.isUnlocked ? "unlocked" : "locked"}`;

      card.innerHTML = `
        <div class="ach-icon">${ach.icon}</div>
        <div class="ach-info">
          <h4>${ach.title}</h4>
          <p>${ach.desc}</p>
        </div>
        ${ach.isUnlocked ? '<div class="ach-date">Desbloqueado</div>' : ""}
      `;

      this.list.appendChild(card);
    });
  }
}
