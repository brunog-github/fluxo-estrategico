import { parseHistoryDatetime } from "../utils/reports-utils.js";
import { getCategoryColor } from "../utils/category-colors.js";

export class ReportsUI {
  constructor(toast, confirm, charts) {
    this.toast = toast;
    this.confirm = confirm;
    this.charts = charts;
  }

  updateRotateTip() {
    const tip = document.getElementById("rotate-tip");
    if (!tip) return;
    tip.style.display = window.innerWidth < 600 ? "block" : "none";
  }

  renderHistoryTable(history, deleteCallback, editCallback) {
    const body = document.getElementById("history-list");
    const empty = document.getElementById("empty-history-msg");

    body.innerHTML = "";

    if (!history.length) {
      empty.style.display = "block";
      return;
    }

    empty.style.display = "none";

    // ordenar mais recente para mais antigo
    history.sort(
      (a, b) => parseHistoryDatetime(b.date) - parseHistoryDatetime(a.date)
    );

    history.forEach((item) => {
      let [date] = item.date.split(" às ");
      const [d, m, y] = date.split("/");
      const short = y.slice(-2);

      // Calcular desempenho (%)
      const performance =
        item.questions > 0
          ? Math.round((item.correct / item.questions) * 100)
          : "-";

      // Calcular erros
      const errors = item.questions > 0 ? item.questions - item.correct : "0";

      // Categoria com fallback para "-"
      const category = item.category || "-";
      const categoryColor = getCategoryColor(category);
      const categoryOpacity = item.category ? "1" : "0.65";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><small>${d}/${m}/${short}</small></td>
        <td style="text-align:left; font-weight:bold; text-transform: capitalize">${
          item.subject
        }</td>
        <td>${item.duration}</td>
        <td>${item.questions}</td>
        <td style="color:${
          item.correct > 0 ? "#2ecc71" : "var(--text-color)"
        }">${item.correct}</td>
        <td style="color:${
          errors !== "0" && errors > 0 ? "red" : "var(--text-color)"
        }">${errors}</td>
        <td style="color:${
          performance !== "-"
            ? performance >= 70
              ? "#2ecc71"
              : performance >= 50
              ? "orange"
              : "red"
            : "var(--text-color)"
        }; font-weight:bold">${performance}${
        performance !== "-" ? "%" : ""
      }</td>
        <td>
          <span style="background: ${categoryColor}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; max-width: 100px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: ${categoryOpacity};">${category}</span>
        </td>

        <td style="white-space: nowrap; width:1%; vertical-align: middle;">
          <div style="display:flex; gap:10px; justify-content:center; align-items:center;">
              <button class="edit-row" style="background:transparent; border:none; font-size:16px; cursor:pointer;" title="Editar">
                  <i class="fa fa-pencil"></i>
              </button>
              <button class="delete-row" style="background:transparent; border:none; font-size:16px; color:red; cursor:pointer;" title="Excluir">
                  <i class="fa fa-trash-o"></i>
              </button>
          </div>
        </td>
        
      `;

      tr.querySelector(".delete-row").addEventListener("click", () => {
        deleteCallback(item.id);
      });

      tr.querySelector(".edit-row").addEventListener("click", () => {
        editCallback(item);
      });

      body.appendChild(tr);
    });
  }

  renderSummary(totalQ, totalC, totalE, accPerc) {
    const container = document.getElementById("chart-subjects").parentElement;

    let box = document.getElementById("report-summary-box");
    if (!box) {
      box = document.createElement("div");
      box.id = "report-summary-box";
      box.style.cssText = `
        display:flex; justify-content:space-around;
        padding:15px; margin-top:15px;
        background:var(--card-bg); border-radius:8px;
        border:1px solid var(--border-color);
      `;
      container.appendChild(box);
    }

    let color =
      accPerc < 50 ? "#ff5252" : accPerc >= 70 ? "#28a745" : "#ffc107";

    box.innerHTML = `
      <div>
        <div style="opacity:.7;font-size:12px;">Questões</div>
        <div style="font-size:18px;font-weight:bold;">${totalQ}</div>
      </div>
      <div>
        <div style="opacity:.7;font-size:12px;color:var(--success-color)">Acertos</div>
        <div style="font-size:18px;font-weight:bold;color:var(--success-color)">${totalC}</div>
      </div>
      <div>
        <div style="opacity:.7;font-size:12px;color:#f00">Erros</div>
        <div style="font-size:18px;font-weight:bold;color:#f44">${totalE}</div>
      </div>
      <div>
        <div style="opacity:.7;font-size:12px;">Precisão de Acertos</div>
        <div style="font-size:18px;font-weight:bold;color:${color}">${accPerc}%</div>
      </div>
    `;
  }
}
