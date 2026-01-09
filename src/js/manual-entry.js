// --- LÓGICA DE REGISTRO MANUAL ---

// 1. Abrir Modal
function openManualEntryModal() {
  const modal = document.getElementById("modal-manual-entry");
  const selectSubject = document.getElementById("manual-subject");
  const dateInput = document.getElementById("manual-date");

  // Preenche a lista de matérias
  selectSubject.innerHTML = '<option value="">Selecione...</option>';
  const subjects = JSON.parse(localStorage.getItem("studyCycle")) || [];

  subjects.forEach((sub) => {
    const option = document.createElement("option");
    option.value = sub;
    option.innerText = sub;
    selectSubject.appendChild(option);
  });

  setDateOption("today");

  // Define data de hoje como padrão
  const today = new Date().toISOString().split("T")[0];
  dateInput.setAttribute("max", today);

  // Reseta os outros campos
  document.getElementById("manual-time").value = "";
  document.getElementById("manual-questions").value = "";
  document.getElementById("manual-correct").value = "";

  modal.classList.remove("hidden");
}

// 2. Fechar Modal
function closeManualEntryModal() {
  document.getElementById("modal-manual-entry").classList.add("hidden");
}

// 3. Salvar Registro
function saveManualEntry() {
  // A. Captura os valores
  const subject = document.getElementById("manual-subject").value;
  const dateInput = document.getElementById("manual-date").value; // YYYY-MM-DD
  const timeInput = document.getElementById("manual-time").value; // Ex: "01:05:38"
  const questions = document.getElementById("manual-questions").value;
  const correct = document.getElementById("manual-correct").value;

  // B. Validação Básica
  if (
    !subject ||
    !dateInput ||
    timeInput.length < 8 ||
    timeInput === "00:00:00"
  ) {
    // Se tiver função de toast, use: showToast("error", "Preencha matéria, data e tempo!");
    showToast(
      "info",
      "Por favor, preencha a matéria, data e o tempo completo (00:00:00)"
    );
    return;
  }

  if (questions && correct && Number(correct) > Number(questions)) {
    showToast(
      "error",
      "O número de acertos não pode ser maior que o total de questões!"
    );
    return;
  }

  // C. Formatação de Dados (Para ficar igual ao Timer)

  // Formata Data: YYYY-MM-DD -> DD/MM/YYYY
  const [year, month, day] = dateInput.split("-");
  const formattedDate = `${day}/${month}/${year}`; // Formato BR

  // D. Cria o Objeto de Estudo
  const newEntry = {
    id: Date.now(),
    date: formattedDate + " às 00:00", // "às 00:00" é filler para manter padrão
    subject: subject,
    duration: timeInput,
    questions: questions ? questions : "0",
    correct: correct ? correct : "0",
  };

  // E. Salva no LocalStorage
  const history = JSON.parse(localStorage.getItem("studyHistory")) || [];
  history.push(newEntry); // Adiciona ao final

  localStorage.setItem("studyHistory", JSON.stringify(history));

  // F. Atualiza a Interface (Chama as funções que já existem)

  // 1. Atualiza Tabela
  renderHistoryTable();

  // 2. Atualiza Gráficos
  updateCharts();

  // 3. Atualiza Life-Time-Stats (Card de topo)
  updateLifetimeStats();

  // 4. Sucesso e Fechar
  // showToast("success", "Estudo registrado com sucesso!");
  showToast("success", "Estudo registrado com sucesso!");
  closeManualEntryModal();
}

function maskTime(input) {
  let value = input.value.replace(/\D/g, ""); // Remove tudo que não é número

  if (value.length > 6) value = value.slice(0, 6); // Limita a 6 dígitos

  // Lógica de correção para Minutos e Segundos
  if (value.length >= 4) {
    let mins = parseInt(value.substring(2, 4));
    if (mins > 59) {
      // Se digitar > 59, substitui por 59 e mantém o restante
      value = value.substring(0, 2) + "59" + value.substring(4);
    }
  }
  if (value.length >= 6) {
    let secs = parseInt(value.substring(4, 6));
    if (secs > 59) {
      value = value.substring(0, 4) + "59";
    }
  }

  // Aplica a formatação 00:00:00
  if (value.length >= 5) {
    value = value.replace(/^(\d{2})(\d{2})(\d{2}).*/, "$1:$2:$3");
  } else if (value.length >= 3) {
    value = value.replace(/^(\d{2})(\d{2}).*/, "$1:$2");
  }

  input.value = value;
}

function setDateOption(option) {
  const input = document.getElementById("manual-date");
  const chipToday = document.getElementById("chip-today");
  const chipYesterday = document.getElementById("chip-yesterday");
  const chipOther = document.getElementById("chip-other");

  // Remove seleção de todos
  [chipToday, chipYesterday, chipOther].forEach((btn) =>
    btn.classList.remove("selected")
  );

  // Pega data atual no fuso horário LOCAL (evita bugs de fuso)
  const now = new Date();
  const toLocalISO = (date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().split("T")[0];
  };

  if (option === "today") {
    chipToday.classList.add("selected");
    input.style.display = "none"; // Esconde o input
    input.value = toLocalISO(now); // Seta HOJE
  } else if (option === "yesterday") {
    chipYesterday.classList.add("selected");
    input.style.display = "none"; // Esconde o input

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    input.value = toLocalISO(yesterday); // Seta ONTEM
  } else if (option === "other") {
    chipOther.classList.add("selected");
    input.style.display = "block"; // Mostra o input

    // Foca no input para o usuário já digitar/escolher
    input.focus();

    // Se o input estiver vazio ou com data futura (bloqueada), reseta para hoje
    if (!input.value) {
      input.value = toLocalISO(now);
    }
  }
}

// Adicione isso junto com suas funções de fechar modal
window.addEventListener("click", function (event) {
  const modal = document.getElementById("modal-manual-entry");
  // Se o clique foi no fundo (modal) e não dentro do container
  if (event.target === modal) {
    closeManualEntryModal();
  }
});
