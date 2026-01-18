export function initFiltersEvents(filterController) {
  const startInput = document.getElementById("filter-start");
  const endInput = document.getElementById("filter-end");

  // eventos
  document.getElementById("filter-subject").addEventListener("change", () => {
    filterController.applyFilters();
  });

  startInput.addEventListener("change", () => {
    endInput.min = startInput.value;

    if (endInput.value && endInput.value < startInput.value) {
      endInput.value = startInput.value;
    }

    filterController.applyFilters();
  });

  endInput.addEventListener("change", () => {
    if (endInput.value) {
      startInput.max = endInput.value;
    } else {
      // Se limpar o fim, volta o max para "Hoje" (que é o padrão do sistema)
      const today = new Date().toISOString().split("T")[0];
      startInput.max = today;
    }

    filterController.applyFilters();
  });

  document.getElementById("filter-category").addEventListener("change", () => {
    filterController.applyFilters();
  });

  document
    .getElementById("btn-clear-filter-history")
    .addEventListener("click", () => {
      const today = new Date().toISOString().split("T")[0];
      endInput.min = "";
      startInput.max = today;

      filterController.clearFilters();
    });
}
