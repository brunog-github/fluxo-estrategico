/**
 * Inicializa eventos da tela de Simulados Salvos
 * @param {ScreenNavigator} screens - Gerenciador de telas
 * @param {SimuladosSalvosUI} simuladosSalvosUI - UI dos simulados
 */
export function setupSimuladosSalvosEvents(screens, simuladosSalvosUI) {
  // Botão de voltar para home
  const btnBackHome = document.getElementById(
    "btn-back-to-home-from-simulados",
  );
  if (btnBackHome) {
    btnBackHome.addEventListener("click", () => {
      screens.switch("screen-home");
    });
  }
}
