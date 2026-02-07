import { dbService } from "../services/db/db-service.js";
import { SimuladoController } from "./simulado-controller.js";

export class SimuladosSalvosController {
  constructor(toast, confirm) {
    this.toast = toast;
    this.confirm = confirm;
    this.simulados = [];
    this.editais = [];
    this.selectedEditalId = null;
    this.selectedSimuladoId = null;
    this.listenersAdded = false; // Flag para evitar listeners duplicados
    this.simuladoController = new SimuladoController(toast);

    // Paginação
    this.itemsPerPage = 3;
    this.currentPage = 1;
    this.totalPages = 1;

    // Tornar simuladoController acessível globalmente para eventos
    window.simuladoController = this.simuladoController;
  }

  async init(editalId) {
    await this.loadEditais();

    if (editalId) {
      this.selectedEditalId = editalId;
    } else if (this.editais.length > 0 && !this.selectedEditalId) {
      this.selectedEditalId = this.editais[0].id;
    }

    await this.loadSimulados();
    this.renderSelector();
    this.render();
    this.setupEventListeners();
    this.simuladoController.setupEventListeners();
  }

  async loadEditais() {
    this.editais = await dbService.getEditais();
  }

  renderSelector() {
    const selector = document.getElementById("simulados-edital-selector");
    const btnSimulado = document.getElementById("btn-adicionar-simulado");

    if (!selector) return;

    selector.innerHTML =
      this.editais.length > 0
        ? this.editais
            .map(
              (edital) =>
                `<option value="${edital.id}">${edital.nome}</option>`,
            )
            .join("")
        : '<option value="">Nenhum edital cadastrado</option>';

    if (this.selectedEditalId) {
      selector.value = this.selectedEditalId;
      if (btnSimulado) btnSimulado.style.display = "inline-block";
    } else {
      selector.value = "";
      if (btnSimulado) btnSimulado.style.display = "none";
    }
  }

  selectEdital(editalId) {
    this.selectedEditalId = parseInt(editalId);
    this.currentPage = 1; // Reset para primeira página ao trocar edital
    this.loadSimulados().then(() => {
      this.render();
      this.renderSelector();
    });
  }

  async loadSimulados() {
    if (!this.selectedEditalId) {
      this.simulados = [];
      return;
    }

    this.simulados = await dbService.getSimuladosByEdital(
      this.selectedEditalId,
    );
    // Ordenar por data (mais recente primeiro)
    this.simulados.sort((a, b) => new Date(b.data) - new Date(a.data));
  }

  render() {
    const container = document.getElementById("simulados-list");

    if (!container) return;

    if (this.simulados.length === 0) {
      container.innerHTML = `
        <div class="simulados-empty-state">
          <p>📋 Nenhum simulado salvo para este edital.</p>
          <p style="font-size: 12px; color: var(--text-secondary);">
            Crie um simulado na tela de edital para começar!
          </p>
        </div>
      `;
      this._removePaginationControls();
      return;
    }

    // Calcular paginação
    this.totalPages = Math.ceil(this.simulados.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    container.innerHTML = "";

    // Renderizar apenas os simulados da página atual
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    const simuladosPagina = this.simulados.slice(start, end);

    simuladosPagina.forEach((simulado) => {
      const card = this.createSimuladoCard(simulado);
      container.appendChild(card);
    });

    // Adicionar controles de paginação
    this._addPaginationControls();
  }

  _addPaginationControls() {
    // Remover controles existentes
    this._removePaginationControls();

    const container = document.getElementById("simulados-list");
    if (!container) return;

    // Criar container de paginação
    const paginationContainer = document.createElement("div");
    paginationContainer.className = "simulados-pagination";

    // Informação de resultados
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(
      this.currentPage * this.itemsPerPage,
      this.simulados.length,
    );

    const resultInfo = document.createElement("span");
    resultInfo.className = "pagination-result-info";
    resultInfo.textContent = `Exibindo ${start} a ${end} de ${this.simulados.length} simulados.`;
    paginationContainer.appendChild(resultInfo);

    // Se tem apenas 1 página, não mostra botões
    if (this.totalPages <= 1) {
      container.after(paginationContainer);
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
    prevBtn.addEventListener("click", () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.render();
      }
    });
    paginationWrapper.appendChild(prevBtn);

    // Botões de página
    const maxVisible = window.innerWidth < 480 ? 3 : 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement("button");
      pageBtn.textContent = i;
      pageBtn.className = `pagination-btn ${i === this.currentPage ? "active" : ""}`;
      pageBtn.addEventListener("click", () => {
        this.currentPage = i;
        this.render();
      });
      paginationWrapper.appendChild(pageBtn);
    }

    // Botão Próximo
    const nextBtn = document.createElement("button");
    nextBtn.innerHTML = "›";
    nextBtn.className = "pagination-btn pagination-next";
    nextBtn.disabled = this.currentPage === this.totalPages;
    nextBtn.addEventListener("click", () => {
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
        this.render();
      }
    });
    paginationWrapper.appendChild(nextBtn);

    paginationContainer.appendChild(paginationWrapper);
    container.after(paginationContainer);
  }

  _removePaginationControls() {
    const existingPagination = document.querySelector(".simulados-pagination");
    if (existingPagination) {
      existingPagination.remove();
    }
  }

  createSimuladoCard(simulado) {
    const card = document.createElement("div");
    card.className = "simulado-card";
    card.id = `simulado-${simulado.id}`;

    // Formatar data (evitar problema de timezone)
    const [year, month, day] = simulado.data.split("-");
    const dataFormatada = `${day}/${month}/${year}`;

    // Calcular badge de performance
    const porcentagem = simulado.totais.porcentagem || 0;
    let badgeClass = "badge-red";
    let badgeEmoji = '<i class="fa-solid fa-x"></i>';
    if (porcentagem >= 50 && porcentagem < 80) {
      badgeClass = "badge-yellow";
      badgeEmoji = '<i class="fa-solid fa-exclamation"></i>';
    }
    if (porcentagem >= 80) {
      badgeClass = "badge-green";
      badgeEmoji = '<i class="fa-solid fa-check"></i>';
    }

    card.innerHTML = `
      <div class="simulado-card-header">
        <div class="simulado-header-info">
          <h3 class="simulado-card-title">${simulado.nome}</h3>
          <p class="simulado-card-subtitle">${simulado.banca || "Sem banca"}</p>
        </div>
        <div class="simulado-header-right">
          <span class="simulado-card-date">${dataFormatada}</span>
          ${simulado.tempo ? `<span class="simulado-card-duration"><i class="fa-regular fa-clock"></i> ${simulado.tempo}</span>` : ""}
        </div>
      </div>

      <div class="simulado-card-stats">
        <div class="stat-item">
          <span class="stat-label">Total</span>
          <span class="stat-value">${simulado.totais.questoes}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Certas</span>
          <span class="stat-value stat-correct">${simulado.totais.certas}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Erradas</span>
          <span class="stat-value stat-wrong">${simulado.totais.questoes - simulado.totais.certas}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Pontos</span>
          <span class="stat-value">${simulado.totais.pontos}</span>
        </div>
      </div>

      <div class="simulado-card-performance">
        <div class="performance-bar">
          <div 
            class="performance-fill" 
            style="width: ${porcentagem}%"
          ></div>
        </div>
        <span class="performance-badge ${badgeClass}">
          ${badgeEmoji} ${porcentagem}%
        </span>
      </div>

      <div class="simulado-card-actions">
        <button class="simulado-card-action simulado-btn-details" data-simulado-id="${simulado.id}">
          Ver Detalhes →
        </button>
        <button class="simulado-card-action simulado-btn-edit" data-simulado-id="${simulado.id}">
          <i class="fas fa-edit"></i> Editar
        </button>
        <button class="simulado-card-action simulado-btn-delete" data-simulado-id="${simulado.id}">
          <i class="fas fa-trash-alt"></i> Deletar
        </button>
      </div>
    `;

    return card;
  }

  setupEventListeners() {
    // Evitar adicionar listeners duplicados (apenas para os listeners globais)
    if (!this.listenersAdded) {
      this.listenersAdded = true;

      // Seletor de edital
      const selector = document.getElementById("simulados-edital-selector");
      if (selector) {
        selector.addEventListener("change", (e) => {
          this.selectEdital(e.target.value);
        });
      }

      // Botão de adicionar simulado
      const btnAbrirSimulado = document.getElementById(
        "btn-adicionar-simulado",
      );
      if (btnAbrirSimulado) {
        btnAbrirSimulado.addEventListener("click", async () => {
          if (!this.selectedEditalId) {
            this.toast.showToast("error", "Selecione um edital primeiro!");
            return;
          }
          await this.simuladoController.init(this.selectedEditalId);
          this.simuladoController.abrirModal();
        });
      }

      // Listener para quando um simulado é salvo
      window.addEventListener("simuladoSalvo", async (e) => {
        if (e.detail.editalId === this.selectedEditalId) {
          await this.loadSimulados();
          this.render();
        }
      });

      // Botão de fechar modal (X)
      const btnFechar = document.getElementById("btn-fechar-detalhes-simulado");
      if (btnFechar) {
        btnFechar.addEventListener("click", () => this.closeSimuladoModal());
      }

      // Modal backdrop
      const modal = document.getElementById("modal-detalhes-simulado");
      if (modal) {
        modal.addEventListener("click", (e) => {
          if (e.target === modal) {
            this.closeSimuladoModal();
          }
        });
      }

      // Event delegation para os botões dos cards (um único listener no container)
      const container = document.getElementById("simulados-list");
      if (container) {
        container.addEventListener("click", (e) => {
          const detailsBtn = e.target.closest(".simulado-btn-details");
          const editBtn = e.target.closest(".simulado-btn-edit");
          const deleteBtn = e.target.closest(".simulado-btn-delete");

          if (detailsBtn) {
            const simuladoId = parseInt(detailsBtn.dataset.simuladoId);
            this.openSimuladoDetails(simuladoId);
          } else if (editBtn) {
            const simuladoId = parseInt(editBtn.dataset.simuladoId);
            this.editarSimulado(simuladoId);
          } else if (deleteBtn) {
            e.stopPropagation();
            const simuladoId = parseInt(deleteBtn.dataset.simuladoId);
            this.selectedSimuladoId = simuladoId;
            this.deleteSimulado();
          }
        });
      }
    }
  }

  openSimuladoDetails(simuladoId) {
    const simulado = this.simulados.find((s) => s.id === simuladoId);

    if (!simulado) {
      this.toast.showToast("error", "Simulado não encontrado!");
      return;
    }

    this.selectedSimuladoId = simuladoId;

    // Preencher modal
    const title = document.getElementById("simulado-modal-title");
    if (title) {
      title.textContent = simulado.nome;
    }

    const content = document.getElementById("simulado-modal-content");
    if (content) {
      content.innerHTML = this.renderModalContent(simulado);
    }

    // Mostrar modal
    const modal = document.getElementById("modal-detalhes-simulado");
    if (modal) {
      modal.classList.remove("hidden");
    }
  }

  /**
   * Abre o modal para editar um simulado existente
   * @param {number} simuladoId - ID do simulado a ser editado
   */
  async editarSimulado(simuladoId) {
    const simulado = this.simulados.find((s) => s.id === simuladoId);

    if (!simulado) {
      this.toast.showToast("error", "Simulado não encontrado!");
      return;
    }

    // Inicializar o modal em modo de edição com os dados do simulado
    await this.simuladoController.initParaEdicao(
      this.selectedEditalId,
      simulado,
    );
    this.simuladoController.abrirModal();
  }

  renderModalContent(simulado) {
    // Evitar problema de timezone: extrair componentes da data diretamente
    const [year, month, day] = simulado.data.split("-");
    const dataObj = new Date(year, month - 1, day); // month é 0-indexed
    const dataFormatada = dataObj.toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "long",
      day: "2-digit",
    });

    const porcentagem = simulado.totais.porcentagem || 0;

    let badgeClass = "badge-red";

    if (porcentagem >= 50 && porcentagem < 80) {
      badgeClass = "badge-yellow";
    }
    if (porcentagem >= 80) {
      badgeClass = "badge-green";
    }

    return `
      <div class="simulado-details">
        <div class="detail-group">
          <label>Data:</label>
          <span class="details-date-text">${dataFormatada}</span>
        </div>

        <div class="detail-group">
          <label>Banca:</label>
          <span class="details-banca-text">${simulado.banca || "Não informada"}</span>
        </div>

        <div class="detail-group">
          <label>Tempo Gasto:</label>
          <span class="details-tempo-text">${simulado.tempo || "Não registrado"}</span>
        </div>

        <div class="detail-group">
          <label>Comentários:</label>
          <span class="detail-text">${simulado.comentarios || "Nenhum comentário"}</span>
        </div>

        <div class="detail-divider"></div>

        <div class="detail-group">
          <label>Resumo de Desempenho:</label>
          <div class="performance-summary">
            <div class="summary-stat">
              <span class="summary-label">Questões</span>
              <span class="summary-value">${simulado.totais.questoes}</span>
            </div>
            <div class="summary-stat">
              <span class="summary-label">Certas</span>
              <span class="summary-value correct">${simulado.totais.certas}</span>
            </div>
            <div class="summary-stat">
              <span class="summary-label">Erradas</span>
              <span class="summary-value wrong">${simulado.totais.questoes - simulado.totais.certas}</span>
            </div>
            <div class="summary-stat">
              <span class="summary-label">Pontos</span>
              <span class="summary-value">${simulado.totais.pontos}</span>
            </div>
            <div class="summary-stat">
              <span class="summary-label">Aproveitamento</span>
              <!-- <span class="summary-value">${porcentagem}%</span> -->
              <span style="font-size: 18px;" class="performance-badge ${badgeClass}">
                ${porcentagem}%
              </span>
            </div>
          </div>
        </div>

        <div class="detail-divider"></div>

        <div class="detail-group">
          <label>Desempenho por Disciplina:</label>
          <div class="disciplinas-breakdown">
            ${this.renderDisciplinasList(simulado)}
          </div>
        </div>
      </div>
    `;
  }

  renderDisciplinasList(simulado) {
    if (!simulado.disciplinas || simulado.disciplinas.length === 0) {
      return "<p style='color: var(--text-secondary);'>Nenhuma disciplina registrada</p>";
    }

    return simulado.disciplinas
      .map((disciplina) => {
        const pontos = disciplina.certas * disciplina.peso;

        let percent = 0;

        if (disciplina.total > 0)
          percent = Math.round((disciplina.certas / disciplina.total) * 100);

        let badgeClass = "badge-red";

        if (percent >= 50 && percent < 80) {
          badgeClass = "badge-yellow";
        }
        if (percent >= 80) {
          badgeClass = "badge-green";
        }

        return `
          <div class="disciplina-item">
            <div class="disciplina-info">
              <span class="disciplina-name">${disciplina.nome}</span>
              <div class="disciplina-stats">
                <div class="stat-block">
                  <span class="stat-label">Peso</span>
                  <span class="stat-value">${disciplina.peso}</span>
                </div>
                <div class="stat-block">
                  <span class="stat-label">Acertos</span>
                  <span class="stat-value">${disciplina.certas}/${disciplina.total}</span>
                </div>
                <div class="stat-block">
                  <span class="stat-label">Desempenho</span>
                  <!-- <span class="stat-value">${percent}%</span> -->
                  <span style="font-size: 16px;" class="performance-badge ${badgeClass}">
                    ${percent}%
                  </span>
                </div>
                <div class="stat-block">
                  <span class="stat-label">Pontos</span>
                  <span class="stat-value points">${pontos} pts</span>
                </div>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  closeSimuladoModal() {
    const modal = document.getElementById("modal-detalhes-simulado");
    if (modal) {
      modal.classList.add("hidden");
    }
  }

  deleteSimulado() {
    if (!this.selectedSimuladoId) return;

    const simulado = this.simulados.find(
      (s) => s.id === this.selectedSimuladoId,
    );
    if (!simulado) return;

    this.confirm.confirm(
      `Tem certeza que deseja deletar o simulado "${simulado.nome}"?`,
      async () => {
        try {
          await dbService.deleteSimulado(this.selectedSimuladoId);
          this.toast.showToast("success", "Simulado deletado com sucesso!");
          this.closeSimuladoModal();
          await this.loadSimulados();
          this.render();
        } catch (error) {
          console.error("Erro ao deletar simulado:", error);
          this.toast.showToast("error", "Erro ao deletar simulado!");
        }
      },
      "Deletar Simulado",
    );
  }
}
