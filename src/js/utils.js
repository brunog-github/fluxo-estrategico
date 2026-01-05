// --- UTILITÁRIOS E TEMA ---

// Converte string "00:00:00" para minutos (Number)
function timeToMinutes(timeStr) {
  // Converte "01:30:00" ou "00:10:00" para minutos (Number)
  if (!timeStr) return 0;
  const parts = timeStr.split(":");
  let h = parseInt(parts[0]) || 0;
  let m = parseInt(parts[1]) || 0;
  let s = parseInt(parts[2]) || 0;
  return h * 60 + m + s / 60; // Retorna minutos totais (com decimais se tiver segundos)
}

// Formata segundos para "HH:MM:SS"
function formatTime(totalSeconds) {
  let h = Math.floor(totalSeconds / 3600);
  let m = Math.floor((totalSeconds % 3600) / 60);
  let s = totalSeconds % 60;
  return [h, m, s].map((v) => (v < 10 ? "0" + v : v)).join(":");
}

// Função Auxiliar para formatar minutos em "XH Ymin" (ex: 661h 18min)
function formatMinutesToHm(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.floor(totalMinutes % 60);
  // Se for 0 minutos, mostra 0h00min ou algo similar
  return `${h}h${String(m).padStart(2, "0")}min`;
}

// --- TEMA DARK/LIGHT ---
function toggleTheme() {
  const html = document.documentElement;
  const btn = document.getElementById("theme-toggle");
  const currentTheme = html.getAttribute("data-theme");

  if (currentTheme === "dark") {
    html.removeAttribute("data-theme");
    localStorage.setItem("theme", "light");
    btn.innerText = "🌙";
  } else {
    html.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
    btn.innerText = "☀️";
  }

  // Atualiza os gráficos para corrigir a cor da fonte
  updateChartTheme();
  // NOVO: Verifica se a conquista foi atingida (se foi para dark)
  checkAndUnlockAchievements();
}

function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  const btn = document.getElementById("theme-toggle");
  if (savedTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    if (btn) btn.innerText = "☀️";
  }
}
