import { supabaseService } from "../services/supabase/supabase-service.js";
import { dbService } from "../services/db/db-service.js";
import { BackupUI } from "../ui/backupUI.js";

export class BackupSyncController {
  constructor(toast, confirmToast) {
    this.toast = toast;
    this.confirm = confirmToast;
    this.ui = new BackupUI(confirmToast);
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
   * Enviar OTP
   */
  async sendOTP(email) {
    try {
      const result = await supabaseService.sendOTP(email);

      if (result.success) {
        this.toast.showToast("success", result.message, 8000);
      } else {
        // ✅ Mensagem customizada para rate limit
        let errorMsg = result.error || "Erro ao enviar código";
        if (result.error?.includes("rate limit")) {
          errorMsg =
            "Muitas tentativas. Aguarde 60 segundos antes de tentar novamente.";
        }
        this.toast.showToast("error", errorMsg);
      }

      return result;
    } catch (error) {
      console.error("Erro ao enviar OTP:", error);
      this.toast.showToast("error", "Erro ao enviar código");
      return { success: false, error: error.message };
    }
  }

  /**
   * Verificar OTP
   */
  async verifyOTP(email, token) {
    try {
      const result = await supabaseService.verifyOTP(email, token);

      if (result.success) {
        this.toast.showToast("success", result.message, 3000);
      } else {
        this.toast.showToast("error", result.error || "Código inválido");
      }

      return result;
    } catch (error) {
      console.error("Erro ao verificar OTP:", error);
      this.toast.showToast("error", "Erro ao verificar código");
      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar magic-link (DEPRECATED - usar sendOTP em vez disso)
   * @deprecated Use sendOTP() instead
   */
  async sendMagicLink(email) {
    // Redirecionar para novo método
    return this.sendOTP(email);
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

        // ✅ Atualizar botão para "offline" imediatamente
        this.ui.setSyncButtonState("offline");

        // ✅ Re-renderizar botão do header com estado offline
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
      // ✅ NOVO: Verificar se há backup mais recente no Supabase
      const newerBackupStatus = supabaseService.getNewerBackupStatus();
      if (newerBackupStatus.available) {
        // Há backup mais recente - perguntar se quer restaurar
        const wantRestore = await this.ui.showRestoreConfirmation(
          this,
          newerBackupStatus.info,
        );

        if (wantRestore) {
          const backupData = await supabaseService.downloadAndRestoreBackup(
            newerBackupStatus.info.file_name,
          );

          // Aplicar backup aos dados locais
          await this._restoreBackupData(backupData);

          // ✅ NOVO: Atualizar hash local após restaurar para evitar falsas mudanças
          const restoredBackupDataForHash =
            await this._gatherBackupDataForHash();
          const restoredHash = supabaseService._generateHash(
            JSON.stringify(restoredBackupDataForHash),
          );
          const lastBackupSync = JSON.parse(
            localStorage.getItem("last_backup_sync") || "{}",
          );
          localStorage.setItem(
            "last_backup_sync",
            JSON.stringify({
              ...lastBackupSync,
              hash: restoredHash,
            }),
          );

          this.toast.showToast("success", "Dados atualizados com sucesso!");
          this.ui.setSyncButtonState("synced");
          this.ui.showUpdateBanner(null); // Remover banner
          this.isSyncing = false;

          // ✅ NOVO: Recarregar a página após restaurar para atualizar dados
          setTimeout(() => {
            window.location.reload();
          }, 1000);

          return;
        } else {
          // Usuário não quis restaurar, mas continua com sincronização
        }
      }

      // Obter dados para backup (SEM exportDate para comparação)
      const backupDataForHash = await this._gatherBackupDataForHash();

      // ✅ NOVO: Verificar se há mudanças locais que vão sobrescrever o servidor
      const hasLocalChanges =
        await supabaseService.hasLocalChanges(backupDataForHash);

      // Se há mudanças locais e havia backup mais recente, avisar
      if (hasLocalChanges && newerBackupStatus.available) {
        const confirmed = await this.ui.showOverwriteConfirmation();
        if (!confirmed) {
          this.ui.setSyncButtonState("needsSync");
          this.isSyncing = false;
          return;
        }
      }

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
      this.ui.setSyncButtonState("offline");
      return;
    }

    try {
      // Usar dados SEM exportDate para comparação de hash
      const backupDataForHash = await this._gatherBackupDataForHash();

      // ✅ NOVO: Verificar se há backup mais recente no Supabase
      const newerBackupStatus = supabaseService.getNewerBackupStatus();
      if (newerBackupStatus.available) {
        this.ui.setSyncButtonState("needsSync");
        // Mostrar banner indicando atualização disponível
        this.ui.showUpdateBanner(newerBackupStatus.info);
        return;
      }

      // Comparar hash dos dados reais (sem exportDate)
      const hasChanges = await supabaseService.hasChanges(backupDataForHash);

      // APENAS ATUALIZAR ESTADO VISUAL - NÃO SINCRONIZAR AUTOMATICAMENTE
      if (hasChanges) {
        this.ui.setSyncButtonState("needsSync");
      } else {
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

      // ✅ Usar confirmController ao invés de alert do navegador
      this.confirm.confirm(
        "Tem certeza que deseja restaurar este backup? Os dados atuais serão substituídos.",
        async () => {
          await this._restoreBackupData(backupData);
          this.toast.showToast("success", "Backup restaurado com sucesso!");
          location.reload();
        },
      );

      return true;
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
        editais,
        editalMaterias,
        editalTopicos,
      ] = await Promise.all([
        dbService.getCategories(),
        dbService.getSubjects(),
        dbService.getHistory(),
        dbService.getNotes(),
        dbService.getUnlockedAchievements(),
        dbService.getAllSettings(),
        dbService.getTheme(),
        dbService.getRestDays(),
        dbService.getEditais(),
        dbService.getAllEditalMaterias(),
        dbService.getAllEditalTopicos(),
      ]);

      // ✅ IMPORTANTE: Remover campos internos que NÃO devem ser inclusos no backup
      const cleanSettings = { ...settings };
      delete cleanSettings.lastBackupSync; // Campo interno de sincronização
      delete cleanSettings.lastBackupDate; // Campo local - não sincronizar com Supabase

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
          editais: editais || [],
          editalMaterias: editalMaterias || [],
          editalTopicos: editalTopicos || [],
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

      // ✅ NOVO: Restaurar editais e seus dados relacionados
      if (data.editais && data.editais.length > 0) {
        await dbService.importAll({ editais: data.editais });
      }

      if (data.editalMaterias && data.editalMaterias.length > 0) {
        await dbService.importAll({ editalMaterias: data.editalMaterias });
      }

      if (data.editalTopicos && data.editalTopicos.length > 0) {
        await dbService.importAll({ editalTopicos: data.editalTopicos });
      }
    } catch (error) {
      console.error("Erro ao restaurar dados:", error);
      throw error;
    }
  }
}
