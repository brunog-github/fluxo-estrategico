export class ConfigUI {
  constructor(subjectsManager, toast) {
    this.subjectsManager = subjectsManager;
    this.sortableInstance = null;
    this.toast = toast;

    this.setupMobileLock();

    // Event delegation -> registrado APENAS UMA VEZ
    const list = document.getElementById("config-list");
    list.addEventListener("click", (e) => {
      // Botão de delete
      const deleteBtn = e.target.closest(".delete-subject");
      if (deleteBtn) {
        const checkbox = document.getElementById("mobile-lock-sort");
        // Se o checkbox existir e estiver marcado (Bloqueado)
        if (checkbox && checkbox.checked) {
          // Mostra aviso e cancela a exclusão
          this.toast.showToast(
            "warning",
            "Desbloqueie a lista para excluir matérias.",
          );
          return;
        }

        const li = deleteBtn.closest("li");
        const index = parseInt(li.dataset.index);

        this.subjectsManager.remove(index);
        this.toast.showToast("success", "Matéria removida!");

        this.renderList();
        return;
      }

      // Botão de duplicação
      const duplicateBtn = e.target.closest(".duplicate-subject");
      if (duplicateBtn) {
        const checkbox = document.getElementById("mobile-lock-sort");
        // Se o checkbox existir e estiver marcado (Bloqueado)
        if (checkbox && checkbox.checked) {
          // Mostra aviso e cancela a duplicação
          this.toast.showToast(
            "warning",
            "Desbloqueie a lista para duplicar matérias.",
          );
          return;
        }

        const li = duplicateBtn.closest("li");
        const index = parseInt(li.dataset.index);

        this.subjectsManager.duplicate(index);
        this.renderList();
      }
    });
  }

  /**
   * NOVO: Configura o checkbox de bloqueio
   */
  setupMobileLock() {
    const checkbox = document.getElementById("mobile-lock-sort");
    const list = document.getElementById("config-list");

    const savedState = localStorage.getItem("sortableLocked");
    const isLocked = savedState === "true";

    if (!checkbox) return;

    // Remove listeners antigos para evitar duplicação (boa prática)
    const newCheckbox = checkbox.cloneNode(true);
    checkbox.parentNode.replaceChild(newCheckbox, checkbox);

    newCheckbox.checked = isLocked; // Marca/Desmarca o switch

    if (isLocked) {
      list.classList.add("locked");
    } else {
      list.classList.remove("locked");
    }

    // Adiciona o listener no novo elemento
    newCheckbox.addEventListener("change", (e) => {
      const isLocked = e.target.checked;

      // Salva como string "true" ou "false"
      localStorage.setItem("sortableLocked", isLocked);

      // 1. Atualiza visual
      if (isLocked) list.classList.add("locked");
      else list.classList.remove("locked");

      // 2. Atualiza a instância do SortableJS EM TEMPO REAL
      if (this.sortableInstance) {
        // O SortableJS permite mudar opções dinamicamente assim:
        this.sortableInstance.option("disabled", isLocked);
      }
    });
  }

  renderList() {
    const list = document.getElementById("config-list");
    list.innerHTML = "";

    this.subjectsManager.subjects.forEach((subj, index) => {
      const li = document.createElement("li");
      li.dataset.index = index;
      li.dataset.name = subj;

      // Adiciona classe se for o subject atual
      if (index === this.subjectsManager.currentIndex) {
        li.classList.add("current-subject");
      }

      li.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="drag-handle">::</span>
          <div style="display:flex; flex-direction:column; gap:4px;">
            ${index === this.subjectsManager.currentIndex ? '<span class="current-subject-badge">Matéria Atual</span>' : ""}
            <span>${index + 1}. ${subj}</span>
          </div>
        </div>
        <div style="display:flex; gap:5px; align-items:center;">
          <button style="background:var(--primary-color); color:white; border:none; border-radius:5px; cursor:pointer; padding: 5px;" class="duplicate-subject" title="Duplicar Matéria">
            <i class="fa-regular fa-copy"></i>
          </button>
          <button style="background:red; color:white; border:none; border-radius:5px; cursor:pointer; padding: 5px;" class="delete-subject" title="Deletar Matéria">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      `;

      list.appendChild(li);
    });

    this.initSortable();
  }

  initSortable() {
    if (this.sortableInstance) return;

    const el = document.getElementById("config-list");
    const checkbox = document.getElementById("mobile-lock-sort");

    const startDisabled = checkbox ? checkbox.checked : false;

    this.sortableInstance = new Sortable(el, {
      handle: ".drag-handle",
      animation: 150,
      disabled: startDisabled,
      onEnd: () => this.updateOrder(),
    });
  }

  updateOrder() {
    const listItems = document.querySelectorAll("#config-list li");

    const newOrder = Array.from(listItems).map((li) => li.dataset.name);

    this.subjectsManager.reorder(newOrder);
    this.renderList();
  }
}
