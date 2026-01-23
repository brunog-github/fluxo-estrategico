export function initReportsScreenEvents(
  reports,
  screens,
  lifetime,
  filterController,
) {
  // Botão "limpar histórico"
  document
    .getElementById("btn-clean-all-history")
    .addEventListener("click", () => {
      reports.clearAll();
    });

  // preparar UI de filtros quando entrar na tela de relatórios
  document
    .getElementById("btn-report-screen")
    .addEventListener("click", async () => {
      await reports.show();
      await lifetime.update();
      await filterController.init();
    });

  document
    .getElementById("btn-back-to-home-from-reports")
    .addEventListener("click", () => {
      screens.switch("screen-home");
    });
}
