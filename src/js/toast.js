function showToast(type = "info", message, duration = 3500) {
  const container = document.getElementById("toast-container");

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  toast.innerHTML = `
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
      `;

  container.appendChild(toast);

  // Mostra com animação
  setTimeout(() => toast.classList.add("show"), 100);

  // Remove automaticamente
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400); // tempo da animação de saída
  }, duration);
}

function confirmAction(
  message,
  onConfirm,
  title = "Confirmação",
  confirmText = "Confirmar",
  cancelText = "Cancelar"
) {
  const container = document.getElementById("toast-container");

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

  // Eventos dos botões
  const btnCancel = toast.querySelector(".btn-cancel");
  const btnConfirm = toast.querySelector(".btn-confirm");

  btnCancel.onclick = () => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  };

  btnConfirm.onclick = () => {
    onConfirm();
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  };

  container.appendChild(toast);

  // Animação de entrada
  setTimeout(() => toast.classList.add("show"), 50);
}
