/**
 * Inicializa eventos da tela de Simulados Salvos
 * @param {ScreenNavigator} screens - Gerenciador de telas
 * @param {SimuladosSalvosUI} simuladosSalvosUI - UI dos simulados
 * @param {EditaiVerticalizedController} editalController - Controller do edital
 */
export function setupSimuladosSalvosEvents(
  screens,
  simuladosSalvosUI,
  editalController,
) {
  // Botão de voltar para home
  const btnBackHome = document.getElementById(
    "btn-back-to-home-from-simulados",
  );
  if (btnBackHome) {
    btnBackHome.addEventListener("click", () => {
      screens.switch("screen-home");
    });
  }

  // Listener para quando um simulado é salvo
  window.addEventListener("simuladoSalvo", async (event) => {
    const editalId = event.detail?.editalId;
    if (editalId && simuladosSalvosUI && simuladosSalvosUI.getController()) {
      // Recarregar simulados na tela
      await simuladosSalvosUI.render(editalId);
    }
  });
}
