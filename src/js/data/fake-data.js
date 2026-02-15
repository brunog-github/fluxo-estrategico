// Gera dados falsos para testes e demonstrações
import { dbService } from "../services/db/db-service.js";

export async function generateFakeData() {
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
    "AFO",
    "Direito Tributário",
    "Direito Penal do Inimigo",
    "Direito Processual Civil",
    "Direito Processual Penal",
  ];

  const categories = [
    "Teoria",
    "Questões",
    "Simulados",
    "Revisão",
    "Leitura de lei",
  ];

  const history = [];
  const targetCount = Math.floor(Math.random() * (3000 - 2800 + 1)) + 2800; // Entre 2800 e 3000

  // Função auxiliar para adicionar zero à esquerda
  const pad = (num) => num.toString().padStart(2, "0");

  // Calcular quantos dias precisamos para gerar o número de estudos
  // Com máximo 2 estudos por dia, precisamos de pelo menos targetCount/2 dias
  const daysNeeded = Math.ceil(targetCount / 2);

  let createdCount = 0;

  // Gerar estudos distribuídos por dias
  for (
    let dayOffset = 0;
    dayOffset < daysNeeded && createdCount < targetCount;
    dayOffset++
  ) {
    // Data para este dia (regressiva a partir de hoje)
    const dateObj = new Date(2026, 0, 24); // Base: 24/01/2026
    dateObj.setDate(dateObj.getDate() - dayOffset);

    // Decidir quantos estudos neste dia (1 ou 2)
    const studiesThisDay = Math.random() > 0.4 ? 2 : 1; // 60% chance de 2, 40% de 1

    for (
      let study = 0;
      study < studiesThisDay && createdCount < targetCount;
      study++
    ) {
      // Horário aleatório (8:00 até 22:00)
      dateObj.setHours(Math.floor(Math.random() * 14) + 8);
      dateObj.setMinutes(Math.floor(Math.random() * 60));

      const formattedDate = `${pad(dateObj.getDate())}/${pad(
        dateObj.getMonth() + 1,
      )}/${dateObj.getFullYear()} às ${pad(dateObj.getHours())}:${pad(
        dateObj.getMinutes(),
      )}`;

      // Duração entre 10 minutos e 1h30 (90 minutos)
      const totalSeconds = Math.floor(Math.random() * (5400 - 600 + 1)) + 600; // 600s=10min, 5400s=90min

      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      const duration = `${pad(h)}:${pad(m)}:${pad(s)}`;

      // Questões e Acertos
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

      // Cria o objeto
      history.push({
        date: formattedDate,
        subject: subjects[Math.floor(Math.random() * subjects.length)],
        duration: duration,
        questions: questions.toString(),
        correct: correct.toString(),
        category: categories[Math.floor(Math.random() * categories.length)],
      });

      createdCount++;
    }
  }

  // Ordenar por data (mais recente primeiro)
  history.sort((a, b) => {
    const dateA = new Date(a.date.replace(" às ", " "));
    const dateB = new Date(b.date.replace(" às ", " "));
    return dateB - dateA;
  });

  // Salvar no IndexedDB
  try {
    // Limpar histórico anterior para recomeçar
    await dbService.clearHistory();

    // Adicionar todos os registros
    for (const item of history) {
      await dbService.addHistoryEntry(item);
    }

    // Salvar matérias configuradas
    const existingSubjects = await dbService.getSubjects();
    if (existingSubjects.length === 0) {
      await dbService.addSubjects(subjects);
    }
    console.log(`✅ Sucesso! ${history.length} registos gerados no IndexedDB.`);
    console.log("Recarrega a página para ver os gráficos e tabelas.");
  } catch (error) {
    console.error("❌ Erro ao gerar dados fakes:", error);
  }
}
