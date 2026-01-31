import {
  convertRestDaysToString,
  convertStringToRestDays,
} from "../utils/days-utils.js";

import {
  buildBackupData,
  saveBackupToFile,
  restoreBackup,
  decompressBackupGzip,
} from "../utils/backup-utils.js";

import {
  CATEGORY_COLORS,
  getCategoryColor,
  getDefaultCategories,
  isDefaultCategory,
  COLOR_PALETTE,
  getCustomCategoryColors,
  setCustomCategoryColor,
  removeCustomCategoryColor,
} from "../utils/category-colors.js";

import { dbService } from "../services/db/db-service.js";

export class SettingsController {
  constructor(toast, confirmToast) {
    this.toast = toast;
    this.confirm = confirmToast;
  }

  async init() {
    await this.updateLastBackupUI();
    await this.loadDefaultCategories();
  }

  // Default categories - categorias fixas
  async loadDefaultCategories() {
    const categories = await dbService.getCategories();
    const defaultCats = getDefaultCategories();

    // Se não há categorias no DB, adicionar as padrões
    if (categories.length === 0) {
      await dbService.addCategories(defaultCats);
    }
  }

  async getCategories() {
    const categoriesData = await dbService.getCategories();
    return categoriesData.map((c) => c.name || c);
  }

  getFixedCategories() {
    return getDefaultCategories();
  }

  async getCustomCategories() {
    const all = await this.getCategories();
    const fixed = this.getFixedCategories();
    return all.filter((cat) => !fixed.includes(cat));
  }

  async renderCategories() {
    const fixedContainer = document.getElementById("fixed-categories-list");
    const customContainer = document.getElementById("custom-categories-list");

    if (!fixedContainer && !customContainer) return;

    const fixed = this.getFixedCategories();
    const custom = await this.getCustomCategories();

    // Renderizar categorias fixas
    if (fixedContainer) {
      fixedContainer.innerHTML = "";
      const fixedItems = await Promise.all(
        fixed.map((cat) => this.createCategoryItem(cat, true)),
      );
      fixedItems.forEach((item) => fixedContainer.appendChild(item));
    }

    // Renderizar categorias personalizadas
    if (customContainer) {
      customContainer.innerHTML = "";
      const customItems = await Promise.all(
        custom.map((cat, idx) => this.createCategoryItem(cat, false, idx)),
      );
      customItems.forEach((item) => customContainer.appendChild(item));
    }
  }

  async createCategoryItem(category, isFixed, index = 0) {
    const item = document.createElement("div");
    item.className = "category-item";

    const color = await getCategoryColor(category);
    item.style.borderLeftColor = color;

    // Nome da categoria
    const nameDiv = document.createElement("div");
    nameDiv.className = "category-name";

    const colorDot = document.createElement("div");
    colorDot.className = "category-color-dot";
    colorDot.style.backgroundColor = color;
    colorDot.style.cursor = "pointer";
    colorDot.title = "Clique para mudar a cor";

    // Evento de clique para abrir seletor de cores
    if (!isFixed) {
      colorDot.addEventListener("click", async (e) => {
        e.stopPropagation();
        await this.openColorPicker(category, colorDot);
      });
    }

    const label = document.createElement("span");
    label.textContent = category;

    nameDiv.appendChild(colorDot);
    nameDiv.appendChild(label);

    // Badge (para categorias fixas)
    if (isFixed) {
      const badge = document.createElement("span");
      badge.className = "category-badge";
      badge.textContent = "FIXA";
      nameDiv.appendChild(badge);
    }

    item.appendChild(nameDiv);

    // Botão de remover (apenas para personalizadas)
    if (!isFixed) {
      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-category-btn";
      removeBtn.textContent = "✕";
      removeBtn.addEventListener("click", () => this.removeCategory(index));
      item.appendChild(removeBtn);
    }

    return item;
  }

  async openColorPicker(category, colorDot) {
    // Remove picker anterior se existir
    const existingPicker = document.getElementById("color-picker-modal");
    if (existingPicker) existingPicker.remove();

    // Obter cor atual da categoria
    const currentColor = await getCategoryColor(category);

    const modal = document.createElement("div");
    modal.id = "color-picker-modal";
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 16px;
    `;

    const container = document.createElement("div");
    container.style.cssText = `
      background: var(--card-bg);
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      max-width: 400px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
    `;

    const title = document.createElement("h3");
    title.textContent = `Escolha a cor para "${category}"`;
    title.style.cssText = `
      margin: 0 0 20px 0;
      color: var(--text-color);
      font-size: 16px;
      font-weight: 600;
    `;
    container.appendChild(title);

    // Grid de cores
    const colorGrid = document.createElement("div");
    colorGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(50px, 1fr));
      gap: 10px;
      margin-bottom: 20px;
      justify-items: center;
    `;

    COLOR_PALETTE.forEach((hexColor) => {
      const colorBtn = document.createElement("button");
      colorBtn.style.cssText = `
        width: 60px;
        height: 60px;
        border-radius: 50%;
        border: 3px solid transparent;
        background: ${hexColor};
        cursor: pointer;
        transition: all 0.2s;
      `;

      // Destaca a cor atual
      if (currentColor === hexColor) {
        colorBtn.style.borderColor = "var(--text-color)";
        colorBtn.style.transform = "scale(1.15)";
      }

      colorBtn.addEventListener("click", async () => {
        await setCustomCategoryColor(category, hexColor);
        colorDot.style.backgroundColor = hexColor;
        modal.remove();
        this.toast.showToast("success", `Cor atualizada para "${category}"`);
      });

      colorBtn.addEventListener("mouseover", () => {
        colorBtn.style.transform = "scale(1.1)";
      });

      colorBtn.addEventListener("mouseout", () => {
        if (currentColor !== hexColor) {
          colorBtn.style.transform = "scale(1)";
        }
      });

      colorGrid.appendChild(colorBtn);
    });

    container.appendChild(colorGrid);

    // Botões
    const buttonContainer = document.createElement("div");
    buttonContainer.style.cssText = `
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    `;

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancelar";
    cancelBtn.style.cssText = `
      padding: 10px 16px;
      border: 1px solid var(--border-color);
      background: transparent;
      color: var(--text-color);
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    `;
    cancelBtn.addEventListener("click", () => modal.remove());
    buttonContainer.appendChild(cancelBtn);

    container.appendChild(buttonContainer);
    modal.appendChild(container);
    document.body.appendChild(modal);

    // Fechar ao clicar fora
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  async addCategory() {
    const input = document.getElementById("new-category-input");
    if (!input) return;

    const name = input.value.trim();
    if (!name) {
      this.toast.showToast("warning", "Digite um nome para a categoria");
      return;
    }

    const categories = await this.getCategories();
    if (categories.some((c) => c.toLowerCase() === name.toLowerCase())) {
      this.toast.showToast("warning", "Esta categoria já existe");
      return;
    }

    await dbService.addCategory(name);
    input.value = "";
    await this.renderCategories();
    this.toast.showToast("success", "Categoria adicionada!");
  }

  async removeCategory(idx) {
    const custom = await this.getCustomCategories();
    if (idx < 0 || idx >= custom.length) return;

    const categoryToRemove = custom[idx];
    const all = await this.getCategories();
    const filtered = all.filter((cat) => cat !== categoryToRemove);

    // Encontrar o ID da categoria para deletar
    const categoriesData = await dbService.getCategories();
    const categoryObj = categoriesData.find(
      (c) => (c.name || c) === categoryToRemove,
    );

    if (categoryObj && categoryObj.id) {
      await dbService.deleteCategory(categoryObj.id);
    }

    // Remove a cor personalizada se existir
    await removeCustomCategoryColor(categoryToRemove);

    await this.renderCategories();
    this.toast.showToast(
      "success",
      `Categoria "${categoryToRemove}" removida!`,
    );
  }

  // -----------------------------
  // Trigger input
  // -----------------------------
  triggerImportConfig() {
    document.getElementById("backup-upload").click();
  }

  // -----------------------------
  // Reset configuração
  // -----------------------------
  clearConfig() {
    this.confirm.confirm(
      "Isso irá remover todas as suas configurações, tem certeza disso?",
      async () => {
        await dbService.clearSubjects();
        await dbService.setRestDays([]);
        await dbService.setTheme("light");
        await dbService.setCurrentIndex(0);
        await dbService.clearCategories();
        // Recarregar categorias padrões
        await this.loadDefaultCategories();

        this.toast.showToast("success", "Configurações resetadas com sucesso!");
        location.reload();
      },
    );
  }

  // -----------------------------
  // NOVO MÉTODO: Atualiza a interface
  // -----------------------------
  async updateLastBackupUI() {
    const displayEl = document.getElementById("last-backup-display");
    if (!displayEl) return;

    const lastDateISO = await dbService.getLastBackupDate();

    if (lastDateISO) {
      const date = new Date(lastDateISO);
      // Formata para o padrão brasileiro: DD/MM/AAAA HH:MM
      const dateStr = date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      displayEl.textContent = `Último backup: ${dateStr}`;
    } else {
      displayEl.textContent = "Último backup: Nunca realizado";
    }
  }

  // -----------------------------
  // Exportação
  // -----------------------------
  async exportBackupFile() {
    // Valida se há dados para fazer backup
    const studyHistory = await dbService.getHistory();
    const studyCycle = await dbService.getSubjects();

    if (studyHistory.length === 0 && studyCycle.length === 0) {
      this.toast.showToast(
        "warning",
        "Nada para fazer backup! Adicione matérias ou histórico.",
      );
      return;
    }

    const data = await buildBackupData();
    saveBackupToFile(data);

    // 2. Salva a data e hora atual no IndexedDB
    const now = new Date();
    await dbService.setLastBackupDate(now.toISOString());

    // 3. Atualiza o texto na tela imediatamente
    await this.updateLastBackupUI();

    this.toast.showToast("success", "Download do backup iniciado!");
  }

  // -----------------------------
  // Importação
  // -----------------------------
  importBackupFile(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        let backup;

        // Detectar se é arquivo comprimido ou JSON
        if (file.name.endsWith(".gz") || file.type === "application/gzip") {
          // Arquivo comprimido com gzip - usar função utilitária
          const uint8Array = new Uint8Array(e.target.result);
          backup = await decompressBackupGzip(uint8Array);
        } else {
          // Arquivo JSON simples (retrocompatibilidade)
          const text = e.target.result;
          backup = JSON.parse(text);
        }

        if (!backup.data) throw new Error("Backup inválido.");

        const date = new Date(backup.date).toLocaleDateString("pt-BR");

        // Verificar se há dados existentes
        const existingHistory = await dbService.getHistory();
        const existingSubjects = await dbService.getSubjects();
        const hasExistingData =
          existingHistory.length > 0 || existingSubjects.length > 0;

        this.confirm.confirm(
          `Backup de ${date} encontrado. Isso irá substituir todo o seu histórico e configurações. Continuar?`,
          async () => {
            try {
              // Se há dados existentes, limpar apenas as tabelas que têm risco de duplicatas
              if (hasExistingData) {
                await dbService.clearSubjects();
                await dbService.clearHistory();
                await dbService.clearNotes();
                await dbService.clearCategories();
                await dbService.clearAchievements();
              }

              await restoreBackup(backup);

              this.toast.showToast(
                "success",
                "Backup restaurado com sucesso! O app será recarregado.",
              );
              window.location.reload();
            } catch (restoreErr) {
              console.error("Erro ao restaurar backup:", restoreErr);
              this.toast.showToast(
                "error",
                "Erro ao restaurar backup. Tente novamente.",
              );
            }
          },
        );
      } catch (err) {
        console.error(err);
        this.toast.showToast(
          "error",
          "Arquivo inválido ou corrompido. Não foi possível importar.",
        );
      } finally {
        input.value = "";
      }
    };

    // Ler como ArrayBuffer para suportar gzip
    if (file.name.endsWith(".gz") || file.type === "application/gzip") {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  }

  async renderEditaisSummary() {
    const { EditaisSummaryUI } = await import("../ui/editais-summaryUI.js");
    await EditaisSummaryUI.render();
  }
}
