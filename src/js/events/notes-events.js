export function initNotesEvents(notesController) {
  // Encontrar TODOS os botões com ID "btn-open-notes" (pode haver em múltiplas telas)
  const btnOpens = document.querySelectorAll("#btn-open-notes");
  if (btnOpens.length > 0) {
    btnOpens.forEach((btn) => {
      // Remove listener anterior para evitar duplicação
      btn.removeEventListener("click", handleOpenNotes);
      // Adiciona novo listener
      btn.addEventListener("click", () => notesController.open());
    });
  }
}

// Função helper para remover listeners se necessário
function handleOpenNotes() {
  // Placeholder para função de handler
}
