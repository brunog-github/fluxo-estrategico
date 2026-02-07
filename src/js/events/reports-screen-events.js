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
      await filterController.clearFilters(); // Resetar filtros ao entrar na tela
    });

  document
    .getElementById("btn-back-to-home-from-reports")
    .addEventListener("click", () => {
      screens.switch("screen-home");
    });

  // Botão "Acessar Edital Verticalizado" na tela de relatórios
  const btnEditalReports = document.getElementById(
    "btn-edital-verticalizado-reports",
  );
  if (btnEditalReports) {
    btnEditalReports.addEventListener("click", () => {
      screens.switch("screen-edital");
    });
  }

  // Botão "Ver Simulados" na tela de relatórios
  const btnVerSimulados = document.getElementById("btn-ver-simulados");
  if (btnVerSimulados) {
    btnVerSimulados.addEventListener("click", () => {
      screens.switch("screen-simulados-salvos");
    });
  }
}
