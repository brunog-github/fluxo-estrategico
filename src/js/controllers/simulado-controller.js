import { dbService } from "../services/db/db-service.js";
import { maskTimeValue } from "../utils/manual-entry-utils.js";

export class SimuladoController {
  constructor(toast) {
    this.toast = toast;
    this.selectedEditalId = null;
    this.editalMaterias = [];
    this.disciplinasTemp = [];
    this.listenersAdded = false; // Flag para evitar listeners duplicados
    this.modoEdicao = false; // Flag para controlar modo edição
    this.simuladoEditandoId = null; // ID do simulado sendo editado
  }

  /**
   * Inicializa o modal de simulado com as disciplinas do edital selecionado
   * @param {number} editalId - ID do edital selecionado
   */
  async init(editalId) {
    this.selectedEditalId = editalId;

    // Resetar modo de edição para garantir que é um novo simulado
    this.modoEdicao = false;
    this.simuladoEditandoId = null;

    // Restaurar título do modal para o padrão
    const modalTitle = document.querySelector(
      "#modalContentSimulado .modal-header h2",
    );
    if (modalTitle) {
      modalTitle.textContent = "Novo Simulado";
    }

    // Limpar os campos do formulário
    const nomeInput = document.getElementById("nomeSimulado");
    const bancaInput = document.getElementById("bancaSimulado");
    const tempoInput = document.getElementById("tempoGasto");
    const comentariosInput = document.getElementById("comentarios");

    if (nomeInput) nomeInput.value = "";
    if (bancaInput) bancaInput.value = "";
    if (tempoInput) tempoInput.value = "";
    if (comentariosInput) comentariosInput.value = "";

    if (!editalId) {
      this.toast.showToast("error", "Selecione um edital primeiro!");
      return;
    }

    // Carregar as matérias do edital selecionado
    this.editalMaterias = await dbService.getEditalMaterias(editalId);

    // Preparar as disciplinas para o simulado
    this.disciplinasTemp = this.editalMaterias.map((materia) => ({
      id: materia.id,
      nome: materia.nome,
      peso: 1,
      total: 0,
      certas: 0,
    }));

    // Renderizar a tabela e inicializar eventos
    this.renderTable();
    this.calculateTotals();
    this.setCurrentDate();
  }

  /**
   * Inicializa o modal em modo de edição com os dados do simulado existente
   * @param {number} editalId - ID do edital
   * @param {Object} simulado - Dados do simulado a ser editado
   */
  async initParaEdicao(editalId, simulado) {
    this.selectedEditalId = editalId;
    this.modoEdicao = true;
    this.simuladoEditandoId = simulado.id;

    // Carregar as matérias do edital para referência
    this.editalMaterias = await dbService.getEditalMaterias(editalId);

    // Usar as disciplinas do simulado salvo
    this.disciplinasTemp = simulado.disciplinas.map((d) => ({
      id: d.id,
      nome: d.nome,
      peso: d.peso,
      total: d.total,
      certas: d.certas,
    }));

    // Atualizar título do modal
    const modalTitle = document.querySelector(
      "#modalContentSimulado .modal-header h2",
    );
    if (modalTitle) {
      modalTitle.textContent = "Editar Simulado";
    }

    // Preencher os campos do formulário
    const dataInput = document.getElementById("dataSimulado");
    const nomeInput = document.getElementById("nomeSimulado");
    const bancaInput = document.getElementById("bancaSimulado");
    const tempoInput = document.getElementById("tempoGasto");
    const comentariosInput = document.getElementById("comentarios");

    if (dataInput) {
      dataInput.value = simulado.data;
      // Define o máximo como hoje (impede datas futuras)
      const hoje = new Date();
      const ano = hoje.getFullYear();
      const mes = String(hoje.getMonth() + 1).padStart(2, "0");
      const dia = String(hoje.getDate()).padStart(2, "0");
      dataInput.max = `${ano}-${mes}-${dia}`;
    }
    if (nomeInput) nomeInput.value = simulado.nome || "";
    if (bancaInput) bancaInput.value = simulado.banca || "";
    if (tempoInput) tempoInput.value = simulado.tempo || "";
    if (comentariosInput) comentariosInput.value = simulado.comentarios || "";

    // Renderizar a tabela e calcular totais
    this.renderTable();
    this.calculateTotals();
  }

  /**
   * Define a data atual no input de data e impede datas futuras
   */
  setCurrentDate() {
    const dataInput = document.getElementById("dataSimulado");
    if (dataInput) {
      const hoje = new Date();
      const ano = hoje.getFullYear();
      const mes = String(hoje.getMonth() + 1).padStart(2, "0");
      const dia = String(hoje.getDate()).padStart(2, "0");
      const dataFormatada = `${ano}-${mes}-${dia}`;

      dataInput.value = dataFormatada;
      // Define o máximo como hoje (impede datas futuras)
      dataInput.max = dataFormatada;
    }
  }

  /**
   * Renderiza a tabela de disciplinas
   */
  renderTable() {
    const tbody = document.getElementById("disciplinasBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    this.disciplinasTemp.forEach((d, index) => {
      const tr = document.createElement("tr");
      tr.setAttribute("data-idx", index);

      // Cálculos de linha
      const erradas = d.total - d.certas;
      const pontos = d.certas * d.peso;
      let percent = 0;
      if (d.total > 0) percent = Math.round((d.certas / d.total) * 100);

      // Cor do Badge de %
      let badgeClass = "badge-red";
      if (percent >= 50 && percent < 80) badgeClass = "badge-yellow";
      if (percent >= 80) badgeClass = "badge-green";

      tr.innerHTML = `
        <td class="th-left" style="font-weight: 500;">${d.nome}</td>
        <td align="center">
          <input type="text" class="table-input input-peso" value="${d.peso}" data-idx="${index}">
        </td>
        <td align="center">
          <input type="text" class="table-input input-total" value="${d.total}" data-idx="${index}">
        </td>
        <td align="center">
          <input type="text" class="table-input input-correct" value="${d.certas}" data-idx="${index}">
        </td>
        <td align="center">
          <input type="text" class="table-input input-wrong" value="${erradas}" readonly>
        </td>
        <td align="center" style="color: var(--text-color);">
          <span> ${pontos} </span>
        </td>
        <td align="center">
          <span class="badge-percent ${badgeClass}">${percent}</span>
        </td>
        <td align="center">
          <button class="btn-delete btn-delete-disciplina" data-idx="${index}">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    this.addInputListeners();
  }

  /**
   * Adiciona event listeners aos inputs da tabela
   */
  addInputListeners() {
    document.querySelectorAll(".table-input").forEach((input) => {
      input.addEventListener("input", (e) => {
        const idx = e.target.dataset.idx;
        let val = e.target.value;

        // Permitir apenas números
        val = val.replace(/\D/g, "");
        e.target.value = val;

        const numVal = parseInt(val) || 0;

        if (e.target.classList.contains("input-peso")) {
          this.disciplinasTemp[idx].peso = numVal;
        } else if (e.target.classList.contains("input-total")) {
          this.disciplinasTemp[idx].total = numVal;
        } else if (e.target.classList.contains("input-correct")) {
          // Validação: certas não podem ser maior que total
          if (numVal > this.disciplinasTemp[idx].total) {
            this.disciplinasTemp[idx].certas = this.disciplinasTemp[idx].total;
            e.target.value = this.disciplinasTemp[idx].total;
          } else {
            this.disciplinasTemp[idx].certas = numVal;
          }
        }

        // Atualizar apenas as células afetadas sem recriar a tabela
        this.updateTableRow(idx);
        this.calculateTotals();
      });
    });
  }

  /**
   * Atualiza apenas uma linha da tabela sem recriar tudo
   */
  updateTableRow(idx) {
    const d = this.disciplinasTemp[idx];
    const row = document.querySelector(`tbody tr[data-idx="${idx}"]`);

    if (!row) {
      console.warn(`Row com data-idx="${idx}" não encontrada`);
      return;
    }

    // Cálculos da linha
    const erradas = d.total - d.certas;
    const pontos = d.certas * d.peso;
    let percent = 0;
    if (d.total > 0) percent = Math.round((d.certas / d.total) * 100);

    // Cor do badge
    let badgeClass = "badge-red";
    if (percent >= 50 && percent < 80) badgeClass = "badge-yellow";
    if (percent >= 80) badgeClass = "badge-green";

    // Atualizar input de erradas (readonly)
    const inputWrong = row.querySelector(".input-wrong");
    if (inputWrong) {
      inputWrong.value = erradas;
    }

    // Atualizar célula de pontos
    const cellPontos = row.querySelector("td:nth-child(6)");
    if (cellPontos) {
      cellPontos.textContent = pontos;
    }

    // Atualizar célula de percentual com badge
    const cellPercent = row.querySelector("td:nth-child(7)");
    if (cellPercent) {
      const badge = cellPercent.querySelector(".badge-percent");
      if (badge) {
        badge.textContent = percent;
        badge.className = `badge-percent ${badgeClass}`;
      }
    }
  }

  /**
   * Calcula os totais do simulado
   */
  calculateTotals() {
    let totalQ = 0;
    let totalC = 0;
    let totalE = 0;
    let totalP = 0;

    this.disciplinasTemp.forEach((d) => {
      totalQ += d.total;
      totalC += d.certas;
      totalE += d.total - d.certas;
      totalP += d.certas * d.peso;
    });

    let totalPct = 0;
    if (totalQ > 0) totalPct = Math.round((totalC / totalQ) * 100);

    const elTotalQ = document.getElementById("totalQuestoes");
    const elTotalC = document.getElementById("totalCertas");
    const elTotalE = document.getElementById("totalErradas");
    const elTotalP = document.getElementById("totalPontos");
    const elTotalPct = document.getElementById("totalPorcentagem");

    if (elTotalQ) elTotalQ.innerText = totalQ;
    if (elTotalC) elTotalC.innerText = totalC;
    if (elTotalE) elTotalE.innerText = totalE;
    if (elTotalP) elTotalP.innerText = totalP;
    if (elTotalPct) {
      elTotalPct.innerText = totalPct;
      // Cor do badge total
      elTotalPct.className = "result-percent";
      if (totalPct < 50) elTotalPct.style.backgroundColor = "var(--red-badge)";
      else if (totalPct < 80)
        elTotalPct.style.backgroundColor = "var(--yellow-badge)";
      else elTotalPct.style.backgroundColor = "var(--green-badge)";
    }
  }

  /**
   * Remove uma disciplina da lista
   * @param {number} index - Índice da disciplina
   */
  removerDisciplina(index) {
    this.disciplinasTemp.splice(index, 1);
    this.renderTable();
    this.calculateTotals();
  }

  /**
   * Adiciona uma nova disciplina
   */
  adicionarDisciplina() {
    this.disciplinasTemp.push({
      id: Date.now(),
      nome: "Nova Disciplina",
      peso: 1,
      total: 0,
      certas: 0,
    });
    this.renderTable();
  }

  /**
   * Salva o simulado no banco de dados
   */
  async salvarSimulado() {
    const data = document.getElementById("dataSimulado").value;
    const nome = document.getElementById("nomeSimulado").value;
    const banca = document.getElementById("bancaSimulado").value;
    const tempo = document.getElementById("tempoGasto").value;
    const comentarios = document.getElementById("comentarios").value;

    // Validações
    if (!data) {
      this.toast.showToast("error", "Por favor, selecione uma data!");
      return;
    }
    if (!nome.trim()) {
      this.toast.showToast(
        "error",
        "Por favor, insira um nome para o simulado!",
      );
      return;
    }
    if (
      !tempo ||
      tempo === "00:00:00" ||
      tempo.replace(/[:\d]/g, "") !== "" ||
      tempo.replace(/:/g, "").replace(/0/g, "") === ""
    ) {
      this.toast.showToast(
        "error",
        "Por favor, insira um tempo de duração válido!",
      );
      return;
    }
    if (this.disciplinasTemp.length === 0) {
      this.toast.showToast(
        "error",
        "Por favor, adicione pelo menos uma disciplina!",
      );
      return;
    }

    const elTotalQ = document.getElementById("totalQuestoes");
    const elTotalC = document.getElementById("totalCertas");
    const elTotalP = document.getElementById("totalPontos");
    const elTotalPct = document.getElementById("totalPorcentagem");

    const totais = {
      questoes: parseInt(elTotalQ?.innerText) || 0,
      certas: parseInt(elTotalC?.innerText) || 0,
      pontos: parseInt(elTotalP?.innerText) || 0,
      porcentagem: parseInt(elTotalPct?.innerText) || 0,
    };

    try {
      if (this.modoEdicao && this.simuladoEditandoId) {
        // Atualizar simulado existente
        await dbService.updateSimulado(this.simuladoEditandoId, {
          data,
          nome: nome.trim(),
          banca: banca.trim(),
          tempo,
          comentarios: comentarios.trim(),
          disciplinas: this.disciplinasTemp,
          totais,
        });
        this.toast.showToast("success", "Simulado atualizado com sucesso! 🎉");
      } else {
        // Salvar novo simulado no banco de dados
        await dbService.addSimulado(
          this.selectedEditalId,
          data,
          nome,
          banca,
          tempo,
          comentarios,
          this.disciplinasTemp,
          totais,
        );
        this.toast.showToast("success", "Simulado salvo com sucesso! 🎉");
      }

      this.fecharModal();
      this.limparFormulario();

      // Disparar evento para que o controller do edital recarregue os simulados
      window.dispatchEvent(
        new CustomEvent("simuladoSalvo", {
          detail: { editalId: this.selectedEditalId },
        }),
      );
    } catch (error) {
      console.error("Erro ao salvar simulado:", error);
      this.toast.showToast(
        "error",
        this.modoEdicao
          ? "Erro ao atualizar simulado!"
          : "Erro ao salvar simulado!",
      );
    }
  }

  /**
   * Limpa o formulário
   */
  limparFormulario() {
    document.getElementById("dataSimulado").value = "";
    document.getElementById("nomeSimulado").value = "";
    document.getElementById("bancaSimulado").value = "";
    document.getElementById("tempoGasto").value = "";
    document.getElementById("comentarios").value = "";
    this.disciplinasTemp = [];
    document.getElementById("disciplinasBody").innerHTML = "";

    // Resetar modo de edição
    this.modoEdicao = false;
    this.simuladoEditandoId = null;

    // Restaurar título do modal para o padrão
    const modalTitle = document.querySelector(
      "#modalContentSimulado .modal-header h2",
    );
    if (modalTitle) {
      modalTitle.textContent = "Novo Simulado";
    }
  }

  /**
   * Abre o modal
   */
  abrirModal() {
    const modal = document.getElementById("modalOverlaySimulado");
    if (modal) {
      modal.classList.add("active");
    }
  }

  /**
   * Fecha o modal
   */
  fecharModal() {
    const modal = document.getElementById("modalOverlaySimulado");
    if (modal) {
      modal.classList.remove("active");
    }
  }

  /**
   * Formata e valida o input de tempo (HH:MM:SS)
   */
  setupTempoListener() {
    const tempoInput = document.getElementById("tempoGasto");

    if (!tempoInput) return;

    tempoInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, ""); // Remove não-dígitos

      let formattedValue = maskTimeValue(value);

      e.target.value = formattedValue;
    });

    // Aceitar apenas números e dois pontos
    tempoInput.addEventListener("keypress", (e) => {
      const char = String.fromCharCode(e.which);
      if (!/[0-9:]/.test(char)) {
        e.preventDefault();
      }
    });
  }

  /**
   * Configura os event listeners do modal
   */
  setupEventListeners() {
    // Evitar adicionar listeners duplicados
    if (this.listenersAdded) {
      return;
    }
    this.listenersAdded = true;

    const btnFechar = document.getElementById("btn-fechar-simulado");
    const btnCancelar = document.getElementById("btnCancelarSimulado");
    const btnSalvar = document.getElementById("btnSalvarSimulado");
    const modal = document.getElementById("modalOverlaySimulado");

    // Setup listener para validação de tempo
    this.setupTempoListener();

    if (btnFechar) {
      btnFechar.addEventListener("click", () => {
        this.fecharModal();
      });
    }

    if (btnCancelar) {
      btnCancelar.addEventListener("click", () => {
        this.fecharModal();
        this.limparFormulario();
      });
    }

    if (btnSalvar) {
      btnSalvar.addEventListener("click", () => {
        this.salvarSimulado();
      });
    }

    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          this.fecharModal();
        }
      });
    }

    // Event delegation para botões de deletar disciplina na tabela
    const tbody = document.getElementById("disciplinasBody");
    if (tbody) {
      tbody.addEventListener("click", (e) => {
        const deleteBtn = e.target.closest(".btn-delete-disciplina");
        if (deleteBtn) {
          const index = parseInt(deleteBtn.dataset.idx);
          this.removerDisciplina(index);
        }
      });
    }
  }
}
