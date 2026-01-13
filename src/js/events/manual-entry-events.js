export function initManualEntryEvents(manualEntry, lifetime) {
  // Abrir modal
  document
    .getElementById("btn-add-manual-entry")
    .addEventListener("click", () => manualEntry.open());

  // Salvar
  document
    .getElementById("btn-save-manual-entry")
    .addEventListener("click", () => {
      manualEntry.save();
      lifetime.update();
    });

  // Fechar
  document
    .getElementById("btn-manual-entry-cancel")
    .addEventListener("click", () => {
      manualEntry.close();
    });

  // Chips
  document
    .getElementById("chip-today")
    .addEventListener("click", () => manualEntry.setDateOption("today"));

  document
    .getElementById("chip-yesterday")
    .addEventListener("click", () => manualEntry.setDateOption("yesterday"));

  document
    .getElementById("chip-other")
    .addEventListener("click", () => manualEntry.setDateOption("other"));
}
