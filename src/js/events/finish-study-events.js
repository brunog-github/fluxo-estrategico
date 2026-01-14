export function initFinishStudyEvents(session, screens, confirm) {
  document
    .getElementById("btn-save-study-screen-finish")
    .addEventListener("click", () => {
      if (session.saveSession()) {
        screens.switch("screen-home");
      }
    });

  document
    .getElementById("btn-cancel-session")
    .addEventListener("click", () => {
      confirm.confirm(
        "Tem certeza que deseja cancelar este estudo?",
        () => {
          session.cancelSession();
          screens.switch("screen-home");
        },
        "Cancelar Estudo"
      );
    });
}
