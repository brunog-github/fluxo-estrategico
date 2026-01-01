// --- ESTADO GLOBAL DA APLICAÇÃO ---

// Variáveis de Dados
let subjects = JSON.parse(localStorage.getItem("studyCycle")) || [];
let currentIndex = parseInt(localStorage.getItem("currentIndex")) || 0;

// Variáveis do Timer
let timerInterval = null;
let seconds = 0;
let isPaused = false;

// Variáveis dos Gráficos (Para poder destruir/atualizar)
let performanceChartInstance = null;
let timeChartInstance = null;

// Variável do Drag & Drop
let sortableInstance = null;

// NOVO: Dias de Descanso (Array de números 0-6)
// Padrão: Sábado (6) e Domingo (0)
let restDays = JSON.parse(localStorage.getItem("restDays")) || [];

// 1. Definição das Conquistas (Dados e Ícones SVG)
const ACHIEVEMENTS = [
  {
    id: "first_step",
    title: "Primeiros Passos",
    desc: "Complete sua primeira sessão de estudos.",
    icon: `<embed src="./src/assets/icons/primeiros-passos.svg" type="image/svg+xml" />`,
    check: (history) => history.length >= 1,
  },
  {
    id: "marathon",
    title: "Maratonista",
    desc: "Acumule 10 horas totais de estudo.",
    icon: `<embed src="./src/assets/icons/maratona.svg" type="image/svg+xml" />`,
    check: (history) => {
      const totalMin = history.reduce(
        (acc, item) => acc + timeToMinutes(item.duration),
        0
      );
      return totalMin >= 600; // 600 min = 10 horas
    },
  },
  {
    id: "sniper",
    title: "Sniper",
    desc: "Acerte 100% das questões em uma sessão (mínimo 10 questões).",
    icon: `<embed src="./src/assets/icons/sniper.svg" type="image/svg+xml" />`,
    check: (history) => {
      return history.some((h) => {
        let questions = parseInt(h.questions) || 0;
        let correctQuestions = parseInt(h.correct) || 0;
        return questions >= 10 && correctQuestions === questions;
      });
    },
  },
  {
    id: "streak_master",
    title: "Imparável",
    desc: "Mantenha uma constância de 7 dias seguidos.",
    icon: `<embed src="./src/assets/icons/fogo.svg" type="image/svg+xml" />`,
    check: (history) => {
      // Essa lógica depende do cálculo do streak da Home.
      // Vamos simplificar: se o texto na Home for >= 7
      const text = document.getElementById("streak-count")?.innerText || "";
      const num = parseInt(text) || 0;
      return num >= 7;
    },
  },
  {
    id: "night_owl",
    title: "Coruja",
    desc: "Estude entre 22:00 e 04:00 da manhã.",
    icon: `<embed src="./src/assets/icons/coruja.svg" type="image/svg+xml" />`,
    check: (history) => {
      return history.some((h) => {
        // h.date formato "31/12/2025 às 23:00"
        const timeStr = h.date.split(" às ")[1];

        if (!timeStr) return false;

        const hour = parseInt(timeStr.split(":")[0]);
        return hour >= 22 || hour < 4;
      });
    },
  },
  {
    id: "weekend_warrior",
    title: "Guerreiro de Fim de Semana",
    desc: "Complete uma sessão de estudos no Sábado ou Domingo.",
    icon: `<embed src="./src/assets/icons/guerreiro.svg" type="image/svg+xml" />`,
    check: (history) => {
      return history.some((h) => {
        let datePart = h.date.split(" às ")[0];
        let parts = datePart.split("/");
        let date = new Date(parts[2], parts[1] - 1, parts[0]);
        let day = date.getDay();
        return day === 0 || day === 6; // 0=Dom, 6=Sab
      });
    },
  },
  {
    id: "fifty_cycles",
    title: "Mestre do Ciclo",
    desc: "Complete 50 ciclos de estudos (sessões).",
    // Ícone: Um símbolo de loop/ciclo completo
    icon: `<embed src="./src/assets/icons/mestre-50.svg" type="image/svg+xml" />`,
    check: (history) => history.length >= 50,
  },
  {
    id: "subject_collector",
    title: "Colecionador de Matérias",
    desc: "Estude pelo menos uma vez em 5 matérias diferentes.",
    // Ícone: Estrela com números
    icon: `<embed src="./src/assets/icons/colecionador.svg" type="image/svg+xml" />`,
    check: (history) => {
      const subjects = new Set(history.map((h) => h.subject));
      return subjects.size >= 5;
    },
  },
  {
    id: "quiz_addict",
    title: "Viciado em Questões",
    desc: "Responda 500 questões no total.",
    // Ícone: Um ponto de interrogação dentro de um balão de fala
    icon: `<embed src="./src/assets/icons/mestre-50.svg" type="image/svg+xml" />`,
    check: (history) => {
      const totalQuestions = history.reduce(
        (acc, item) => acc + (parseInt(item.questions) || 0),
        0
      );
      return totalQuestions >= 500;
    },
  },
  {
    id: "accuracy_pro",
    title: "Atirador de Elite",
    desc: "Mantenha 85% de acerto em pelo menos 100 questões respondidas no mesmo dia.",
    // Ícone: Um alvo com seta
    icon: `<embed src="./src/assets/icons/atirador-de-elite.svg" type="image/svg+xml" />`,
    check: (history) => {
      if (history.length === 0) return false;

      // Agrupar todas as sessões por dia
      const dailySummary = {}; // Formato: {'dd/mm/yyyy': {totalQ: 0, totalC: 0}}

      history.forEach((h) => {
        // Extrai a data pura "dd/mm/yyyy"
        let dateStr = h.date.split(" às ")[0];
        let q = parseInt(h.questions) || 0;
        let c = parseInt(h.correct) || 0;

        if (!dailySummary[dateStr]) {
          dailySummary[dateStr] = { totalQ: 0, totalC: 0 };
        }

        dailySummary[dateStr].totalQ += q;
        dailySummary[dateStr].totalC += c;
      });

      // Verificar cada dia no resumo
      for (const date in dailySummary) {
        const summary = dailySummary[date];

        // Condição 1: Mínimo de 100 questões no dia
        if (summary.totalQ >= 100) {
          const accuracy = summary.totalC / summary.totalQ;

          // Condição 2: Mínimo de 85% de acerto
          if (accuracy >= 0.85) {
            return true; // Conquista desbloqueada!
          }
        }
      }

      return false;
    },
  },
  {
    id: "thirty_days_streak",
    title: "Hábito Formado",
    desc: "Mantenha uma constância (streak) de 30 dias seguidos.",
    // Ícone: Chama de fogo tripla
    icon: `<embed src="./src/assets/icons/habito-dominado.svg" type="image/svg+xml" />`,
    check: () => {
      // Reutiliza o cálculo do streak da Home
      const text = document.getElementById("streak-count")?.innerText || "";
      const num = parseInt(text) || 0;
      return num >= 30;
    },
  },
  {
    id: "dark_mode_user",
    title: "Mestre da Noite",
    desc: "Troque para o Tema Escuro.",
    // Ícone: Sol e Lua
    icon: `<embed src="./src/assets/icons/dark-mode.svg" type="image/svg+xml" />`,
    check: () => {
      return localStorage.getItem("theme") === "dark";
    },
  },
  {
    id: "portuguese_expert",
    title: "Filólogo",
    desc: "Acumule 10 horas totais de estudo em Português ou Língua Portuguesa.",
    icon: `<embed src="./src/assets/icons/livros.svg" type="image/svg+xml" />`,
    check: (history) => {
      const totalMin = history
        .filter((h) => h.subject.toLowerCase().includes("portugu"))
        .reduce((acc, item) => acc + timeToMinutes(item.duration), 0);
      return totalMin >= 600; // 600 min = 10 horas
    },
  },
  {
    id: "math_master",
    title: "Racionalista",
    desc: "Complete 10 sessões com 100% de acerto em Matemática ou Raciocínio Lógico (mínimo 10 questões/sessão).",
    icon: `<embed src="./src/assets/icons/mate-racio.svg" type="image/svg+xml" />`,
    check: (history) => {
      const validSessions = history.filter((h) => {
        const subject = h.subject.toLowerCase();
        const isMath =
          subject.includes("matemática") ||
          subject.includes("lógico") ||
          subject.includes("estatística");
        const q = parseInt(h.questions) || 0;
        const c = parseInt(h.correct) || 0;

        return isMath && q >= 10 && c === q;
      });
      return validSessions.length >= 10;
    },
  },
  {
    id: "total_focus",
    title: "Maratona Extrema",
    desc: "Complete uma única sessão de estudos com mais de 120 minutos (2 horas).",
    icon: `<embed src="./src/assets/icons/maratona-extrema.svg" type="image/svg+xml" />`,
    check: (history) => history.some((h) => timeToMinutes(h.duration) > 120),
  },
  {
    id: "century_club",
    title: "100 Dias de Fogo",
    desc: "Mantenha uma constância (streak) de 100 dias seguidos.",
    icon: `<embed src="./src/assets/icons/100-streaks.svg" type="image/svg+xml" />`,
    check: () => {
      const text = document.getElementById("streak-count")?.innerText || "";
      const num = parseInt(text) || 0;
      return num >= 100;
    },
  },
  // (Novo - Simplificado) Atingiu um alto acerto depois de um dia de baixo acerto
  {
    id: "error_corrector",
    title: "Fênix",
    desc: "Complete uma sessão com 90%+ de acerto após um dia em que sua taxa de acerto diária foi inferior a 50%. (ex: terça: 45%, quarta: 91%) *Mínimo de 20 questões dia.",
    icon: `<embed src="./src/assets/icons/fenix.svg" type="image/svg+xml" />`,
    check: (history) => {
      const dailyData = {};
      const MIN_QUESTIONS = 20;

      // 1. Agrupa dados diários
      history.forEach((h) => {
        const dateStr = h.date.split(" às ")[0];
        const q = parseInt(h.questions) || 0;
        const c = parseInt(h.correct) || 0;

        if (!dailyData[dateStr]) dailyData[dateStr] = { totalQ: 0, totalC: 0 };
        dailyData[dateStr].totalQ += q;
        dailyData[dateStr].totalC += c;
      });

      const dates = Object.keys(dailyData).sort();

      // 2. Verifica a condição (dia ruim seguido por dia bom)
      for (let i = 0; i < dates.length; i++) {
        const day = dailyData[dates[i]];
        const acc = day.totalQ > 0 ? day.totalC / day.totalQ : 0;

        // Encontrou um dia ruim (Taxa < 50% e min 20 questões)
        if (day.totalQ >= MIN_QUESTIONS && acc < 0.5) {
          // Agora procura por um dia bom DEPOIS
          for (let j = i + 1; j < dates.length; j++) {
            const nextDay = dailyData[dates[j]];
            const nextAcc =
              nextDay.totalQ > 0 ? nextDay.totalC / nextDay.totalQ : 0;

            // Encontrou um dia bom (Taxa >= 90% e min 20 questões)
            if (nextDay.totalQ >= MIN_QUESTIONS && nextAcc >= 0.9) {
              return true; // Conquista liberada
            }
          }
        }
      }
      return false;
    },
  },
];
