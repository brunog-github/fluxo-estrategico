import { dbService } from "./db-service.js";

/**
 * Função de migração: transfere dados do localStorage para IndexedDB
 * É chamada uma única vez quando a aplicação inicia
 */
export async function migrateFromLocalStorage() {
  try {
    // 1. Verificar se já foi feita a migração
    const isMigrated = await dbService.getSetting("migrationCompleted");
    console.log("Estado da migração:", isMigrated);
    if (isMigrated === true) {
      console.log("✅ Migração já foi realizada anteriormente");
      return;
    }

    console.log("🔄 Iniciando migração do localStorage para IndexedDB...");

    // 2. Buscar todos os dados do localStorage
    const studyCategories = JSON.parse(
      localStorage.getItem("studyCategories") || "[]",
    );
    const studyCycle = JSON.parse(localStorage.getItem("studyCycle") || "[]");
    const theme = localStorage.getItem("theme") || "light";
    const unlockedAchievements = JSON.parse(
      localStorage.getItem("unlockedAchievements") || "[]",
    );
    const restDays = JSON.parse(localStorage.getItem("restDays") || "[]");
    const currentIndex = parseInt(localStorage.getItem("currentIndex") || "0");
    const studyNotes = JSON.parse(localStorage.getItem("studyNotes") || "[]");
    const lastBackupDate = localStorage.getItem("lastBackupDate") || null;
    const customCategoryColors = JSON.parse(
      localStorage.getItem("customCategoryColors") || "{}",
    );
    const studyHistory = JSON.parse(
      localStorage.getItem("studyHistory") || "[]",
    );

    // 3. Migrar categorias
    if (studyCategories.length > 0) {
      console.log("📁 Migrando categorias...");
      for (const category of studyCategories) {
        await dbService.addCategory(category);
      }
    }

    // 4. Migrar ciclo de estudo (subjects)
    if (studyCycle.length > 0) {
      console.log("📚 Migrando ciclo de estudo...");
      await dbService.addSubjects(studyCycle);
      await dbService.setCurrentCycleIndex(currentIndex);
    }

    // 5. Migrar histórico de estudo
    if (studyHistory.length > 0) {
      console.log("📊 Migrando histórico de estudo...");
      const historyEntries = studyHistory.map((item) => ({
        id: item.id,
        date: item.date, // Já está no formato "DD/MM/YYYY às HH:mm"
        subject: item.subject,
        duration: item.duration, // Já está em "HH:MM:SS"
        questions: item.questions,
        correct: item.correct,
        category: item.category,
      }));
      await dbService.addHistoryEntries(historyEntries);
    }

    // 6. Migrar anotações
    if (studyNotes.length > 0) {
      console.log("📝 Migrando anotações...");
      const notesToAdd = studyNotes.map((item) => ({
        linkedId: item.linkedId,
        content: item.content,
        preview: item.preview,
      }));
      await dbService.addNotes(notesToAdd);
    }

    // 7. Migrar conquistas desbloqueadas
    if (unlockedAchievements.length > 0) {
      console.log("🏆 Migrando conquistas...");
      for (const achievementId of unlockedAchievements) {
        await dbService.unlockAchievement(achievementId);
      }
    }

    // 8. Migrar configurações
    console.log("⚙️ Migrando configurações...");
    await dbService.setTheme(theme);
    await dbService.setRestDays(restDays);
    if (lastBackupDate) {
      await dbService.setSetting("lastBackupDate", lastBackupDate);
    }
    // Salvar customCategoryColors como setting
    if (Object.keys(customCategoryColors).length > 0) {
      await dbService.setSetting("customCategoryColors", customCategoryColors);
    }

    // 9. Marcar migração como completa
    await dbService.setSetting("migrationCompleted", true);
    await dbService.setSetting("migrationDate", new Date().toISOString());

    console.log("✅ Migração concluída com sucesso!");
    console.log("📦 Dados transferidos:");
    console.log(`   - ${studyCategories.length} categorias`);
    console.log(`   - ${studyCycle.length} matérias`);
    console.log(`   - ${studyHistory.length} sessões de estudo`);
    console.log(`   - ${studyNotes.length} anotações`);
    console.log(`   - ${unlockedAchievements.length} conquistas`);
  } catch (error) {
    console.error("❌ Erro durante a migração:", error);
    throw error;
  }
}

/**
 * Função auxiliar: verifica o status da migração
 */
export async function getMigrationStatus() {
  const isMigrated = await dbService.getSetting("migrationCompleted");
  const migrationDate = await dbService.getSetting("migrationDate");

  return {
    isMigrated: isMigrated === true,
    migrationDate: migrationDate || null,
  };
}

/**
 * Função auxiliar: limpa dados do localStorage após migração (opcional)
 * Use com cuidado - só depois de confirmar que migração funcionou
 */
export function clearLocalStorageAfterMigration() {
  const keysToRemove = [
    "studyCategories",
    "studyCycle",
    "theme",
    "unlockedAchievements",
    "restDays",
    "currentIndex",
    "studyNotes",
    "lastBackupDate",
    "customCategoryColors",
    "studyHistory",
  ];

  keysToRemove.forEach((key) => {
    localStorage.removeItem(key);
  });

  console.log(
    "🗑️ Dados do localStorage removidos (após migração bem-sucedida)",
  );
}
