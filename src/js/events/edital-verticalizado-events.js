import { EditaiVerticalizedController } from "../controllers/edital-verticalizado-controller.js";

export function setupEditaiVerticalizedEvents(
  toastController,
  confirmToastController,
  screenNavigator,
) {
  const controller = new EditaiVerticalizedController(
    toastController,
    confirmToastController,
  );
  let materiasTemporarias = [];
  let editandoEditalId = null;

  // Back button
  const backBtn = document.getElementById("btn-back-to-home-from-edital");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (screenNavigator) {
        screenNavigator.switch("screen-home");
      } else {
        document.getElementById("screen-edital").classList.add("hidden");
        document.getElementById("screen-home").classList.remove("hidden");
      }
    });
  }

  // Botão Simulados Salvos
  const btnSimuladosSalvos = document.getElementById("btn-simulados-salvos");
  if (btnSimuladosSalvos) {
    btnSimuladosSalvos.addEventListener("click", () => {
      if (screenNavigator) {
        screenNavigator.switch("screen-simulados-salvos");
      }
    });
  }

  // Adicionar Edital button
  const btnAdicionarEdital = document.getElementById("btn-adicionar-edital");
  const btnEditarEdital = document.getElementById("btn-editar-edital");
  const modal = document.getElementById("modal-adicionar-edital");
  const modalTitle = document.getElementById("modal-title");
  const btnCancelar = document.getElementById("btn-cancelar-edital");
  const editalEditId = document.getElementById("edital-edit-id");

  if (btnAdicionarEdital) {
    btnAdicionarEdital.addEventListener("click", () => {
      editandoEditalId = null;
      editalEditId.value = "";
      materiasTemporarias = [];
      document.getElementById("input-nome-edital").value = "";
      document.getElementById("input-nome-materia").value = "";
      modalTitle.textContent = "Novo Edital";
      renderMateriasList();
      modal.classList.remove("hidden");
    });
  }

  if (btnEditarEdital) {
    btnEditarEdital.addEventListener("click", async () => {
      if (!controller.selectedEditalId) return;

      editandoEditalId = controller.selectedEditalId;
      editalEditId.value = controller.selectedEditalId;

      const nomeEdital = document.querySelector(
        `#edital-selector option[value="${controller.selectedEditalId}"]`,
      )?.textContent;
      const materias =
        controller.editalMaterias[controller.selectedEditalId] || [];

      document.getElementById("input-nome-edital").value = nomeEdital || "";
      materiasTemporarias = materias.map((m) => m.nome);
      modalTitle.textContent = "Editar Edital";
      renderMateriasList();
      modal.classList.remove("hidden");
    });
  }

  if (btnCancelar) {
    btnCancelar.addEventListener("click", () => {
      modal.classList.add("hidden");
    });
  }

  // Adicionar Matéria no modal
  const btnAdicionarMateria = document.getElementById("btn-adicionar-materia");
  const inputNomeMateria = document.getElementById("input-nome-materia");

  if (btnAdicionarMateria) {
    btnAdicionarMateria.addEventListener("click", () => {
      const nome = inputNomeMateria.value.trim();
      if (nome && !materiasTemporarias.includes(nome)) {
        materiasTemporarias.push(nome);
        inputNomeMateria.value = "";
        renderMateriasList();
        inputNomeMateria.focus();
      } else if (materiasTemporarias.includes(nome)) {
        toastController.showToast("error", "Esta matéria já foi adicionada");
      }
    });
  }

  if (inputNomeMateria) {
    inputNomeMateria.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const nome = inputNomeMateria.value.trim();
        if (nome && !materiasTemporarias.includes(nome)) {
          materiasTemporarias.push(nome);
          inputNomeMateria.value = "";
          renderMateriasList();
          inputNomeMateria.focus();
        } else if (materiasTemporarias.includes(nome)) {
          toastController.showToast("error", "Esta matéria já foi adicionada");
        }
      }
    });
  }

  function renderMateriasList() {
    const list = document.getElementById("edital-materias-list");
    if (!list) return;

    list.innerHTML = materiasTemporarias
      .map(
        (materia, index) => `
        <div class="edital-materia-item">
          <span>${materia}</span>
          <button class="edital-materia-remove" data-index="${index}" type="button">✕</button>
        </div>
      `,
      )
      .join("");

    // Event listeners para remover matérias
    list.querySelectorAll(".edital-materia-remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const index = parseInt(e.target.closest("button").dataset.index);
        materiasTemporarias.splice(index, 1);
        renderMateriasList();
      });
    });
  }

  // Form submit - Criar ou Atualizar Edital
  const form = document.getElementById("form-adicionar-edital");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nome = document.getElementById("input-nome-edital").value.trim();

      if (editandoEditalId) {
        // Atualizar edital existente
        await controller.updateEdital(
          editandoEditalId,
          nome,
          materiasTemporarias,
        );
      } else {
        // Criar novo edital
        await controller.addEdital(nome, materiasTemporarias);
      }

      modal.classList.add("hidden");
    });
  }

  // Selector change
  const selector = document.getElementById("edital-selector");
  if (selector) {
    selector.addEventListener("change", (e) => {
      const editalId = e.target.value;
      if (editalId) {
        controller.selectEdital(editalId);
        btnEditarEdital.style.display = "flex";
      } else {
        btnEditarEdital.style.display = "none";
      }
    });

    // Arrow animation on focus/blur
    const arrow = selector.nextElementSibling;
    if (arrow && arrow.classList.contains("edital-selector-arrow")) {
      selector.addEventListener("focus", () => {
        arrow.style.transform = "rotate(180deg)";
      });

      selector.addEventListener("blur", () => {
        arrow.style.transform = "rotate(0deg)";
      });
    }
  }

  // Delete Edital button
  const btnDeletarEdital = document.getElementById("btn-deletar-edital");
  if (btnDeletarEdital) {
    btnDeletarEdital.addEventListener("click", () => {
      if (!controller.selectedEditalId) return;

      const editalNome = document.querySelector(
        `#edital-selector option[value="${controller.selectedEditalId}"]`,
      )?.textContent;

      confirmToastController.confirm(
        `Tem certeza que deseja deletar o edital "${editalNome}"? Isso deletará todas as matérias, tópicos e simulados.`,
        async () => {
          await controller.deleteEdital(controller.selectedEditalId);
        },
        "Deletar Edital",
      );
    });
  }

  // Materia header click - toggle expansion
  document.addEventListener("click", (e) => {
    const materiaHeader = e.target.closest(".edital-subject-header");
    if (materiaHeader && !materiaHeader.querySelector(".edital-topic-input")) {
      const materiaId = parseInt(materiaHeader.dataset.materiaId);
      controller.toggleMateria(materiaId);
    }
  });

  // Checkbox change
  document.addEventListener("change", (e) => {
    if (e.target.classList.contains("edital-topic-checkbox")) {
      const topicoId = parseInt(e.target.dataset.topicoId);
      const completed = e.target.checked;
      controller.toggleTopico(topicoId, completed);
    }
  });

  // Click anywhere on topic item to toggle checkbox
  document.addEventListener("click", (e) => {
    const topicItem = e.target.closest(".edital-topic-item");
    if (topicItem && !e.target.classList.contains("edital-topic-delete-btn")) {
      const checkbox = topicItem.querySelector(".edital-topic-checkbox");
      const label = topicItem.querySelector("label");

      // Se clicou no label, deixar ele fazer seu trabalho naturalmente
      if (e.target === label || label.contains(e.target)) {
        return;
      }

      // Se clicou em outro lugar do item (exceto checkbox e label), alterna o checkbox
      if (checkbox && e.target !== checkbox) {
        checkbox.click();
      }
    }
  });

  // Delete button
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("edital-topic-delete-btn")) {
      const topicoId = parseInt(e.target.dataset.topicoId);
      confirmToastController.confirm(
        "Tem certeza que deseja deletar este tópico?",
        async () => {
          await controller.deleteTopico(topicoId);
        },
        "Deletar Tópico",
      );
    }
  });

  // Add topic button
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("edital-add-topic-btn")) {
      const materiaId = parseInt(e.target.dataset.materiaId);
      const input = e.target.previousElementSibling;
      const topicoName = input.value;
      controller.addTopico(materiaId, topicoName);
      input.value = "";
      input.focus();
    }
  });

  // Enter key to add topic
  document.addEventListener("keypress", (e) => {
    if (
      e.target.classList.contains("edital-topic-input") &&
      e.key === "Enter"
    ) {
      const materiaId = parseInt(e.target.dataset.materiaId);
      const topicoName = e.target.value;
      controller.addTopico(materiaId, topicoName);
      e.target.value = "";
    }
  });

  // Initialize controller when screen is shown
  const screenEdital = document.getElementById("screen-edital");
  if (screenEdital) {
    const observer = new MutationObserver(async (mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          if (!screenEdital.classList.contains("hidden")) {
            controller.init();
          }
        }
      });
    });

    observer.observe(screenEdital, { attributes: true });
  }

  return controller;
}
