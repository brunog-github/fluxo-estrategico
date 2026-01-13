export class ConfirmUI {
  constructor(containerId = "toast-confirm-container") {
    this.container = document.getElementById(containerId);
  }

  createConfirm(title, message, confirmText, cancelText) {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";

    const toast = document.createElement("div");
    toast.className = "confirm-toast";

    toast.innerHTML = `
      <h3>${title}</h3>
      <p>${message}</p>
      <div class="confirm-buttons">
        <button class="btn btn-cancel">${cancelText}</button>
        <button class="btn btn-confirm">${confirmText}</button>
      </div>
    `;

    this.container.appendChild(overlay);
    this.container.appendChild(toast);

    return { overlay, toast };
  }

  show(overlay, toast) {
    setTimeout(() => {
      overlay.classList.add("show");
      toast.classList.add("show");
    }, 20);
  }

  hide(overlay, toast) {
    overlay.classList.remove("show");
    toast.classList.remove("show");

    setTimeout(() => {
      overlay.remove();
      toast.remove();
    }, 300);
  }
}
