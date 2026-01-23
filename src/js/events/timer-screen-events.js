export function initTimerScreenEvents(screens, timer, notesController) {
  document.getElementById("btn-back-to-home").addEventListener("click", () => {
    timer.reset();
    screens.goHomeFromTimer();
  });
  document
    .getElementById("btn-study-pause")
    .addEventListener("click", () => timer.togglePause());
  document
    .getElementById("btn-study-finish")
    .addEventListener("click", async () => await timer.finishSession());
  document.getElementById("btn-start-study").addEventListener("click", () => {
    timer.startStudy();

    if (notesController) {
      notesController.reset();
    }
  });
}
