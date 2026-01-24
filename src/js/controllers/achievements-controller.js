import { AchievementsUI } from "../ui/achievementsUI.js";
import { AchievementToastUI } from "../ui/achievement-toastUI.js";
import { dbService } from "../services/db/db-service.js";

export class AchievementsController {
  constructor(achievementsData) {
    this.ACHIEVEMENTS = achievementsData;
    this.ui = new AchievementsUI();
    this.toastUI = new AchievementToastUI();
  }

  async loadUnlocked() {
    return await dbService.getUnlockedAchievements();
  }

  async saveUnlocked(unlocked) {
    // Limpar achievements antigos e adicionar novos
    await dbService.clearAchievements();
    if (unlocked.length > 0) {
      await dbService.unlockAchievements(unlocked);
    }
  }

  async checkAndUnlockAchievements() {
    const history = await dbService.getHistory();
    let unlocked = await this.loadUnlocked();

    let newUnlock = false;

    for (const ach of this.ACHIEVEMENTS) {
      const achieved = await ach.check(history);

      if (!unlocked.includes(ach.id) && achieved) {
        unlocked.push(ach.id);
        this.toastUI.showToast(ach);
        newUnlock = true;
      }
    }

    if (newUnlock) {
      await this.saveUnlocked(unlocked);
      await this.renderAchievementsList();
    }
  }

  async renderAchievementsList() {
    const unlockedIds = await this.loadUnlocked();
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
        a.isUnlocked === b.isUnlocked ? 0 : a.isUnlocked ? -1 : 1,
      );
    }

    this.ui.renderList(list);
  }
}
