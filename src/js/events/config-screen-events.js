export function initConfigScreenEvents(
  screens,
  configUI,
  streak,
  subjects,
  settings
) {
  document
    .getElementById("btn-to-screen-config")
    .addEventListener("click", () => {
      configUI.renderList();
      streak.loadRestDaysUI();
      screens.switch("screen-config");
    });

  document
    .getElementById("btn-back-to-home-from-config")
    .addEventListener("click", () => {
      screens.switch("screen-home");
    });

  document
    .getElementById("btn-save-rest-days")
    .addEventListener("click", () => {
      streak.saveRestDays();
    });

  document.getElementById("btn-save-subject").addEventListener("click", () => {
    const input = document.getElementById("new-subject-input");
    if (subjects.add(input.value)) {
      input.value = "";
      configUI.renderList();
    }
  });

  document
    .getElementById("btn-make-backup")
    .addEventListener("click", () => settings.exportBackupFile());

  document
    .getElementById("btn-restore-backup")
    .addEventListener("click", () => settings.triggerImportConfig());

  document
    .getElementById("backup-upload")
    .addEventListener("change", (e) => settings.importBackupFile(e.target));

  document
    .getElementById("btn-clear-config")
    .addEventListener("click", () => settings.clearConfig());
}
