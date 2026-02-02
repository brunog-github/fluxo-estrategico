import { dbService } from "../services/db/db-service.js";
import { EditaisSummaryUI } from "../ui/editais-summaryUI.js";
import { SimuladoController } from "./simulado-controller.js";

export class EditaiVerticalizedController {
  constructor(toast, confirmToast) {
    this.toast = toast;
    this.confirmToast = confirmToast;
    this.editais = [];
    this.selectedEditalId = null;
    this.editalMaterias = {};
    this.editalTopicos = {};
    this.expandedMaterias = new Set();
    this.materiaColors = {};
    this.simuladoController = new SimuladoController(toast);
  }

  async init() {
    await this.loadEditais();
    if (this.editais.length > 0) {
      this.selectedEditalId = this.editais[0].id;
      await this.loadEditalData();
    }
    this.renderSelector();
    this.render();
    this.setupEventListeners();
    this.simuladoController.setupEventListeners();

    // Tornar simuladoController acessível globalmente para eventos
    window.simuladoController = this.simuladoController;
  }

  async loadEditais() {
    this.editais = await dbService.getEditais();
  }

  async loadEditalData() {
    if (!this.selectedEditalId) return;

    this.editalMaterias[this.selectedEditalId] =
      await dbService.getEditalMaterias(this.selectedEditalId);

    for (const materia of this.editalMaterias[this.selectedEditalId]) {
      this.editalTopicos[materia.id] = await dbService.getEditalTopicos(
        materia.id,
      );
    }
  }

  generateRandomColor() {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#FFA502",
      "#9B59B6",
      "#E74C3C",
      "#3498DB",
      "#2ECC71",
      "#F39C12",
      "#E91E63",
      "#00BCD4",
      "#673AB7",
      "#FF5722",
      "#009688",
      "#5C6BC0",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  renderSelector() {
    const selector = document.getElementById("edital-selector");
    const deleteBtn = document.getElementById("btn-deletar-edital");
    const editBtn = document.getElementById("btn-editar-edital");
    const btnSimulado = document.getElementById("btn-adicionar-simulado");

    if (!selector) return;

    selector.innerHTML = this.editais
      .map((edital) => `<option value="${edital.id}">${edital.nome}</option>`)
      .join("");

    if (this.selectedEditalId) {
      selector.value = this.selectedEditalId;
      deleteBtn.disabled = false;
      if (editBtn) editBtn.style.display = "flex";
      if (btnSimulado) btnSimulado.style.display = "inline-block";
    } else {
      selector.value = "";
      deleteBtn.disabled = true;
      if (editBtn) editBtn.style.display = "none";
      if (btnSimulado) btnSimulado.style.display = "none";
    }
  }

  render() {
    const container = document.getElementById("edital-subjects-list");
    const progressContainer = document.getElementById(
      "edital-progress-container",
    );

    if (!container) return;

    // Se não há edital selecionado ou nenhum edital existe
    if (!this.selectedEditalId || this.editais.length === 0) {
      container.innerHTML = `
        <div class="edital-empty-state">
          <p>📚 Nenhum edital cadastrado</p>
        </div>
      `;
      progressContainer.style.display = "none";
      return;
    }

    const materias = this.editalMaterias[this.selectedEditalId] || [];

    if (materias.length === 0) {
      container.innerHTML = `
        <div class="edital-empty-state">
          <p>📚 Nenhuma matéria cadastrada neste edital.</p>
        </div>
      `;
      progressContainer.style.display = "none";
      return;
    }

    progressContainer.style.display = "block";
    container.innerHTML = "";

    materias.forEach((materia) => {
      const card = this.createMateriaCard(materia);
      container.appendChild(card);
    });

    this.updateGeneralProgress();
  }

  createMateriaCard(materia) {
    const card = document.createElement("div");
    card.className = "edital-subject-card";
    card.id = `edital-materia-${materia.id}`;

    if (!this.materiaColors[materia.id]) {
      this.materiaColors[materia.id] = this.generateRandomColor();
    }
    card.style.borderLeftColor = this.materiaColors[materia.id];

    const topicos = this.editalTopicos[materia.id] || [];
    const completedCount = topicos.filter((t) => t.completed).length;
    const totalCount = topicos.length;
    const percentage =
      totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

    const isExpanded = this.expandedMaterias.has(materia.id);

    card.innerHTML = `
      <div class="edital-subject-header" data-materia-id="${materia.id}">
        <div class="edital-subject-title">
          <span class="toggle-icon ${isExpanded ? "open" : ""}">›</span>
          <h3>${materia.nome}</h3>
        </div>
        <div class="edital-subject-stats">
          <span id="materia-stats-${materia.id}">${completedCount}/${totalCount}</span>
        </div>
      </div>

      <div class="edital-subject-progress">
        <div class="subject-progress-bar">
          <div 
            class="subject-progress-fill" 
            id="materia-progress-${materia.id}" 
            style="width: ${percentage}%"
          ></div>
        </div>
        <span class="subject-progress-percent" id="materia-percent-${materia.id}">${percentage}%</span>
      </div>

      <div class="edital-topics-list ${isExpanded ? "visible" : ""}" id="topicos-${materia.id}">
        ${topicos
          .map(
            (topico, index) => `
          <div class="edital-topic-item" data-topico-id="${topico.id}">
            <input 
              type="checkbox" 
              id="topico-${topico.id}" 
              class="edital-topic-checkbox"
              data-topico-id="${topico.id}"
              data-materia-id="${materia.id}"
              ${topico.completed ? "checked" : ""}
            />
            <label for="topico-${topico.id}">
              <span class="topic-number">${index + 1}.</span>
              <span class="topic-text">${topico.nome}</span>
            </label>
            <button 
              class="edital-topic-delete-btn" 
              data-topico-id="${topico.id}"
              data-materia-id="${materia.id}"
              title="Deletar tópico"
            >
              ✕
            </button>
          </div>
        `,
          )
          .join("")}
      </div>

      <div class="edital-add-topic-form">
        <input 
          type="text" 
          class="edital-topic-input" 
          placeholder="Adicionar novo tópico..." 
          data-materia-id="${materia.id}"
        />
        <button 
          class="edital-add-topic-btn" 
          data-materia-id="${materia.id}"
        >
          Adicionar
        </button>
      </div>
    `;

    return card;
  }

  updateGeneralProgress() {
    const progressBar = document.getElementById("edital-progress-fill");
    const progressPercent = document.getElementById("edital-progress-percent");
    const progressText = document.getElementById("edital-progress-text");

    if (!progressBar || !progressPercent || !progressText) return;

    const materias = this.editalMaterias[this.selectedEditalId] || [];
    let totalTopicos = 0;
    let completedTopicos = 0;

    materias.forEach((materia) => {
      const topicos = this.editalTopicos[materia.id] || [];
      totalTopicos += topicos.length;
      completedTopicos += topicos.filter((t) => t.completed).length;
    });

    const percentage =
      totalTopicos === 0
        ? 0
        : Math.round((completedTopicos / totalTopicos) * 100);

    progressBar.style.width = `${percentage}%`;
    progressPercent.textContent = `${percentage}%`;
    progressText.textContent = `${completedTopicos} de ${totalTopicos} tópicos concluídos`;
  }

  async addEdital(nome, materias) {
    if (!nome.trim()) {
      this.toast.showToast("error", "Digite o nome do edital");
      return;
    }

    if (materias.length === 0) {
      this.toast.showToast("error", "Adicione pelo menos uma matéria");
      return;
    }

    // Validar nome duplicado
    const nomeJaExiste = this.editais.some(
      (e) => e.nome.toLowerCase() === nome.trim().toLowerCase(),
    );
    if (nomeJaExiste) {
      this.toast.showToast("error", "Um edital com este nome já existe");
      return;
    }

    // Validar matérias duplicadas
    const materiasUnicas = new Set(materias.map((m) => m.toLowerCase()));
    if (materiasUnicas.size !== materias.length) {
      this.toast.showToast("error", "Existem matérias duplicadas");
      return;
    }

    try {
      const editalId = await dbService.addEdital(nome);
      for (const materia of materias) {
        await dbService.addEditalMateria(editalId, materia);
      }
      await this.loadEditais();
      this.selectedEditalId = editalId;
      await this.loadEditalData();
      this.renderSelector();
      this.render();
      await EditaisSummaryUI.renderBoth();
      this.toast.showToast("success", "Edital criado com sucesso");
    } catch (error) {
      console.error("Erro ao criar edital:", error);
      this.toast.showToast("error", "Erro ao criar edital");
    }
  }

  async updateEdital(editalId, novoNome, novasMaterias) {
    if (!novoNome.trim()) {
      this.toast.showToast("error", "Digite o nome do edital");
      return;
    }

    // Validar nome duplicado (exceto o edital atual)
    const nomeJaExiste = this.editais.some(
      (e) =>
        e.id !== editalId &&
        e.nome.toLowerCase() === novoNome.trim().toLowerCase(),
    );
    if (nomeJaExiste) {
      this.toast.showToast("error", "Um edital com este nome já existe");
      return;
    }

    // Validar matérias duplicadas
    const materiasUnicas = new Set(novasMaterias.map((m) => m.toLowerCase()));
    if (materiasUnicas.size !== novasMaterias.length) {
      this.toast.showToast("error", "Existem matérias duplicadas");
      return;
    }

    try {
      // Atualizar nome do edital
      const edital = await dbService
        .getEditais()
        .then((e) => e.find((x) => x.id === editalId));
      if (edital) {
        edital.nome = novoNome;
        await dbService.updateEdital(editalId, edital);
      }

      // Obter matérias existentes
      const materiasExistentes = await dbService.getEditalMaterias(editalId);
      const nomesExistentes = new Set(materiasExistentes.map((m) => m.nome));
      const nomesNovos = new Set(novasMaterias);

      // Deletar matérias removidas
      for (const materia of materiasExistentes) {
        if (!nomesNovos.has(materia.nome)) {
          await dbService.deleteEditalMateria(materia.id);
        }
      }

      // Adicionar novas matérias
      for (const materia of novasMaterias) {
        if (!nomesExistentes.has(materia)) {
          await dbService.addEditalMateria(editalId, materia);
        }
      }

      await this.loadEditais();
      await this.loadEditalData();
      this.renderSelector();
      this.render();
      await EditaisSummaryUI.renderBoth();
      this.toast.showToast("success", "Edital atualizado com sucesso");
    } catch (error) {
      console.error("Erro ao atualizar edital:", error);
      this.toast.showToast("error", "Erro ao atualizar edital");
    }
  }

  async deleteEdital(editalId) {
    try {
      await dbService.deleteEdital(editalId);
      await this.loadEditais();
      this.selectedEditalId =
        this.editais.length > 0 ? this.editais[0].id : null;
      this.editalMaterias = {};
      this.editalTopicos = {};
      if (this.selectedEditalId) {
        await this.loadEditalData();
      }
      this.renderSelector();
      this.render();
      await EditaisSummaryUI.renderBoth();
      this.toast.showToast("success", "Edital deletado com sucesso");
    } catch (error) {
      console.error("Erro ao deletar edital:", error);
      this.toast.showToast("error", "Erro ao deletar edital");
    }
  }

  async addTopico(materiaId, topicoNome) {
    if (!topicoNome.trim()) {
      this.toast.showToast("error", "Digite o nome do tópico");
      return;
    }

    try {
      await dbService.addEditalTopico(materiaId, topicoNome);
      this.editalTopicos[materiaId] =
        await dbService.getEditalTopicos(materiaId);
      this.render();
      await EditaisSummaryUI.renderBoth();
      this.toast.showToast("success", "Tópico adicionado com sucesso");
    } catch (error) {
      console.error("Erro ao adicionar tópico:", error);
      this.toast.showToast("error", "Erro ao adicionar tópico");
    }
  }

  async toggleTopico(topicoId, completed) {
    try {
      await dbService.updateEditalTopicoStatus(topicoId, completed);
      // Recarregar matérias para atualizar
      for (const materia of this.editalMaterias[this.selectedEditalId] || []) {
        this.editalTopicos[materia.id] = await dbService.getEditalTopicos(
          materia.id,
        );
      }
      this.render();
      await EditaisSummaryUI.renderBoth();
    } catch (error) {
      console.error("Erro ao atualizar tópico:", error);
      this.toast.showToast("error", "Erro ao atualizar tópico");
    }
  }

  async deleteTopico(topicoId) {
    try {
      await dbService.deleteEditalTopico(topicoId);
      // Recarregar matérias
      for (const materia of this.editalMaterias[this.selectedEditalId] || []) {
        this.editalTopicos[materia.id] = await dbService.getEditalTopicos(
          materia.id,
        );
      }
      this.render();
      await EditaisSummaryUI.renderBoth();
      this.toast.showToast("success", "Tópico deletado com sucesso");
    } catch (error) {
      console.error("Erro ao deletar tópico:", error);
      this.toast.showToast("error", "Erro ao deletar tópico");
    }
  }

  toggleMateria(materiaId) {
    if (this.expandedMaterias.has(materiaId)) {
      this.expandedMaterias.delete(materiaId);
    } else {
      this.expandedMaterias.add(materiaId);
    }
    this.render();
  }

  selectEdital(editalId) {
    this.selectedEditalId = parseInt(editalId);
    this.expandedMaterias.clear();
    this.loadEditalData().then(() => {
      this.render();
      this.renderSelector();
    });
  }

  setupEventListeners() {
    const selector = document.getElementById("edital-selector");
    const btnAbrirSimulado = document.getElementById("btn-adicionar-simulado");

    if (selector) {
      selector.addEventListener("change", (e) => {
        this.selectEdital(e.target.value);
      });
    }

    if (btnAbrirSimulado) {
      btnAbrirSimulado.addEventListener("click", async () => {
        if (!this.selectedEditalId) {
          this.toast.show("Selecione um edital primeiro!", "error");
          return;
        }
        await this.simuladoController.init(this.selectedEditalId);
        this.simuladoController.abrirModal();
      });
    }

    // Listener para quando um simulado é salvo
    window.addEventListener("simuladoSalvo", (e) => {
      if (e.detail.editalId === this.selectedEditalId) {
        // Opcionalmente, podemos atualizar algo na UI aqui
      }
    });
  }
}
