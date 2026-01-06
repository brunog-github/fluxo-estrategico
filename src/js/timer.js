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

  document.title = `(${text}) - Fluxo ESTRATÉGICO`;
}

function updatePauseDisplay() {
  const el = document.getElementById("timer-paused-display");
  if (!el) return;

  let currentSessionPause = 0;

  // Se estiver pausado agora, calcula o tempo decorrido desde o clique
  if (isPaused && pauseStartTime) {
    const now = Date.now();
    currentSessionPause = Math.floor((now - pauseStartTime) / 1000);
  }

  // Tempo Total = O que já tinha acumulado + O que está correndo agora
  let total = totalPausedSeconds + currentSessionPause;

  el.innerText = "Tempo Pausado: " + formatTime(total);

  // Só mostra se houver algum tempo pausado ou estiver pausado
  el.style.display = total > 0 || isPaused ? "block" : "none";
}

function timerTick() {
  const now = Date.now();

  if (!isPaused && startTime) {
    // A MÁGICA ACONTECE AQUI:
    // Em vez de seconds++, calculamos a diferença entre AGORA e o INÍCIO

    const diffInSeconds = Math.floor((now - startTime) / 1000);

    // O tempo total é: o que já tinha acumulado antes + a diferença atual
    seconds = accumulatedTime + diffInSeconds;

    updateTimerDisplay();
    localStorage.setItem("currentTimerSeconds", seconds);
  } // CENÁRIO B: PAUSADO (Contando tempo de pausa)
  else if (isPaused && pauseStartTime) {
    // Não alteramos 'seconds' (estudo), apenas atualizamos o display de pausa
    updatePauseDisplay();
  }
}

function startStudy(isResuming = false) {
  if (subjects.length === 0) {
    showToast("error", "Adicione matérias na configuração primeiro!");
    return;
  }

  // --- VARIÁVEIS DE CONTROLE ---
  let savedIsPaused = false;

  if (isResuming) {
    // Verifica se estava pausado ANTES de qualquer coisa
    savedIsPaused = localStorage.getItem("isPaused") === "true";
  }

  // Configuração Inicial
  if (!isResuming) {
    seconds = 0;
    accumulatedTime = 0; // Zera o acumulado
    localStorage.setItem("currentTimerSeconds", 0);

    // Zera contadores de pausa no início de uma nova sessão
    totalPausedSeconds = 0;
    pauseStartTime = null;
    isPaused = false;

    // Limpa sujeira antiga do localStorage
    localStorage.removeItem("isPaused");
    localStorage.removeItem("pauseStartTime");
    localStorage.removeItem("totalPausedSeconds");
    localStorage.removeItem("accumulatedTime"); // Limpa acumulado antigo

    //updatePauseDisplay(); // Vai esconder o elemento pois está zerado
    startTime = Date.now();
  } else {
    // RETOMANDO (Refresh)

    // Recupera o tempo de estudo (seconds)
    let savedSeconds = localStorage.getItem("currentTimerSeconds");
    seconds = savedSeconds ? parseInt(savedSeconds) : 0;

    // Recupera total de pausa antigo
    let savedTotalPaused = localStorage.getItem("totalPausedSeconds");
    totalPausedSeconds = savedTotalPaused ? parseInt(savedTotalPaused) : 0;

    if (savedIsPaused) {
      // --- CENÁRIO: REFRESH ENQUANTO PAUSADO ---
      isPaused = true;
      startTime = null; // IMPORTANTE: Garante que o timer de estudo NÃO rode

      // Recupera QUANDO a pausa começou
      let savedPauseStart = localStorage.getItem("pauseStartTime");
      pauseStartTime = savedPauseStart ? parseInt(savedPauseStart) : Date.now();

      // O accumulatedTime deve ser restaurado para o valor que tinha na pausa
      let savedAccumulated = localStorage.getItem("accumulatedTime");
      accumulatedTime = savedAccumulated ? parseInt(savedAccumulated) : 0;
    } else {
      // --- CENÁRIO: REFRESH ENQUANTO ESTUDAVA ---
      isPaused = false;
      startTime = Date.now(); // Reinicia o ponto de referência
      // FIX PRINCIPAL: O tempo total salvo (seconds) é o nosso novo ACUMULADO.
      accumulatedTime = seconds;
    }
  }

  // Salva que o app está no modo TIMER
  localStorage.setItem("appState", "timer");

  let currentSubject = subjects[currentIndex];
  let nextIndex = (currentIndex + 1) % subjects.length;

  document.getElementById("timer-subject-name").innerText = currentSubject;
  document.getElementById("timer-next-subject-display").innerText =
    "Próxima matéria: " + subjects[nextIndex];

  switchScreen("screen-timer");

  // --- FORÇA O ESTADO VISUAL DO BOTÃO ---
  let btn = document.getElementById("btn-pause");

  // Se NÃO estiver pausado, começa o updateTimerDisplay
  if (isPaused) {
    // Se está pausado, força visual de RETOMAR
    btn.innerText = "Retomar";
    btn.classList.add("btn-outline");
    updateTimerDisplay();
    document.title = `(PAUSADO) - Fluxo ESTRATÉGICO`;
    updatePauseDisplay();
  } else {
    // Se está rodando, força visual de PAUSAR
    btn.innerText = "Pausar";
    btn.classList.remove("btn-outline");
    updateTimerDisplay();
    // Esconde display de pausa se não tiver histórico
    updatePauseDisplay();
  }

  clearInterval(timerInterval);
  timerInterval = setInterval(timerTick, 1000); // O intervalo chama o cálculo
}

function togglePause() {
  isPaused = !isPaused;

  let btn = document.getElementById("btn-pause");
  const now = Date.now();

  localStorage.setItem("isPaused", isPaused);

  if (isPaused) {
    // --- AO PAUSAR ---
    btn.innerText = "Retomar";
    btn.classList.add("btn-outline");

    document.title = "(PAUSADO) - Fluxo ESTRATÉGICO";

    // Congela o tempo atual no 'accumulatedTime'
    // Se não fizermos isso, quando despausar ele vai pular o tempo que ficou pausado

    // 1. Congela o tempo de estudo
    if (startTime) {
      const diff = Math.floor((now - startTime) / 1000);
      accumulatedTime += diff;
      startTime = null;
    }

    // 2. Inicia o relógio de pausa
    pauseStartTime = now;

    // SALVA DADOS DO PAUSE NO LOCALSTORAGE
    localStorage.setItem("pauseStartTime", pauseStartTime);
    localStorage.setItem("currentTimerSeconds", seconds); // Garante que o tempo de estudo atual esteja salvo

    // SALVA O NOVO ACUMULADO PARA SER RECUPERADO NA PRÓXIMA PAUSA/RETOMADA
    localStorage.setItem("accumulatedTime", accumulatedTime); // Garante o acumulado

    updatePauseDisplay(); // Já mostra "Tempo pausado: 00:00:00" imediatamente
  } else {
    // --- AO RETOMAR ---
    btn.innerText = "Pausar";
    btn.classList.remove("btn-outline");

    // 1. Finaliza o relógio de pausa atual e soma ao total
    if (pauseStartTime) {
      const pauseDiff = Math.floor((now - pauseStartTime) / 1000);
      totalPausedSeconds += pauseDiff;
      pauseStartTime = null;
    }

    // LIMPA DADOS TEMPORÁRIOS DO PAUSE (mas mantém o total salvo)
    localStorage.removeItem("pauseStartTime");
    localStorage.setItem("totalPausedSeconds", totalPausedSeconds); // Atualiza o total
    localStorage.removeItem("accumulatedTime"); // <--- Limpa ao retomar, pois o seconds será o novo accumulatedTime

    // Cria um novo marco de início agora
    startTime = Date.now();
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
  pauseStartTime = null;
  totalPausedSeconds = 0;
  isPaused = false;

  localStorage.removeItem("isPaused");
  localStorage.removeItem("pauseStartTime");
  localStorage.removeItem("totalPausedSeconds");

  document.title = "Fluxo ESTRATÉGICO";
  switchScreen("screen-finish");
}
