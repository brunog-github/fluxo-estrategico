import { formatMinutesToHm } from "../utils/utils.js";

export class LifetimeUI {
  update({ totalMinutes, avgMinutes, daysStudiedCount, totalDaysRange }) {
    document.getElementById("life-total-time").innerText =
      formatMinutesToHm(totalMinutes);

    document.getElementById("life-avg-time").innerText =
      formatMinutesToHm(avgMinutes);

    document.getElementById(
      "life-days-studied"
    ).innerText = `${daysStudiedCount} dias`;

    document.getElementById(
      "life-days-total"
    ).innerText = `${totalDaysRange} dias`;
  }

  reset() {
    document.getElementById("life-total-time").innerText = "0h00min";
    document.getElementById("life-avg-time").innerText = "0h00min";
    document.getElementById("life-days-studied").innerText = "0 dias";
    document.getElementById("life-days-total").innerText = "0 dias";
  }
}
