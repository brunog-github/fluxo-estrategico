// Gera dados falsos para testes e demonstrações
export function generateFakeData() {
  const subjects = [
    "Português",
    "Matemática",
    "Direito Constitucional",
    "Direito Administrativo",
    "Informática",
    "Raciocínio Lógico",
    "Atualidades",
    "Inglês",
    "Redação",
    "Direito Penal",
  ];

  const history = [];
  const count = Math.floor(Math.random() * (200 - 150 + 1)) + 150; // Entre 150 e 200

  // Função auxiliar para adicionar zero à esquerda
  const pad = (num) => num.toString().padStart(2, "0");

  for (let i = 0; i < count; i++) {
    // 1. Data Aleatória (Últimos 120 dias até hoje/futuro próximo de 2026)
    const dateObj = new Date(2026, 0, 15); // Base: 15/01/2026
    dateObj.setDate(dateObj.getDate() - Math.floor(Math.random() * 120)); // Voltar até 120 dias
    dateObj.setHours(Math.floor(Math.random() * 14) + 8); // Entre 08:00 e 22:00
    dateObj.setMinutes(Math.floor(Math.random() * 60));

    const formattedDate = `${pad(dateObj.getDate())}/${pad(
      dateObj.getMonth() + 1
    )}/${dateObj.getFullYear()} às ${pad(dateObj.getHours())}:${pad(
      dateObj.getMinutes()
    )}`;

    // 2. Duração Aleatória (10 min a 4 horas)
    // 70% de chance de ser entre 30min e 1h30, 30% de ser longão ou curtinho
    let totalSeconds;
    if (Math.random() > 0.3) {
      totalSeconds = Math.floor(Math.random() * (5400 - 1800 + 1)) + 1800; // 30min a 1h30
    } else {
      totalSeconds = Math.floor(Math.random() * (14400 - 600 + 1)) + 600; // 10min a 4h
    }

    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const duration = `${pad(h)}:${pad(m)}:${pad(s)}`;

    // 3. Questões e Acertos
    let questions = 0;
    let correct = 0;

    // 60% dos estudos têm questões
    if (Math.random() > 0.4) {
      questions = Math.floor(Math.random() * 30) + 5; // 5 a 35 questões
      // Acertos entre 40% e 100% das questões
      const minCorrect = Math.floor(questions * 0.4);
      correct =
        Math.floor(Math.random() * (questions - minCorrect + 1)) + minCorrect;
    }

    // 4. Cria o Objeto
    history.push({
      id: dateObj.getTime() + i, // Timestamp único
      date: formattedDate,
      subject: subjects[Math.floor(Math.random() * subjects.length)],
      duration: duration,
      questions: questions.toString(),
      correct: correct.toString(),
    });
  }

  // Ordenar por data (opcional, mas bom para consistência)
  history.sort((a, b) => b.id - a.id);

  // Salvar no LocalStorage
  localStorage.setItem("studyHistory", JSON.stringify(history));

  // Também salva as matérias para que os filtros funcionem
  localStorage.setItem("studyCycle", JSON.stringify(subjects));
  localStorage.setItem("subjects", JSON.stringify(subjects)); // Caso uses 'subjects'

  console.log(`✅ Sucesso! ${history.length} registos gerados.`);
  console.log("Recarrega a página para ver os gráficos e tabelas.");
}
