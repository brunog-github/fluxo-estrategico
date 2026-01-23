import { computeLifetimeStats } from "../utils/lifetime-utils.js";
import { LifetimeUI } from "../ui/lifetimeUI.js";
import { dbService } from "../services/db/db-service.js";

export class LifetimeController {
  constructor() {
    this.ui = new LifetimeUI();
  }

  async update() {
    const history = await dbService.getHistory();

    if (!history.length) {
      this.ui.reset();
      return;
    }

    const stats = computeLifetimeStats(history);

    this.ui.update(stats);
  }
}

