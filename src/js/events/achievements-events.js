export function initAchievementsEvents(screens, achievements) {
  document
    .getElementById("btn-achievements-screen")
    .addEventListener("click", async () => {
      await achievements.renderAchievementsList();
      screens.switch("screen-achievements");
    });

  document
    .getElementById("btn-back-to-home-from-achievements")
    .addEventListener("click", () => {
      screens.goHome();
    });

  document.getElementById("ach-filter").addEventListener("change", async () => {
    await achievements.renderAchievementsList();
  });
}
