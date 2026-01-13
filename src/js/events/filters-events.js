export function initFiltersEvents(filterController) {
  // eventos
  document.getElementById("filter-subject").addEventListener("change", () => {
    filterController.applyFilters();
  });
  document.getElementById("filter-start").addEventListener("change", () => {
    filterController.applyFilters();
  });
  document.getElementById("filter-end").addEventListener("change", () => {
    filterController.applyFilters();
  });

  document
    .getElementById("btn-clear-filter-history")
    .addEventListener("click", () => {
      filterController.clearFilters();
    });
}
