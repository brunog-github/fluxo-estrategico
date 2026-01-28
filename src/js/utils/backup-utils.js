import { dbService } from "../services/db/db-service.js";

// Funções de compressão/descompressão com gzip usando fflate
export async function compressBackupGzip(data) {
  const json = JSON.stringify(data);
  const uint8 = new TextEncoder().encode(json);
  const compressed = fflate.gzipSync(uint8);
  return compressed;
}

export async function decompressBackupGzip(compressedData) {
  try {
    const decompressed = fflate.gunzipSync(compressedData);
    const json = new TextDecoder().decode(decompressed);
    return JSON.parse(json);
  } catch (error) {
    console.error("Erro ao descomprimir backup:", error);
    throw new Error("Falha ao descomprimir o arquivo de backup");
  }
}

export async function buildBackupData() {
  return {
    version: 1.0,
    date: new Date().toISOString(),
    data: {
      studyHistory: await dbService.getHistory(),
      studyCycle: await dbService.getSubjects(),
      restDays: await dbService.getRestDays(),
      studyCategories: await dbService.getCategories(),
      customCategoryColors: await dbService.getCustomCategoryColors(),
      theme: await dbService.getTheme(),
      currentIndex: await dbService.getCurrentIndex(),
      unlockedAchievements: await dbService.getUnlockedAchievements(),
      studyNotes: await dbService.getNotes(),
      lastBackupDate: await dbService.getLastBackupDate(),
    },
  };
}

export function saveBackupToFile(backupData) {
  const json = JSON.stringify(backupData, null, 2);
  const uint8 = new TextEncoder().encode(json);
  const compressed = fflate.gzipSync(uint8);
  const blob = new Blob([compressed], { type: "application/gzip" });
  const url = URL.createObjectURL(blob);

  // Nome bonito
  const now = new Date();
  const dateStr = now
    .toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    })
    .replace(/\//g, "-");

  const timeStr = now
    .toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(/:/g, "-");

  const fileName = `backup_estudos_${dateStr}_${timeStr}.gz`;

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return fileName;
}

export async function restoreBackup(backup) {
  // Importa histórico
  if (backup.data.studyHistory && backup.data.studyHistory.length > 0) {
    await dbService.addHistoryEntries(backup.data.studyHistory);
  }

  // Importa ciclo de estudo
  if (backup.data.studyCycle && backup.data.studyCycle.length > 0) {
    await dbService.addSubjects(backup.data.studyCycle.map((s) => s.name || s));
  }

  // Importa configurações
  if (backup.data.restDays) {
    await dbService.setRestDays(backup.data.restDays);
  }

  if (backup.data.theme) {
    await dbService.setTheme(backup.data.theme);
  }

  if (backup.data.currentIndex !== undefined) {
    await dbService.setCurrentIndex(backup.data.currentIndex);
  }

  // Importa categorias
  if (backup.data.studyCategories && backup.data.studyCategories.length > 0) {
    await dbService.addCategories(
      backup.data.studyCategories.map((c) => c.name || c),
    );
  }

  // Importa conquistas
  if (
    backup.data.unlockedAchievements &&
    backup.data.unlockedAchievements.length > 0
  ) {
    await dbService.unlockAchievements(backup.data.unlockedAchievements);
  }

  // Importa cores customizadas
  if (
    backup.data.customCategoryColors &&
    Object.keys(backup.data.customCategoryColors).length > 0
  ) {
    await dbService.setCustomCategoryColors(backup.data.customCategoryColors);
  }

  // Importa notas
  if (backup.data.studyNotes && backup.data.studyNotes.length > 0) {
    await dbService.addNotes(backup.data.studyNotes);
  }

  // Importa data do último backup
  if (backup.data.lastBackupDate !== "") {
    await dbService.setLastBackupDate(backup.data.lastBackupDate);
  }
}
