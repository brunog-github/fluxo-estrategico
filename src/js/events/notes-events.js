export function initNotesEvents(notesController) {
  // Se quiser garantir que o botão da home ou timer chame o open:
  const btnOpen = document.getElementById("btn-open-notes");
  if (btnOpen) {
    // Remove listeners antigos para evitar duplicação (cloneNode trick) ou apenas adiciona
    btnOpen.onclick = () => notesController.open();
  }
}
