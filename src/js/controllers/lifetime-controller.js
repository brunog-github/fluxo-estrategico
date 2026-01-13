import { computeLifetimeStats } from "../utils/lifetime-utils.js";
import { LifetimeUI } from "../ui/lifetimeUI.js";

export class LifetimeController {
  constructor() {
    this.ui = new LifetimeUI();
  }

  update() {
    const history = JSON.parse(localStorage.getItem("studyHistory")) || [];

    if (!history.length) {
      this.ui.reset();
      return;
    }

    const stats = computeLifetimeStats(history);

    this.ui.update(stats);
  }
}
