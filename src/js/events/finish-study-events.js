export function initFinishStudyEvents(session, screens) {
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
      session.cancelSession();
      screens.switch("screen-home");
    });
}
