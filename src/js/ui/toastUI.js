export class ToastUI {
  constructor(containerId = "toast-container") {
    this.container = document.getElementById(containerId);
  }

  createToast(type, message) {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    toast.innerHTML = `
      <span>${message}</span>
      <button class="toast-close">×</button>
    `;

    this.container.appendChild(toast);
    return toast;
  }

  show(toast) {
    setTimeout(() => toast.classList.add("show"), 50);
  }

  hide(toast) {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }
}
