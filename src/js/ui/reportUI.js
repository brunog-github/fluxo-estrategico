import { parseHistoryDatetime } from "../utils/reports-utils.js";
import { getCategoryColor } from "../utils/category-colors.js";
import { timeToMinutes, formatMinutesToHm } from "../utils/utils.js";

export class ReportsUI {
  constructor(toast, confirm, charts) {
    this.toast = toast;
    this.confirm = confirm;
    this.charts = charts;
    this.initTableDragScroll();

    // Paginação
    this.allHistory = []; // Armazenar todos os dados
    this.currentPage = 1;
    this.itemsPerPage = 40; // Mostrar 40 itens por página
    this.totalPages = 1;
  }

  initTableDragScroll() {
    const tableContainer = document.querySelector(".table-container");
    if (!tableContainer) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    // Suporte a drag horizontal (funciona em desktop e mobile)
    tableContainer.addEventListener("mousedown", (e) => {
      // Não inicia drag se clicou em botões
      if (e.target.closest("button")) return;

      isDown = true;
      startX = e.pageX - tableContainer.offsetLeft;
      scrollLeft = tableContainer.scrollLeft;
      tableContainer.style.cursor = "grabbing";
    });

    tableContainer.addEventListener("mouseleave", () => {
      isDown = false;
      tableContainer.style.cursor = "grab";
    });

    tableContainer.addEventListener("mouseup", () => {
      isDown = false;
      tableContainer.style.cursor = "grab";
    });

    tableContainer.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - tableContainer.offsetLeft;
      const walk = (x - startX) * 1;
      tableContainer.scrollLeft = scrollLeft - walk;
    });
  }

  updateRotateTip() {
    const tip = document.getElementById("rotate-tip");
    if (!tip) return;
    tip.style.display = window.innerWidth < 600 ? "block" : "none";
  }

  async renderHistoryTable(
    history,
    deleteCallback,
    editCallback,
    viewNotesCallback,
    allNotes = [],
  ) {
    const body = document.getElementById("history-list");
    const empty = document.getElementById("empty-history-msg");

    if (!history.length) {
      body.innerHTML = "";
      empty.style.display = "block";
      return;
    }

    empty.style.display = "none";

    // Armazenar todos os dados e ordenar
    this.allHistory = [...history];
    this.allHistory.sort(
      (a, b) => parseHistoryDatetime(b.date) - parseHistoryDatetime(a.date),
    );

    // Calcular paginação
    this.totalPages = Math.ceil(this.allHistory.length / this.itemsPerPage);
    this.currentPage = 1;

    // Renderizar primeira página
    await this._renderPage(
      deleteCallback,
      editCallback,
      viewNotesCallback,
      allNotes,
    );

    // Adicionar controles de paginação
    this._addPaginationControls(
      deleteCallback,
      editCallback,
      viewNotesCallback,
      allNotes,
    );
  }

  async _renderPage(
    deleteCallback,
    editCallback,
    viewNotesCallback,
    allNotes = [],
  ) {
    const body = document.getElementById("history-list");

    // Criar um Set de IDs que têm anotações para acesso rápido
    const notesIds = new Set(allNotes.map((note) => note.linkedId));

    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = Math.min(start + this.itemsPerPage, this.allHistory.length);
    const pageData = this.allHistory.slice(start, end);

    // Renderizar linhas da página em um DocumentFragment para evitar flicker
    const fragment = document.createDocumentFragment();

    const rows = await Promise.all(
      pageData.map(async (item, index) => {
        // Calcular número global do registro
        const recordNumber =
          (this.currentPage - 1) * this.itemsPerPage + index + 1;

        let [date] = item.date.split(" às ");
        const [d, m, y] = date.split("/");
        const short = y.slice(-2);

        const performance =
          item.questions > 0
            ? Math.round((item.correct / item.questions) * 100)
            : "-";

        const errors = item.questions > 0 ? item.questions - item.correct : "0";

        const category = item.category || "-";
        const categoryColor = await getCategoryColor(category);

        const tr = document.createElement("tr");
        tr.dataset.id = item.id;
        tr.innerHTML = `
          <td style="text-align:center; font-weight:bold; color: var(--text-secondary); width: 50px;"><small>#${recordNumber}</small></td>
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
            <span style="background: ${categoryColor}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; max-width: 100px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${category}</span>
          </td>

          <td style="white-space: nowrap; width:1%; vertical-align: middle;">
            <div style="display:flex; gap:10px; justify-content:center; align-items:center;">
                <button class="notes-row" style="background:transparent; border:none; font-size:16px; color:${notesIds.has(item.id) ? "#ffc107" : "var(--text-color)"}; cursor:pointer;" title="Anotações">
                    <i class="fa-regular fa-sticky-note"></i>
                </button>
                <button class="edit-row" style="background:transparent; border:none; font-size:16px; cursor:pointer;" title="Editar">
                    <i class="fa-regular fa-pen-to-square"></i>
                </button>
                <button class="delete-row" style="background:transparent; border:none; font-size:16px; color:red; cursor:pointer;" title="Excluir">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            </div>
          </td>
          
        `;

        return { tr, item };
      }),
    );

    // Adicionar linhas ao fragment antes de atualizar o DOM
    rows.forEach(({ tr, item }) => {
      tr.querySelector(".delete-row").addEventListener("click", (e) => {
        e.stopPropagation();
        deleteCallback(item.id);
      });

      tr.querySelector(".edit-row").addEventListener("click", (e) => {
        e.stopPropagation();
        editCallback(item);
      });

      tr.querySelector(".notes-row").addEventListener("click", (e) => {
        e.stopPropagation();
        viewNotesCallback(item.id);
      });

      tr.addEventListener("click", () => {
        document
          .querySelectorAll("#history-list tr.selected")
          .forEach((row) => {
            row.classList.remove("selected");
          });
        tr.classList.add("selected");
      });

      fragment.appendChild(tr);
    });

    // Limpar e adicionar todo o fragment de uma vez (sem flicker)
    body.innerHTML = "";
    body.appendChild(fragment);
  }

  _addPaginationControls(
    deleteCallback,
    editCallback,
    viewNotesCallback,
    allNotes = [],
  ) {
    let paginationContainer = document.querySelector(
      ".table-actions div:first-child",
    );

    if (!paginationContainer) return;

    paginationContainer.innerHTML = "";

    // Informação de resultados
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(
      this.currentPage * this.itemsPerPage,
      this.allHistory.length,
    );

    const resultInfo = document.createElement("span");
    resultInfo.className = "pagination-result-info";
    resultInfo.textContent = `Exibindo ${start} a ${end} de ${this.allHistory.length} resultados.`;
    paginationContainer.appendChild(resultInfo);

    // Se tem apenas 1 página (40 ou menos items), não mostra botões
    if (this.totalPages <= 1) {
      return;
    }

    // Criar wrapper para os botões
    const paginationWrapper = document.createElement("div");
    paginationWrapper.className = "pagination-wrapper";

    // Botão Anterior
    const prevBtn = document.createElement("button");
    prevBtn.innerHTML = "‹";
    prevBtn.className = "pagination-btn pagination-prev";
    prevBtn.disabled = this.currentPage === 1;
    prevBtn.addEventListener("click", async () => {
      if (this.currentPage > 1) {
        const scrollPos = window.scrollY;
        this.currentPage--;
        await this._renderPage(
          deleteCallback,
          editCallback,
          viewNotesCallback,
          allNotes,
        );
        this._addPaginationControls(
          deleteCallback,
          editCallback,
          viewNotesCallback,
          allNotes,
        );
        window.scrollTo(0, scrollPos);
      }
    });
    paginationWrapper.appendChild(prevBtn);

    // Calcular range de páginas a mostrar (estilo Google)
    // Em mobile, mostrar menos números de página
    const maxVisible = window.innerWidth < 480 ? 2 : 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    // Adicionar link para primeira página se não for visível
    if (startPage > 1) {
      const firstBtn = document.createElement("button");
      firstBtn.textContent = "1";
      firstBtn.className = "pagination-btn";
      firstBtn.addEventListener("click", async () => {
        const scrollPos = window.scrollY;
        this.currentPage = 1;
        await this._renderPage(
          deleteCallback,
          editCallback,
          viewNotesCallback,
          allNotes,
        );
        this._addPaginationControls(
          deleteCallback,
          editCallback,
          viewNotesCallback,
          allNotes,
        );
        window.scrollTo(0, scrollPos);
      });
      paginationWrapper.appendChild(firstBtn);

      // Adicionar "..."
      const dots = document.createElement("span");
      dots.className = "pagination-dots";
      dots.textContent = "...";
      paginationWrapper.appendChild(dots);
    }

    // Adicionar números de página
    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement("button");
      pageBtn.textContent = i;
      pageBtn.className = "pagination-btn";

      if (i === this.currentPage) {
        pageBtn.classList.add("active");
      }

      pageBtn.addEventListener("click", async () => {
        const scrollPos = window.scrollY;
        this.currentPage = i;
        await this._renderPage(
          deleteCallback,
          editCallback,
          viewNotesCallback,
          allNotes,
        );
        this._addPaginationControls(
          deleteCallback,
          editCallback,
          viewNotesCallback,
          allNotes,
        );
        window.scrollTo(0, scrollPos);
      });
      paginationWrapper.appendChild(pageBtn);
    }

    // Adicionar link para última página se não for visível
    if (endPage < this.totalPages) {
      // Adicionar "..."
      const dots = document.createElement("span");
      dots.className = "pagination-dots";
      dots.textContent = "...";
      paginationWrapper.appendChild(dots);

      const lastBtn = document.createElement("button");
      lastBtn.textContent = this.totalPages;
      lastBtn.className = "pagination-btn";
      lastBtn.addEventListener("click", async () => {
        const scrollPos = window.scrollY;
        this.currentPage = this.totalPages;
        await this._renderPage(
          deleteCallback,
          editCallback,
          viewNotesCallback,
          allNotes,
        );
        this._addPaginationControls(
          deleteCallback,
          editCallback,
          viewNotesCallback,
          allNotes,
        );
        window.scrollTo(0, scrollPos);
      });
      paginationWrapper.appendChild(lastBtn);
    }

    // Botão Próximo
    const nextBtn = document.createElement("button");
    nextBtn.innerHTML = "›";
    nextBtn.className = "pagination-btn pagination-next";
    nextBtn.disabled = this.currentPage === this.totalPages;
    nextBtn.addEventListener("click", async () => {
      if (this.currentPage < this.totalPages) {
        const scrollPos = window.scrollY;
        this.currentPage++;
        await this._renderPage(
          deleteCallback,
          editCallback,
          viewNotesCallback,
          allNotes,
        );
        this._addPaginationControls(
          deleteCallback,
          editCallback,
          viewNotesCallback,
          allNotes,
        );
        window.scrollTo(0, scrollPos);
      }
    });
    paginationWrapper.appendChild(nextBtn);

    paginationContainer.appendChild(paginationWrapper);
  }

  renderSummary(totalQ, totalC, totalE, accPerc, title = null) {
    const container = document.getElementById("chart-subjects").parentElement;

    let box = document.getElementById("report-summary-box");

    if (!box) {
      box = document.createElement("div");
      box.id = "report-summary-box";
      box.style.cssText = `
        display:flex;
        flex-direction:column;
        align-items:center;
        padding:15px; 
        margin-top:15px;
        background:var(--card-bg);
        border-radius:8px;
        border:1px solid var(--border-color);
        gap:10px;
      `;
      container.appendChild(box);
    }

    let color =
      accPerc < 50 ? "#ff5252" : accPerc >= 70 ? "#28a745" : "#ffc107";

    // título (mostra apenas se houver texto)
    const titleHTML = title
      ? `<div style="font-size:16px;font-weight:bold;opacity:.9;">${title}</div>`
      : "";

    const rowsHTML = `
    <div style="display:flex; width:100%; justify-content:space-around;">
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
        <div style="opacity:.7;font-size:12px;">Desempenho</div>
        <div style="font-size:18px;font-weight:bold;color:${color}">${accPerc}%</div>
      </div>
    </div>
    `;

    box.innerHTML = titleHTML + rowsHTML;
  }

  // ===== MODAL DE VISUALIZAÇÃO DETALHADA =====

  initDetailedViewModal() {
    const modal = document.getElementById("detailed-view-modal");
    const btnOpen = document.getElementById("btn-detailed-view");
    const btnClose = document.getElementById("btn-close-detailed-view");

    if (!modal || !btnOpen || !btnClose) return;

    // Abrir modal
    btnOpen.addEventListener("click", () => {
      modal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    });

    // Fechar modal
    btnClose.addEventListener("click", () => {
      this.closeDetailedViewModal();
    });

    // Fechar ao clicar fora
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        this.closeDetailedViewModal();
      }
    });

    // Fechar com tecla ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) {
        this.closeDetailedViewModal();
      }
    });
  }

  closeDetailedViewModal() {
    const modal = document.getElementById("detailed-view-modal");
    if (modal) {
      modal.classList.add("hidden");
      document.body.style.overflow = "auto";
    }
  }

  async renderDetailedView(history, allNotes = []) {
    const tbody = document.getElementById("detailed-subjects-body");
    if (!tbody) return;

    // Agrupar dados por disciplina
    const subjectStats = {};

    history.forEach((item) => {
      const subject = item.subject || "Sem disciplina";
      if (!subjectStats[subject]) {
        subjectStats[subject] = {
          subject: subject,
          totalTime: 0, // em minutos
          totalQuestions: 0,
          totalCorrect: 0,
          totalNotes: 0,
        };
      }

      // Somar tempo (convertendo para minutos)
      if (item.duration) {
        const minutes = timeToMinutes(item.duration);
        subjectStats[subject].totalTime += minutes;
      }

      // Somar questões
      subjectStats[subject].totalQuestions += parseInt(item.questions) || 0;
      subjectStats[subject].totalCorrect += parseInt(item.correct) || 0;
    });

    // Contar notas por disciplina
    allNotes.forEach((note) => {
      history.forEach((item) => {
        if (item.id === note.recordId) {
          const subject = item.subject || "Sem disciplina";
          if (subjectStats[subject]) {
            subjectStats[subject].totalNotes++;
          }
        }
      });
    });

    // Converter para array e ordenar
    const stats = Object.values(subjectStats).sort((a, b) =>
      a.subject.localeCompare(b.subject),
    );

    // Renderizar linhas
    tbody.innerHTML = "";
    const fragment = document.createDocumentFragment();

    stats.forEach((stat) => {
      const tr = document.createElement("tr");

      // Calcular performance
      const performance =
        stat.totalQuestions > 0
          ? Math.round((stat.totalCorrect / stat.totalQuestions) * 100)
          : 0;

      // Determinar classe de desempenho
      let performanceClass = "no-data";
      if (stat.totalQuestions > 0) {
        if (performance >= 70) {
          performanceClass = "excellent";
        } else if (performance >= 50) {
          performanceClass = "good";
        } else {
          performanceClass = "poor";
        }
      }

      // Calcular erros
      const totalErrors = Math.max(stat.totalQuestions - stat.totalCorrect, 0);

      tr.innerHTML = `
        <td class="subject-name">${stat.subject}</td>
        <td class="time-spent">${formatMinutesToHm(stat.totalTime)}</td>
        <td class="correct-count">${stat.totalCorrect}</td>
        <td class="error-count">${totalErrors}</td>
        <td class="questions-icon" title="Total de Questões">${
          stat.totalQuestions
        }</td>
        <td>
          <span class="performance-badge ${performanceClass}">
            ${stat.totalQuestions > 0 ? performance + "%" : "-"}
          </span>
        </td>
      `;

      fragment.appendChild(tr);
    });

    tbody.appendChild(fragment);
  }
}
