import { supabaseService } from "../services/supabase/supabase-service.js";
import { dbService } from "../services/db/db-service.js";
import { BackupUI } from "../ui/backupUI.js";

export class BackupSyncController {
  constructor(toast) {
    this.toast = toast;
    this.ui = new BackupUI();
    this.isSyncing = false;
    this.syncCheckInterval = null;
    this.backupContainer = null; // Container para re-renderizar após logout
    this.headerButtonContainer = null; // Container do botão de sincronização no header
  }

  /**
   * Inicializar o controlador
   */
  async init() {
    await supabaseService.init();

    // Se usuário está autenticado, iniciar verificação periódica
    if (supabaseService.isAuthenticated()) {
      this.startPeriodicSync();
    }
  }

  /**
   * Enviar magic-link
   */
  async sendMagicLink(email) {
    try {
      const result = await supabaseService.sendMagicLink(email);

      if (result.success) {
        this.toast.showToast("success", result.message);
        //this.ui.showMagicLinkSent(email);
      } else {
        this.toast.showToast("error", `Erro: ${result.error}`);
      }

      return result;
    } catch (error) {
      console.error("Erro ao enviar magic-link:", error);
      this.toast.showToast("error", "Erro ao enviar magic-link");
      return { success: false };
    }
  }

  /**
   * Fazer logout
   */
  async logout() {
    try {
      const success = await supabaseService.logout();

      if (success) {
        this.toast.showToast("success", "Desconectado com sucesso");
        this.stopPeriodicSync();

        // ✅ Re-renderizar botão do header para "Offline"
        if (this.headerButtonContainer) {
          await this.ui.renderHeaderButton(this.headerButtonContainer, this);
        }

        // Re-renderizar painel com formulário de login
        if (this.backupContainer) {
          await this.ui.renderBackupPanel(this.backupContainer, this);
        }
      }

      return success;
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      this.toast.showToast("error", "Erro ao desconectar");
      return false;
    }
  }

  /**
   * Sincronizar backup agora
   */
  async syncBackupNow() {
    if (this.isSyncing) return;
    if (!supabaseService.isAuthenticated()) {
      this.toast.showToast("warning", "Faça login para sincronizar");
      return;
    }

    this.isSyncing = true;
    this.ui.setSyncButtonState("loading");

    try {
      // Obter dados para backup (SEM exportDate para comparação)
      const backupDataForHash = await this._gatherBackupDataForHash();

      // Verificar se há alterações (comparar apenas dados reais)
      const hasChanges = await supabaseService.hasChanges(backupDataForHash);

      if (!hasChanges) {
        this.toast.showToast("info", "Seu backup já está sincronizado");
        this.ui.setSyncButtonState("synced");
        this.isSyncing = false;
        return;
      }

      // Fazer upload do backup (com exportDate)
      const backupDataForUpload = await this._gatherBackupData();
      // IMPORTANTE: Passar dados para hash (sem exportDate) E dados para upload (com exportDate)
      const result = await supabaseService.uploadBackup(
        backupDataForHash,
        backupDataForUpload,
      );

      this.toast.showToast("success", "Backup sincronizado com sucesso!");
      this.ui.setSyncButtonState("synced");

      // Atualizar último timestamp de sync no IndexedDB
      await dbService.setSetting("lastBackupSync", new Date().toISOString());
    } catch (error) {
      console.error("Erro ao sincronizar backup:", error);
      this.toast.showToast("error", `Erro ao sincronizar: ${error.message}`);
      this.ui.setSyncButtonState("error");
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Verificar status de sincronização
   */
  async checkSyncStatus() {
    if (!supabaseService.isAuthenticated()) {
      console.log("[BACKUP] Usuário não autenticado");
      this.ui.setSyncButtonState("offline");
      return;
    }

    try {
      console.log("[BACKUP] Coletando dados para verificação...");
      // Usar dados SEM exportDate para comparação de hash
      const backupDataForHash = await this._gatherBackupDataForHash();
      console.log("[BACKUP] Dados coletados:", {
        subjects: backupDataForHash.data.subjects?.length || 0,
        history: backupDataForHash.data.history?.length || 0,
        categories: backupDataForHash.data.categories?.length || 0,
      });

      // Comparar hash dos dados reais (sem exportDate)
      const hasChanges = await supabaseService.hasChanges(backupDataForHash);
      console.log("[BACKUP] Tem mudanças?", hasChanges);

      // APENAS ATUALIZAR ESTADO VISUAL - NÃO SINCRONIZAR AUTOMATICAMENTE
      if (hasChanges) {
        console.log("[BACKUP] Status: Tem mudanças não sincronizadas");
        this.ui.setSyncButtonState("needsSync");
      } else {
        console.log("[BACKUP] Status: Sincronizado");
        this.ui.setSyncButtonState("synced");
      }
    } catch (error) {
      console.error(
        "[BACKUP] Erro ao verificar status de sincronização:",
        error,
      );
      this.ui.setSyncButtonState("error");
    }
  }

  /**
   * Iniciar verificação periódica de sincronização (DESABILITADO - verificação ocorre ao chegar na home-screen)
   */
  startPeriodicSync() {
    // ✅ Verificação agora ocorre automaticamente quando o usuário chega na home-screen
    // Isso evita verificações desnecessárias e melhora performance
    // Se precisar de fallback (para trocas de dados em outra aba), pode descomentar:
    // this.syncCheckInterval = setInterval(() => {
    //   this.checkSyncStatus();
    // }, 30000);
  }

  /**
   * Parar verificação periódica
   */
  stopPeriodicSync() {
    if (this.syncCheckInterval) {
      clearInterval(this.syncCheckInterval);
      this.syncCheckInterval = null;
    }
  }

  /**
   * Obter histórico de backups
   */
  async getBackupHistory() {
    if (!supabaseService.isAuthenticated()) {
      this.toast.showToast("warning", "Faça login para ver o histórico");
      return [];
    }

    try {
      const history = await supabaseService.getBackupHistory();
      return history;
    } catch (error) {
      console.error("Erro ao obter histórico:", error);
      this.toast.showToast("error", "Erro ao obter histórico de backups");
      return [];
    }
  }

  /**
   * Restaurar um backup anterior
   */
  async restoreBackup(fileName) {
    if (!supabaseService.isAuthenticated()) {
      this.toast.showToast("warning", "Faça login para restaurar");
      return false;
    }

    try {
      const backupData = await supabaseService.restoreBackup(fileName);

      if (
        confirm(
          "Tem certeza que deseja restaurar este backup? Os dados atuais serão substituídos.",
        )
      ) {
        await this._restoreBackupData(backupData);
        this.toast.showToast("success", "Backup restaurado com sucesso!");
        location.reload();
        return true;
      }

      return false;
    } catch (error) {
      console.error("Erro ao restaurar backup:", error);
      this.toast.showToast("error", `Erro ao restaurar: ${error.message}`);
      return false;
    }
  }

  /**
   * Coletar APENAS os dados reais (sem timestamps) para comparação de hash
   * Importante: Sem exportDate ou outros campos variáveis!
   */
  async _gatherBackupDataForHash() {
    try {
      const [
        categories,
        subjects,
        history,
        notes,
        achievements,
        settings,
        theme,
        restDays,
      ] = await Promise.all([
        dbService.getCategories(),
        dbService.getSubjects(),
        dbService.getHistory(),
        dbService.getNotes(),
        dbService.getUnlockedAchievements(),
        dbService.getAllSettings(),
        dbService.getTheme(),
        dbService.getRestDays(),
      ]);

      // ✅ IMPORTANTE: Remover campos internos que NÃO devem ser inclusos no backup
      const cleanSettings = { ...settings };
      delete cleanSettings.lastBackupSync; // Campo interno de sincronização

      // ✅ IMPORTANTE: Normalizar subjects (extrair apenas nomes)
      const subjectsNormalized = subjects.map((s) => s.name || s);

      // Retornar APENAS dados, sem campos variáveis e sem duplicatas
      return {
        version: "2.0",
        data: {
          categories: categories || [],
          subjects: subjectsNormalized || [], // ✅ NORMALIZADO
          history: history || [],
          notes: notes || [],
          achievements: achievements || [],
          settings: cleanSettings || {}, // ✅ SEM theme e restDays (já removidos)
          // ❌ NÃO incluir theme e restDays aqui pois já estão em settings
        },
      };
    } catch (error) {
      console.error("Erro ao coletar dados para hash:", error);
      throw error;
    }
  }

  /**
   * Coletar dados para backup (similar ao backup-utils.js)
   */
  async _gatherBackupData() {
    try {
      // Usar dados de hash como base
      const backupDataForHash = await this._gatherBackupDataForHash();

      // Adicionar exportDate apenas no backup que será enviado
      return {
        ...backupDataForHash,
        exportDate: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Erro ao coletar dados para backup:", error);
      throw error;
    }
  }

  /**
   * Restaurar dados de um backup
   */
  async _restoreBackupData(backupData) {
    try {
      const { data } = backupData;

      if (data.categories && data.categories.length > 0) {
        await dbService.clearCategories();
        for (const cat of data.categories) {
          await dbService.addCategory(cat.name || cat);
        }
      }

      if (data.subjects && data.subjects.length > 0) {
        await dbService.clearSubjects();
        // ✅ IMPORTANTE: subjects já é um array de strings, não objetos
        await dbService.addSubjects(data.subjects);
      }

      if (data.history && data.history.length > 0) {
        await dbService.clearHistory();
        await dbService.addHistoryEntries(data.history);
      }

      if (data.notes && data.notes.length > 0) {
        await dbService.clearNotes();
        await dbService.addNotes(data.notes);
      }

      if (data.achievements && data.achievements.length > 0) {
        await dbService.clearAchievements();
        for (const ach of data.achievements) {
          await dbService.unlockAchievement(ach.achievementId || ach);
        }
      }

      // ✅ IMPORTANTE: Restaurar settings (que contém theme e restDays)
      if (data.settings) {
        // Restaurar configurações
        for (const [key, value] of Object.entries(data.settings)) {
          if (key !== "lastBackupSync") {
            await dbService.setSetting(key, value);
          }
        }

        // Restaurar theme e restDays que podem estar em settings
        if (data.settings.theme) {
          await dbService.setTheme(data.settings.theme);
        }
        if (data.settings.restDays && Array.isArray(data.settings.restDays)) {
          await dbService.setRestDays(data.settings.restDays);
        }
      }

      // Fallback: se theme não estiver em settings, usar valor separado (compatibilidade com backups antigos)
      if (data.theme && !data.settings?.theme) {
        await dbService.setTheme(data.theme);
      }

      // Fallback: se restDays não estiver em settings, usar valor separado (compatibilidade com backups antigos)
      if (data.restDays && !data.settings?.restDays) {
        await dbService.setRestDays(data.restDays);
      }
    } catch (error) {
      console.error("Erro ao restaurar dados:", error);
      throw error;
    }
  }
}
