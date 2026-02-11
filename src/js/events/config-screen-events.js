export function initConfigScreenEvents(
  screens,
  configUI,
  streak,
  subjects,
  settings,
  pin,
) {
  document
    .getElementById("btn-to-screen-config")
    .addEventListener("click", async () => {
      configUI.renderList();
      streak.loadRestDaysUI();
      await settings.renderCategories();
      await settings.renderEditaisSummary();
      await pin.loadConfigUI();
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

  // Categorias
  document
    .getElementById("btn-add-category")
    .addEventListener("click", async () => await settings.addCategory());

  document
    .getElementById("new-category-input")
    .addEventListener("keypress", async (e) => {
      if (e.key === "Enter") await settings.addCategory();
    });

  document
    .getElementById("btn-make-backup")
    .addEventListener("click", async () => await settings.exportBackupFile());

  document
    .getElementById("btn-restore-backup")
    .addEventListener("click", () => settings.triggerImportConfig());

  document
    .getElementById("backup-upload")
    .addEventListener(
      "change",
      async (e) => await settings.importBackupFile(e.target),
    );

  document
    .getElementById("btn-clear-config")
    .addEventListener("click", () => settings.clearConfig());

  document
    .getElementById("btn-clear-floating")
    .addEventListener("click", () => settings.resetPositionFloatingButton());

  // PIN de Bloqueio
  document.getElementById("pin-config-toggle").addEventListener("click", () => {
    const body = document.getElementById("pin-config-body");
    const arrow = document.getElementById("pin-config-arrow");
    body.classList.toggle("collapsed");
    arrow.classList.toggle("rotated");
  });

  document
    .getElementById("btn-save-pin")
    .addEventListener("click", async () => await pin.savePin());

  document.getElementById("btn-remove-pin").addEventListener("click", () => {
    settings.confirm.confirm(
      "Tem certeza que deseja remover o PIN de acesso?",
      async () => await pin.removePin(),
    );
  });

  // Edital Verticalizado Button
  const btnEdital = document.getElementById("btn-edital-verticalizado");
  if (btnEdital) {
    btnEdital.addEventListener("click", () => {
      screens.switch("screen-edital");
    });
  }
}
