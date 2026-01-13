import { AchievementsUI } from "../ui/achievementsUI.js";
import { AchievementToastUI } from "../ui/achievement-toastUI.js";

export class AchievementsController {
  constructor(achievementsData) {
    this.ACHIEVEMENTS = achievementsData;
    this.ui = new AchievementsUI();
    this.toastUI = new AchievementToastUI();
  }

  loadUnlocked() {
    return JSON.parse(localStorage.getItem("unlockedAchievements")) || [];
  }

  saveUnlocked(unlocked) {
    localStorage.setItem("unlockedAchievements", JSON.stringify(unlocked));
  }

  checkAndUnlockAchievements() {
    const history = JSON.parse(localStorage.getItem("studyHistory")) || [];
    let unlocked = this.loadUnlocked();

    let newUnlock = false;

    this.ACHIEVEMENTS.forEach((ach) => {
      const achieved = ach.check(history);

      if (!unlocked.includes(ach.id) && achieved) {
        unlocked.push(ach.id);
        this.toastUI.showToast(ach);
        newUnlock = true;
      }
    });

    if (newUnlock) {
      this.saveUnlocked(unlocked);
      this.renderAchievementsList();
    }
  }

  renderAchievementsList() {
    const unlockedIds = this.loadUnlocked();
    const filter = this.ui.getFilter();

    let list = this.ACHIEVEMENTS.map((ach) => ({
      ...ach,
      isUnlocked: unlockedIds.includes(ach.id),
    }));

    const totalUnlocked = list.filter((a) => a.isUnlocked).length;
    const total = list.length;

    this.ui.updateCounter(totalUnlocked, total);

    // filtros
    if (filter === "unlocked") list = list.filter((a) => a.isUnlocked);
    else if (filter === "locked") list = list.filter((a) => !a.isUnlocked);

    // ordenação (modo "all")
    if (filter === "all") {
      list.sort((a, b) =>
        a.isUnlocked === b.isUnlocked ? 0 : a.isUnlocked ? -1 : 1
      );
    }

    this.ui.renderList(list);
  }
}
