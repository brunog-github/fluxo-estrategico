function showToast(type = "info", message, duration = 3500) {
  const container = document.getElementById("toast-container");

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  toast.innerHTML = `
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
      `;

  container.appendChild(toast);

  // Adiciona funcionalidade de swipe para fechar no mobile
  let startX = 0;
  let currentX = 0;
  let isDragging = false;

  toast.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    isDragging = true;
    toast.style.transition = "none"; // Remove transição durante o drag para suavidade
  });

  toast.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    toast.style.transform = `translateX(${diff}px)`;
  });

  toast.addEventListener("touchend", (e) => {
    if (!isDragging) return;
    isDragging = false;
    const diff = currentX - startX;
    toast.style.transition = ""; // Restaura transição
    if (Math.abs(diff) > 100) {
      // Threshold para fechar
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 400);
    } else {
      toast.style.transform = ""; // Volta à posição original
    }
  });

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
  const container = document.getElementById("toast-confirm-container");

  // Cria overlay
  const overlay = document.createElement("div");
  overlay.className = "confirm-overlay";
  container.appendChild(overlay);

  // Cria o toast modal
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

  container.appendChild(toast);

  // Botões
  const btnCancel = toast.querySelector(".btn-cancel");
  const btnConfirm = toast.querySelector(".btn-confirm");

  const closeModal = () => {
    toast.classList.remove("show");
    overlay.classList.remove("show");
    setTimeout(() => {
      toast.remove();
      overlay.remove();
    }, 300);
  };

  btnCancel.onclick = closeModal;
  overlay.onclick = closeModal; // Clique fora também fecha

  btnConfirm.onclick = () => {
    onConfirm();
    closeModal();
  };

  // Animações
  setTimeout(() => {
    overlay.classList.add("show");
    toast.classList.add("show");
  }, 20);
}
