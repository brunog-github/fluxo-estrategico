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
  if (!isPaused) {
    seconds++;
    updateTimerDisplay();
    localStorage.setItem("currentTimerSeconds", seconds);
  }
}

function startStudy(isResuming = false) {
  if (subjects.length === 0) {
    showToast("error", "Adicione matérias na configuração primeiro!");
    return;
  }

  // Se não estiver retomando (é inicio novo), zera o tempo
  if (!isResuming) {
    seconds = 0;
    localStorage.setItem("currentTimerSeconds", 0);
  }

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
  timerInterval = setInterval(timerTick, 1000);

  document.getElementById("btn-pause").innerText = "Pausar";
  document.getElementById("btn-pause").classList.remove("btn-outline");
}

function togglePause() {
  isPaused = !isPaused;
  let btn = document.getElementById("btn-pause");
  if (isPaused) {
    btn.innerText = "Retomar";
    btn.classList.add("btn-outline"); // Muda estilo visual
  } else {
    btn.innerText = "Pausar";
    btn.classList.remove("btn-outline");
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
  let currentTimerSeconds = parseInt(localStorage.getItem("currentTimerSeconds") || "0");
  document.getElementById("finish-study-time").innerText = formatTime(currentTimerSeconds);

  switchScreen("screen-finish");
}
