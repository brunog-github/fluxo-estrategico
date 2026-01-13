import {
  convertRestDaysToString,
  convertStringToRestDays,
} from "../utils/days-utils.js";

import {
  buildBackupData,
  saveBackupToFile,
  restoreBackup,
} from "../utils/backup-utils.js";

export class SettingsController {
  constructor(toast, confirmToast) {
    this.toast = toast;
    this.confirm = confirmToast;
    this.updateLastBackupUI();
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
      () => {
        localStorage.removeItem("studyCycle");
        localStorage.removeItem("restDays");
        localStorage.removeItem("theme");
        localStorage.removeItem("currentIndex");

        this.toast.showToast("success", "Configurações resetadas com sucesso!");
        location.reload();
      }
    );
  }

  // -----------------------------
  // NOVO MÉTODO: Atualiza a interface
  // -----------------------------
  updateLastBackupUI() {
    const displayEl = document.getElementById("last-backup-display");
    if (!displayEl) return;

    const lastDateISO = localStorage.getItem("lastBackupDate");

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
  exportBackupFile() {
    const data = buildBackupData();
    saveBackupToFile(data);

    // 2. Salva a data e hora atual no LocalStorage
    const now = new Date();
    localStorage.setItem("lastBackupDate", now.toISOString());

    // 3. Atualiza o texto na tela imediatamente
    this.updateLastBackupUI();

    this.toast.showToast("success", "Download do backup iniciado!");
  }

  // -----------------------------
  // Importação
  // -----------------------------
  importBackupFile(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const backup = JSON.parse(text);

        if (!backup.data) throw new Error("Backup inválido.");

        const date = new Date(backup.date).toLocaleDateString("pt-BR");

        this.confirm.confirm(
          `Backup de ${date} encontrado. Isso irá substituir todo o seu histórico e configurações. Continuar?`,
          () => {
            restoreBackup(backup);

            this.toast.showToast(
              "success",
              "Backup restaurado com sucesso! O app será recarregado."
            );
            window.location.reload();
          }
        );
      } catch (err) {
        console.error(err);
        this.toast.showToast(
          "error",
          "Arquivo inválido ou corrompido. Não foi possível importar."
        );
      } finally {
        input.value = "";
      }
    };

    reader.readAsText(file);
  }
}
