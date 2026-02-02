import { dbService } from "../services/db/db-service.js";

export class SimuladosSalvosController {
  constructor(toast, confirm) {
    this.toast = toast;
    this.confirm = confirm;
    this.simulados = [];
    this.selectedEditalId = null;
    this.selectedSimuladoId = null;
    this.listenersAdded = false; // Flag para evitar listeners duplicados
  }

  async init(editalId) {
    this.selectedEditalId = editalId;
    await this.loadSimulados();
    this.render();
    this.setupEventListeners();
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

    // Resetar a flag de listeners quando renderizar novamente
    this.listenersAdded = false;

    if (this.simulados.length === 0) {
      container.innerHTML = `
        <div class="simulados-empty-state">
          <p>📋 Nenhum simulado salvo para este edital.</p>
          <p style="font-size: 12px; color: var(--text-secondary);">
            Crie um simulado na tela de edital para começar!
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = "";

    this.simulados.forEach((simulado) => {
      const card = this.createSimuladoCard(simulado);
      container.appendChild(card);
    });
  }

  createSimuladoCard(simulado) {
    const card = document.createElement("div");
    card.className = "simulado-card";
    card.id = `simulado-${simulado.id}`;

    // Formatar data
    const dataObj = new Date(simulado.data);
    const dataFormatada = dataObj.toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

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
        <span class="simulado-card-date">${dataFormatada}</span>
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
    // Evitar adicionar listeners duplicados
    if (this.listenersAdded) {
      return;
    }
    this.listenersAdded = true;

    // Botão "Ver Detalhes" do card
    document.querySelectorAll(".simulado-btn-details").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const simuladoId = parseInt(e.currentTarget.dataset.simuladoId);
        this.openSimuladoDetails(simuladoId);
      });
    });

    // Botão "Editar" do card
    document.querySelectorAll(".simulado-btn-edit").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const simuladoId = parseInt(e.currentTarget.dataset.simuladoId);
        // TODO: Implementar funcionalidade de editar simulado
        console.log("Editar simulado:", simuladoId);
        this.toast.showToast(
          "info",
          "Funcionalidade de editar em desenvolvimento",
        );
      });
    });

    // Botão "Deletar" do card
    document.querySelectorAll(".simulado-btn-delete").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const simuladoId = parseInt(e.currentTarget.dataset.simuladoId);
        this.selectedSimuladoId = simuladoId;
        this.deleteSimulado();
      });
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

  renderModalContent(simulado) {
    const dataObj = new Date(simulado.data);
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
