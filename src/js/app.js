// --- LÓGICA PRINCIPAL E CONFIGURAÇÃO ---

// Navegação
function switchScreen(screenId) {
  let screens = [
    "screen-home",
    "screen-timer",
    "screen-finish",
    "screen-config",
    "screen-reports",
    "screen-achievements",
  ];
  screens.forEach((id) => {
    let el = document.getElementById(id);
    if (el) {
      if (id === screenId) el.classList.remove("hidden");
      else el.classList.add("hidden");
    }
  });
}

function goHome() {
  renderHome();
  switchScreen("screen-home");
}

function renderHome() {
  if (subjects.length === 0) {
    document.getElementById("home-subject-name").innerText = "Nenhuma matéria";
    document.getElementById("home-next-subject").innerText =
      "Configure o ciclo";
    currentIndex = 0;
    localStorage.setItem("currentIndex", currentIndex);

    return;
  }

  // Garante que o índice não estoure se removeu matérias
  if (currentIndex >= subjects.length) currentIndex = 0;

  let currentSubject = subjects[currentIndex];
  // Lógica circular: Se for o último, o próximo é o índice 0
  let nextIndex = (currentIndex + 1) % subjects.length;
  let nextSubject = subjects[nextIndex];

  document.getElementById("home-subject-name").innerText = currentSubject;
  document.getElementById("home-next-subject").innerText =
    "Depois: " + nextSubject;

  switchScreen("screen-home");
  renderStreak();
}

// Configuração de Matérias
function showConfig() {
  renderConfigList();
  loadRestDaysUI();
  switchScreen("screen-config");
}

function renderConfigList() {
  let list = document.getElementById("config-list");
  list.innerHTML = "";

  subjects.forEach((subj, index) => {
    let li = document.createElement("li");
    li.setAttribute("data-name", subj);

    li.innerHTML = `
    <div style="display:flex; align-items:center;">
    <span class="drag-handle">::</span>
    <span>${index + 1}. ${subj}</span>
    </div>
                    <button style="background:red; color:white; border:none; border-radius:5px; cursor:pointer;" onclick="removeSubject(${index})"><i class="fa fa-trash-o"></i></button>
                `;
    list.appendChild(li);
  });

  //Chama a função que ativa o arrastar (definida abaixo)
  initSortable();
}

function addSubject() {
  let input = document.getElementById("new-subject-input");
  let val = input.value.trim();

  if (val) {
    subjects.push(val);
    localStorage.setItem("studyCycle", JSON.stringify(subjects));
    input.value = "";
    renderConfigList();
  }
}

function removeSubject(index) {
  subjects.splice(index, 1);
  localStorage.setItem("studyCycle", JSON.stringify(subjects));
  renderConfigList();
  showToast("success", "Matéria removida com sucesso!");
}

// Ordenação (SortableJS)
function initSortable() {
  let el = document.getElementById("config-list");

  // Se já existe, não recria, apenas atualiza
  if (sortableInstance) return;

  sortableInstance = new Sortable(el, {
    handle: ".drag-handle", // só arrasta se puxar pelo icone
    animation: 150,
    onEnd: function (evt) {
      updateOrder(); // quando solta o item ativa essa função
    },
  });
}

function updateOrder() {
  let listItems = document.querySelectorAll("#config-list li");

  let newSubjects = [];

  listItems.forEach((li) => {
    let name = li.getAttribute("data-name");
    newSubjects.push(name);
  });

  // 2 - Atualiza o array global
  subjects = newSubjects;

  // 3 - Salva no localstorage
  localStorage.setItem("studyCycle", JSON.stringify(subjects));

  // 4 - Re-renderiza a lista (para atualizar a ordem)
  renderConfigList();
}

// Salvar Ciclo e Avançar
function saveAndAdvance() {
  let questionsInput =
    parseInt(document.getElementById("input-questions").value) || 0;
  let correctQuestionsInput =
    parseInt(document.getElementById("input-correct").value) || 0;

  if (correctQuestionsInput > questionsInput) {
    showToast(
      "error",
      "Erro: O número de acertos não pode ser maior que o total de questões!"
    );
    return;
  }

  // 1. Capturar dados atuais
  let dateNow = new Date();
  // Formata data: 22/12/2025
  let dateString = dateNow.toLocaleDateString("pt-BR");
  // Formata hora: 14:30
  let timeString = dateNow.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  let entry = {
    id: Date.now(), // ID único baseado em timestamp
    date: dateString + " às " + timeString,
    subject: subjects[currentIndex],
    duration: document.getElementById("timer-count").innerText,
    questions: document.getElementById("input-questions").value || "0",
    correct: document.getElementById("input-correct").value || "0",
  };

  // 2. Salvar no LocalStorage (Histórico)
  // Pega o histórico existente ou cria array vazio
  let history = JSON.parse(localStorage.getItem("studyHistory")) || [];
  // Adiciona o novo registro no INÍCIO do array (unshift)
  history.unshift(entry);
  // Salva de volta
  localStorage.setItem("studyHistory", JSON.stringify(history));

  checkAndUnlockAchievements();

  // 3. Lógica original de avançar o ciclo
  currentIndex++;
  if (currentIndex >= subjects.length) {
    currentIndex = 0;
  }
  localStorage.setItem("currentIndex", currentIndex);

  showToast("success", "Dados salvos no histórico!");
  renderHome();
}

function showAchievements() {
  renderAchievementsList(); // Gera a lista atualizada
  switchScreen("screen-achievements");
}

function init() {
  // Verifica se estava estudando antes de atualizar a página
  let savedState = localStorage.getItem("appState");
  initTheme();

  if (savedState === "timer") {
    seconds = parseInt(localStorage.getItem("currentTimerSeconds") || 0);
    startStudy(true);
    initGlobalTooltip();
  } else {
    renderHome();
    checkAndUnlockAchievements();
    initGlobalTooltip();
  }
}

// Inicia tudo ao carregar a página
window.onload = init;
