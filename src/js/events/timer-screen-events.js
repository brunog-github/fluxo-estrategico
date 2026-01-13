export function initTimerScreenEvents(screens, timer) {
  document.getElementById("btn-back-to-home").addEventListener("click", () => {
    screens.goHomeFromTimer();
  });
  document
    .getElementById("btn-study-pause")
    .addEventListener("click", () => timer.togglePause());
  document
    .getElementById("btn-study-finish")
    .addEventListener("click", () => timer.finishSession());
  document
    .getElementById("btn-start-study")
    .addEventListener("click", () => timer.startStudy());
}
