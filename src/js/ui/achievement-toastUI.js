export class AchievementToastUI {
  constructor() {
    this.container = document.getElementById("arc-container");

    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = "arc-container";
      document.body.appendChild(this.container);
    }
  }

  showToast(ach) {
    const toast = document.createElement("div");
    toast.className = "ach-toast-item";

    toast.innerHTML = `
      <div class="ach-toast-icon">${ach.icon}</div>
      <div class="ach-toast-content">
        <span>Conquista Desbloqueada!</span>
        <strong>${ach.title}</strong>
      </div>
    `;

    this.container.appendChild(toast);

    // Áudio
    const audio = new Audio("src/assets/media/unlock-achievement.mp3");
    audio.play().catch(() => {});

    setTimeout(() => toast.classList.add("show"), 10);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        if (this.container.contains(toast)) {
          toast.remove();
        }
      }, 500);
    }, 4000);
  }
}
