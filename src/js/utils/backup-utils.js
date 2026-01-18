export function buildBackupData() {
  return {
    version: 1.0,
    date: new Date().toISOString(),
    data: {
      studyHistory: JSON.parse(localStorage.getItem("studyHistory")) || [],
      studyCycle: JSON.parse(localStorage.getItem("studyCycle")) || [],
      restDays: JSON.parse(localStorage.getItem("restDays")) || [],
      studyCategories:
        JSON.parse(localStorage.getItem("studyCategories")) || [],
      customCategoryColors:
        JSON.parse(localStorage.getItem("customCategoryColors")) || {},
      theme: localStorage.getItem("theme") || "light",
      currentIndex: localStorage.getItem("currentIndex") || 0,
      unlockedAchievements:
        JSON.parse(localStorage.getItem("unlockedAchievements")) || [],
      studyNotes: JSON.parse(localStorage.getItem("studyNotes")) || [],
      lastBackupDate: localStorage.getItem("lastBackupDate") || "",
    },
  };
}

export function saveBackupToFile(backupData) {
  const json = JSON.stringify(backupData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
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

  const fileName = `backup_estudos_${dateStr}_${timeStr}.json`;

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return fileName;
}

export function restoreBackup(backup) {
  localStorage.setItem(
    "studyHistory",
    JSON.stringify(backup.data.studyHistory),
  );
  localStorage.setItem("studyCycle", JSON.stringify(backup.data.studyCycle));
  localStorage.setItem("restDays", JSON.stringify(backup.data.restDays));
  localStorage.setItem("theme", backup.data.theme);
  localStorage.setItem("currentIndex", backup.data.currentIndex);
  localStorage.setItem(
    "studyCategories",
    JSON.stringify(backup.data.studyCategories),
  );
  localStorage.setItem(
    "unlockedAchievements",
    JSON.stringify(backup.data.unlockedAchievements),
  );
  localStorage.setItem(
    "customCategoryColors",
    JSON.stringify(backup.data.customCategoryColors),
  );
  localStorage.setItem("studyNotes", JSON.stringify(backup.data.studyNotes));

  if (backup.data.lastBackupDate !== "") {
    localStorage.setItem("lastBackupDate", backup.data.lastBackupDate);
  }
}
