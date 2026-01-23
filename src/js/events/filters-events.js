export function initFiltersEvents(filterController) {
  const startInput = document.getElementById("filter-start");
  const endInput = document.getElementById("filter-end");

  if (startInput) {
    startInput.addEventListener("click", () => startInput.showPicker());
  }
  if (endInput) {
    endInput.addEventListener("click", () => endInput.showPicker());
  }

  // eventos
  document
    .getElementById("filter-subject")
    .addEventListener("change", async () => {
      await filterController.applyFilters();
    });

  startInput.addEventListener("change", async () => {
    endInput.min = startInput.value;

    if (endInput.value && endInput.value < startInput.value) {
      endInput.value = startInput.value;
    }

    await filterController.applyFilters();
  });

  endInput.addEventListener("change", async () => {
    if (endInput.value) {
      startInput.max = endInput.value;
    } else {
      // Se limpar o fim, volta o max para "Hoje" (que é o padrão do sistema)
      const today = new Date().toISOString().split("T")[0];
      startInput.max = today;
    }

    await filterController.applyFilters();
  });

  document
    .getElementById("filter-category")
    .addEventListener("change", async () => {
      await filterController.applyFilters();
    });

  document
    .getElementById("btn-clear-filter-history")
    .addEventListener("click", async () => {
      const today = new Date().toISOString().split("T")[0];
      endInput.min = "";
      startInput.max = today;

      await filterController.clearFilters();
    });
}
