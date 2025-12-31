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
let restDays = JSON.parse(localStorage.getItem("restDays")) || [0, 6];
