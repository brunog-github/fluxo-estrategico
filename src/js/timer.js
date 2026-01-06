// --- LÓGICA DO TIMER ---

function updateTimerDisplay() {
  let h = Math.floor(seconds / 3600);
  let m = Math.floor((seconds % 3600) / 60);
  let s = seconds % 60;

  // Formata para 00:00:00
  let text =
    (h < 10 ? "0" + h : h) +
    ":" +
    (m < 10 ? "0" + m : m) +
    ":" +
    (s < 10 ? "0" + s : s);

  document.getElementById("timer-count").innerText = text;
}

function timerTick() {
  if (!isPaused && startTime) {
    // A MÁGICA ACONTECE AQUI:
    // Em vez de seconds++, calculamos a diferença entre AGORA e o INÍCIO
    const now = Date.now();
    const diffInSeconds = Math.floor((now - startTime) / 1000);

    // O tempo total é: o que já tinha acumulado antes + a diferença atual
    seconds = accumulatedTime + diffInSeconds;

    updateTimerDisplay();
    localStorage.setItem("currentTimerSeconds", seconds);
  }
}

function startStudy(isResuming = false) {
  if (subjects.length === 0) {
    showToast("error", "Adicione matérias na configuração primeiro!");
    return;
  }

  // Configuração Inicial
  if (!isResuming) {
    seconds = 0;
    accumulatedTime = 0; // Zera o acumulado
    localStorage.setItem("currentTimerSeconds", 0);
  } else {
    // Se está resumindo (ex: refresh na página), pegamos o que já tinha
    accumulatedTime = seconds;
  }

  // Define o marco inicial do relógio AGORA
  startTime = Date.now();

  // Salva que o app está no modo TIMER
  localStorage.setItem("appState", "timer");

  let currentSubject = subjects[currentIndex];
  let nextIndex = (currentIndex + 1) % subjects.length;

  document.getElementById("timer-subject-name").innerText = currentSubject;
  document.getElementById("timer-next-subject-display").innerText =
    "Próxima matéria: " + subjects[nextIndex];

  switchScreen("screen-timer");

  // Reseta e inicia timer
  isPaused = false;
  updateTimerDisplay();

  clearInterval(timerInterval);
  timerInterval = setInterval(timerTick, 1000); // O intervalo chama o cálculo

  document.getElementById("btn-pause").innerText = "Pausar";
  document.getElementById("btn-pause").classList.remove("btn-outline");
}

function togglePause() {
  isPaused = !isPaused;
  let btn = document.getElementById("btn-pause");

  if (isPaused) {
    // --- AO PAUSAR ---
    btn.innerText = "Retomar";
    btn.classList.add("btn-outline");

    // Congela o tempo atual no 'accumulatedTime'
    // Se não fizermos isso, quando despausar ele vai pular o tempo que ficou pausado
    const now = Date.now();
    const diff = Math.floor((now - startTime) / 1000);
    accumulatedTime += diff;
    startTime = null; // Limpa o start time pois parou
  } else {
    // --- AO RETOMAR ---
    btn.innerText = "Pausar";
    btn.classList.remove("btn-outline");

    // Cria um novo marco de início agora
    startTime = Date.now();
    // (O accumulatedTime já guarda o valor antigo, então o timerTick vai somar corretamente)
  }
}

function finishSession() {
  clearInterval(timerInterval);
  localStorage.setItem("appState", "save-session");

  document.getElementById("finish-subject-name").innerText =
    subjects[currentIndex];

  // Limpa campos
  document.getElementById("input-questions").value = "";
  document.getElementById("input-correct").value = "";

  // Atualiza o tempo de estudo
  let currentTimerSeconds = parseInt(
    localStorage.getItem("currentTimerSeconds") || "0"
  );
  document.getElementById("finish-study-time").innerText =
    formatTime(currentTimerSeconds);

  // Reseta variáveis auxiliares para garantir limpeza
  startTime = null;
  accumulatedTime = 0;

  switchScreen("screen-finish");
}
