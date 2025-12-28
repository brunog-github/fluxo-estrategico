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
