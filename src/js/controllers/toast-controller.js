import { ToastUI } from "../ui/toastUI.js";

export class ToastController {
  constructor() {
    this.ui = new ToastUI();
  }

  showToast(type = "info", message, duration = 3500) {
    const toast = this.ui.createToast(type, message);

    // Fechar ao clicar no X
    const btnClose = toast.querySelector(".toast-close");
    btnClose.addEventListener("click", () => this.ui.hide(toast));

    // Swipe no mobile
    this.addSwipeBehavior(toast);

    // Mostrar toast
    this.ui.show(toast);

    // Remover automaticamente
    setTimeout(() => this.ui.hide(toast), duration);
  }

  addSwipeBehavior(toast) {
    let startX = 0;
    let currentX = 0;
    let dragging = false;

    toast.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX;
      dragging = true;
      toast.style.transition = "none";
    });

    toast.addEventListener("touchmove", (e) => {
      if (!dragging) return;
      currentX = e.touches[0].clientX;
      const diff = currentX - startX;
      toast.style.transform = `translateX(${diff}px)`;
    });

    toast.addEventListener("touchend", () => {
      if (!dragging) return;
      dragging = false;
      toast.style.transition = "";

      const diff = currentX - startX;

      if (Math.abs(diff) > 100) {
        this.ui.hide(toast);
      } else {
        toast.style.transform = "";
      }
    });
  }
}
