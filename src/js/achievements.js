// --- SISTEMA DE CONQUISTAS (GAMIFICATION) ---

// 2. Função Principal de Verificação (Chamar ao Salvar e ao Carregar)
function checkAndUnlockAchievements() {
  const history = JSON.parse(localStorage.getItem("studyHistory")) || [];
  let unlocked = JSON.parse(localStorage.getItem("unlockedAchievements")) || [];
  let newUnlock = false;

  ACHIEVEMENTS.forEach((ach) => {
    // Se ainda não desbloqueou E a condição foi atingida
    if (!unlocked.includes(ach.id) && ach.check(history)) {
      unlocked.push(ach.id);
      showAchievementToast(ach); // Mostra o popup
      newUnlock = true;
    }
  });

  if (newUnlock) {
    localStorage.setItem("unlockedAchievements", JSON.stringify(unlocked));
    renderAchievementsList(); // Atualiza a tela se estiver aberta
  }
}

// 3. Renderiza a Tela de Conquistas
function renderAchievementsList() {
  const list = document.getElementById("achievements-grid");
  const filterSelect = document.getElementById("ach-filter");
  const counterDisplay = document.getElementById("ach-counter");

  // Proteção caso os elementos ainda não existam
  if (!list || !filterSelect) return;

  list.innerHTML = "";

  // 1. Pega os dados básicos
  const filterValue = filterSelect.value; // 'all', 'unlocked' ou 'locked'
  const unlockedIds =
    JSON.parse(localStorage.getItem("unlockedAchievements")) || [];

  // 2. Prepara os dados (Adiciona flag 'isUnlocked' para facilitar)
  let processedList = ACHIEVEMENTS.map((ach) => {
    return {
      ...ach, // Copia todas as propriedades (inclusive o ícone SVG inline)
      isUnlocked: unlockedIds.includes(ach.id),
    };
  });

  // 3. Atualiza o Contador (Total de desbloqueadas / Total geral)
  const totalUnlocked = processedList.filter((a) => a.isUnlocked).length;
  const totalGeneral = processedList.length;

  if (counterDisplay) {
    counterDisplay.innerText = `${totalUnlocked} / ${totalGeneral}`;
    // Opcional: Mudar cor se completou tudo
    counterDisplay.style.color =
      totalUnlocked === totalGeneral ? "#2ecc71" : "var(--text-color)";
    counterDisplay.style.borderColor =
      totalUnlocked === totalGeneral ? "#2ecc71" : "var(--border-color)";
  }

  // 4. Aplica o Filtro Selecionado
  if (filterValue === "unlocked") {
    processedList = processedList.filter((a) => a.isUnlocked);
  } else if (filterValue === "locked") {
    processedList = processedList.filter((a) => !a.isUnlocked);
  }

  // 5. Ordenação (Apenas se estiver vendo "Todas")
  // Se estiver em 'all', joga as desbloqueadas para o topo da lista
  if (filterValue === "all") {
    processedList.sort((a, b) => {
      // Retorna -1 se 'a' é desbloqueado e 'b' não (a vem primeiro)
      // Retorna 1 se 'b' é desbloqueado e 'a' não (b vem primeiro)
      // Retorna 0 se ambos forem iguais
      return b.isUnlocked === a.isUnlocked ? 0 : a.isUnlocked ? -1 : 1;
    });
  }

  // 6. Renderiza no HTML
  if (processedList.length === 0) {
    list.innerHTML = `<p style="text-align:center; opacity:0.5; margin-top:20px;">Nenhuma conquista encontrada neste filtro.</p>`;
    return;
  }

  processedList.forEach((ach) => {
    const card = document.createElement("div");
    card.className = `ach-card ${ach.isUnlocked ? "unlocked" : "locked"}`;

    card.innerHTML = `
            <div class="ach-icon">
                ${ach.icon}
            </div>
            <div class="ach-info">
                <h4>${ach.title}</h4>
                <p>${ach.desc}</p>
            </div>
            ${ach.isUnlocked ? '<div class="ach-date">Desbloqueado</div>' : ""}
        `;

    list.appendChild(card);
  });
}

// 4. Toast Notification (Estilo Steam Popup - ATUALIZADA PARA STACKING)
function showAchievementToast(ach) {
  // 1. Garante que o container mestre existe
  let container = document.getElementById("arc-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "arc-container";
    document.body.appendChild(container);
  }

  // 2. Cria um NOVO elemento toast para esta conquista
  const toast = document.createElement("div");
  toast.className = "ach-toast-item";

  toast.innerHTML = `
        <div class="ach-toast-icon">${ach.icon}</div>
        <div class="ach-toast-content">
            <span>Conquista Desbloqueada!</span>
            <strong>${ach.title}</strong>
        </div>
    `;

  // 3. Adiciona ao container (ele vai se empilhar automaticamente via CSS)
  container.appendChild(toast);

  const audio = new Audio("./src/assets/media/unlock-achievement.mp3");
  audio.play().catch(() => {});

  // 4. Animação de entrada
  // Usamos setTimeout(10) para forçar o navegador a reconhecer o estado inicial antes da transição
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  // 5. Remove o elemento após 4 segundos
  setTimeout(() => {
    // Inicia a animação de saída
    toast.classList.remove("show");

    // Remove o elemento do DOM após a animação de saída terminar (500ms do CSS)
    setTimeout(() => {
      // Verifica se o container ainda existe antes de tentar remover o filho
      if (container && container.contains(toast)) {
        container.removeChild(toast);
      }
    }, 500);
  }, 4000); // 4 segundos visível
}
