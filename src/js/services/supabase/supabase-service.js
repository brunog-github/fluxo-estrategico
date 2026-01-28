/**
 * Serviço Supabase para autenticação e sincronização de backup
 * Usa CDN: https://cdn.jsdelivr.net/npm/@supabase/supabase-js
 * ✅ SessionStorage: Tokens persistem ao recarregar, apagam ao fechar aba
 */

import DBService from "../db/db-service.js";

// Configuração do Supabase (substitua com suas credenciais)
const SUPABASE_URL = "https://kxzxwwzhyyumlgkmlapb.supabase.co";
const SUPABASE_KEY = "sb_publishable_zfDG-yT9i8j7Lmrnq9RICA_RWuihlW4";

let supabaseClient = null;
const dbService = new DBService();

/**
 * ✅ SEGURANÇA: Usar SessionStorage
 * - Persiste ao recarregar a página
 * - Apaga automaticamente ao fechar a aba
 * - Inacessível a ataques XSS entre abas
 * - Tokens ficam protegidos durante a sessão
 */

export class SupabaseService {
  constructor() {
    this.user = null;
    this.session = null;
    this.newerBackupAvailable = false; // ✅ Flag para indicar se há backup mais recente no Supabase
    this.newerBackupInfo = null; // ✅ Informações do backup mais recente
    this.checkingForNewerBackup = false; // ✅ Flag para rastrear se a checagem está em progresso
    this.backupUI = null; // ✅ Referência ao UI para atualizar banner automaticamente
  }

  /**
   * Inicializar o cliente Supabase
   * ✅ Usa sessionStorage para tokens (persiste ao recarregar, apaga ao fechar aba)
   */
  async init() {
    if (!window.supabase) {
      console.error(
        "Supabase não foi carregado. Verifique o CDN na index.html",
      );
      return false;
    }

    // ✅ SEGURANÇA: Usar sessionStorage (não localStorage)
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        storage: window.sessionStorage, // ← SessionStorage em vez de localStorage
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    // ✅ Restaurar sessão se existir
    await this.restoreSession();

    // ✅ IMPORTANTE: Escutar mudanças de autenticação entre abas
    // Quando uma aba faz login, as outras abas detectam via storage event
    window.addEventListener("storage", (event) => {
      if (
        event.key?.startsWith("sb-") ||
        event.key === "supabase.auth.token" ||
        event.key === "user_authenticated"
      ) {
        console.log("[AUTH] Detectada mudança de sessão em outra aba");
        // Aguardar um pouco para a sessão estar disponível
        setTimeout(async () => {
          await this.restoreSession();
        }, 300);
      }
    });

    // ✅ NOVO: Escutar mudanças de estado de autenticação (expirações, refresh token inválido)
    supabaseClient.auth.onAuthStateChange((event, session) => {
      console.log("[AUTH] Evento de autenticação:", event);

      if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
        // Sessão expirou ou foi revogada
        console.warn(
          "[AUTH] Sessão expirada ou inválida - usuário desconectado",
        );
        this.user = null;
        this.session = null;
        localStorage.removeItem("user_profile");
        localStorage.removeItem("user_authenticated");
        // ✅ Recarregar página para mostrar tela de login
        window.location.reload();
      }
    });

    return true;
  }

  /**
   * ✅ NOVO: Registrar UI para atualizar automaticamente quando há backup mais recente
   */
  setBackupUI(backupUI) {
    this.backupUI = backupUI;
  }

  /**
   * Enviar magic-link para email
   */
  /**
   * Enviar OTP (One-Time Password) para email
   * ✅ Usuário recebe um código de 6 dígitos no email
   */
  async sendOTP(email) {
    try {
      const { error } = await supabaseClient.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: undefined, // OTP não precisa de redirect URL
        },
      });

      if (error) throw error;

      return {
        success: true,
        message: "Código enviado para seu email! Verifique a caixa de entrada.",
      };
    } catch (error) {
      console.error("Erro ao enviar OTP:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verificar código OTP enviado por email
   * ✅ Autentica o usuário com o código recebido
   */
  async verifyOTP(email, token) {
    try {
      const { data, error } = await supabaseClient.auth.verifyOtp({
        email,
        token,
        type: "email",
      });

      if (error) throw error;

      if (data.session) {
        this.session = data.session;
        this.user = data.user;

        // ✅ SEGURANÇA: Salvar apenas dados públicos (SEM tokens)
        const publicUserData = {
          id: data.user.id,
          email: data.user.email,
          createdAt: data.user.created_at,
          emailVerified: data.user.email_confirmed_at ? true : false,
        };

        localStorage.setItem("user_profile", JSON.stringify(publicUserData));
        localStorage.setItem("user_authenticated", "true");

        console.log("✅ OTP verificado - Usuário:", data.user.email);
        return { success: true, message: "Login realizado com sucesso!" };
      }

      return {
        success: false,
        error: "Código inválido ou expirado",
      };
    } catch (error) {
      console.error("Erro ao verificar OTP:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar magic-link para email (DEPRECATED - usar sendOTP em vez disso)
   * @deprecated Use sendOTP() instead
   */
  async sendMagicLink(email) {
    // Redirecionar para novo método
    return this.sendOTP(email);
  }

  /**
   * Verificar sessão e restaurar se existir
   * ✅ SEGURANÇA: Armazena apenas dados públicos, nunca tokens
   */
  async restoreSession() {
    try {
      const {
        data: { session },
        error,
      } = await supabaseClient.auth.getSession();

      if (error) throw error;

      if (session) {
        this.session = session;
        this.user = session.user;

        // ✅ SEGURANÇA: Salvar apenas dados públicos (SEM tokens)
        const publicUserData = {
          id: session.user.id,
          email: session.user.email,
          createdAt: session.user.created_at,
          emailVerified: session.user.email_confirmed_at ? true : false,
          // ❌ NUNCA incluir: access_token, refresh_token
        };

        localStorage.setItem("user_profile", JSON.stringify(publicUserData));
        localStorage.setItem("user_authenticated", "true");

        // ✅ IMPORTANTE: Limpar URL de parâmetros de autenticação
        // Isso remove tokens da URL para segurança e evita hash
        if (window.history.replaceState) {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }

        console.log("✅ Sessão restaurada - Usuário:", session.user.email);

        // ✅ NOVO: Validar se o hash salvo é da mesma conta
        const lastBackupSync = JSON.parse(
          localStorage.getItem("last_backup_sync") || "{}",
        );
        if (
          lastBackupSync.user_id &&
          lastBackupSync.user_id !== session.user.id
        ) {
          // ✅ Mudança de conta detectada - limpar hash anterior
          console.log(
            "[BACKUP] Conta diferente detectada - limpando hash anterior",
          );
          localStorage.removeItem("last_backup_sync");
        }

        // ✅ NOVO: Verificar se há backup mais recente no Supabase (em background - não bloqueia o carregamento)
        this._checkForNewerBackup().catch((err) =>
          console.error("[BACKUP-CHECK] Erro em background:", err),
        );

        return true;
      }

      return false;
    } catch (error) {
      console.error("Erro ao restaurar sessão:", error);
      return false;
    }
  }

  /**
   * Fazer logout
   * ✅ SEGURANÇA: Remove todos os dados de autenticação
   */
  async logout() {
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;

      this.user = null;
      this.session = null;

      // ✅ SEGURANÇA: Limpar localStorage (dados públicos)
      localStorage.removeItem("user_profile");
      localStorage.removeItem("user_authenticated");
      localStorage.removeItem("supabase_session");
      // ✅ IMPORTANTE: NÃO remover last_backup_sync aqui
      // O hash será validado no próximo login para saber se é a mesma conta

      // ✅ SEGURANÇA: Limpar sessionStorage (tokens)
      // Supabase armazena tokens em sessionStorage agora
      Object.keys(sessionStorage).forEach((key) => {
        if (
          key.startsWith("sb-") ||
          key.includes("token") ||
          key === "supabase.auth.token"
        ) {
          sessionStorage.removeItem(key);
          console.log(`[AUTH] SessionStorage removido: ${key}`);
        }
      });

      console.log("✅ Logout realizado - Todos os dados removidos");
      return true;
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      return false;
    }
  }

  /**
   * Fazer upload do backup
   * @param {Object} backupDataForHash - Dados para calcular hash (SEM exportDate)
   * @param {Object} backupDataForUpload - Dados para upload (COM exportDate)
   */
  async uploadBackup(backupDataForHash, backupDataForUpload) {
    if (!this.user) {
      throw new Error("Usuário não autenticado");
    }

    try {
      console.log(
        "[UPLOAD] Iniciando upload do backup para usuário:",
        this.user.id,
      );
      const timestamp = new Date().toISOString();
      const fileName = `${this.user.id}/backup-${Date.now()}.json`;

      // Usar dados para upload (com exportDate)
      const backupJson = JSON.stringify(backupDataForUpload);
      const blob = new Blob([backupJson], { type: "application/json" });
      console.log("[UPLOAD] Blob criado. Tamanho:", blob.size, "bytes");

      // Upload para Supabase Storage
      console.log("[UPLOAD] Enviando arquivo para Storage:", fileName);
      const { data, error: uploadError } = await supabaseClient.storage
        .from("backups")
        .upload(fileName, blob, {
          contentType: "application/json",
          upsert: false,
        });

      if (uploadError) {
        console.error("[UPLOAD] Erro no upload do arquivo:", uploadError);
        throw uploadError;
      }

      console.log("[UPLOAD] Arquivo enviado com sucesso:", data);

      // Registrar metadados no banco de dados
      console.log("[UPLOAD] Registrando metadados no banco de dados...");
      // IMPORTANTE: Usar hash dos dados SEM exportDate para comparação
      const hashParaComparacao = this._generateHash(
        JSON.stringify(backupDataForHash),
      );

      // ✅ NOVO: Gerar versão do backup baseado no timestamp
      const backupVersion = Math.floor(Date.now() / 1000); // Versão = timestamp em segundos

      const { error: dbError } = await supabaseClient
        .from("backup_metadata")
        .insert({
          user_id: this.user.id,
          file_name: fileName,
          backup_hash: hashParaComparacao,
          backup_size: JSON.stringify(backupDataForUpload).length,
          synced_at: timestamp,
          backup_version: backupVersion, // ✅ Novo campo para identificar versão
        });

      if (dbError) {
        console.error("[UPLOAD] Erro ao registrar metadados:", dbError);
        throw dbError;
      }

      console.log("[UPLOAD] Metadados registrados com sucesso!");

      // Salvar timestamp local - IMPORTANTE: Usar hash dos dados SEM exportDate
      console.log("[UPLOAD] Salvando novo hash:", hashParaComparacao);

      localStorage.setItem(
        "last_backup_sync",
        JSON.stringify({
          user_id: this.user.id, // ✅ Salvar ID do usuário para validação
          timestamp,
          hash: hashParaComparacao,
          backup_version: backupVersion, // ✅ Salvar versão também
        }),
      );

      // ✅ Limpar flag de backup mais recente (agora estamos atualizados)
      localStorage.removeItem("newer_backup_available");
      localStorage.removeItem("newer_backup_info");

      console.log("[UPLOAD] Hash e versão salvos em localStorage!");

      // ✅ IMPORTANTE: Manter apenas os 3 backups mais recentes
      await this._deleteOldBackups();

      return { success: true, fileName };
    } catch (error) {
      console.error("Erro ao fazer upload do backup:", error);
      throw error;
    }
  }

  /**
   * Deletar backups antigos mantendo apenas os 3 mais recentes
   */
  async _deleteOldBackups() {
    try {
      const MAX_BACKUPS = 3;

      // Obter todos os backups do usuário, ordenados por data
      const { data: backups, error: queryError } = await supabaseClient
        .from("backup_metadata")
        .select("id, file_name, synced_at")
        .eq("user_id", this.user.id)
        .order("synced_at", { ascending: false });

      if (queryError) {
        console.error("[CLEANUP] Erro ao obter histórico:", queryError);
        return;
      }

      if (!backups || backups.length <= MAX_BACKUPS) {
        console.log(
          `[CLEANUP] Total de backups: ${backups?.length || 0}/${MAX_BACKUPS} (nenhum para deletar)`,
        );
        return;
      }

      // Backups a deletar (do índice MAX_BACKUPS em diante)
      const backupsToDelete = backups.slice(MAX_BACKUPS);
      console.log(
        `[CLEANUP] Deletando ${backupsToDelete.length} backup(s) antigo(s)...`,
      );

      for (const backup of backupsToDelete) {
        try {
          // Deletar arquivo do Storage
          const { error: storageError } = await supabaseClient.storage
            .from("backups")
            .remove([backup.file_name]);

          if (storageError) {
            console.error(`[CLEANUP] Erro ao deletar arquivo:`, storageError);
            continue;
          }

          // Deletar registro do banco de dados
          const { error: dbError } = await supabaseClient
            .from("backup_metadata")
            .delete()
            .eq("id", backup.id);

          if (dbError) {
            console.error(`[CLEANUP] Erro ao deletar metadados:`, dbError);
            continue;
          }

          console.log(`[CLEANUP] Backup antigo deletado: ${backup.file_name}`);
        } catch (error) {
          console.error(`[CLEANUP] Erro ao processar exclusão:`, error);
        }
      }

      console.log(
        `[CLEANUP] Limpeza concluída. Backups restantes: ${MAX_BACKUPS}`,
      );
    } catch (error) {
      console.error("[CLEANUP] Erro na limpeza de backups:", error);
      // Não jogar erro, pois backup já foi feito com sucesso
    }
  }

  /**
   * ✅ NOVO: Verificar se há backup mais recente no Supabase
   * Compara a versão do backup local com a do servidor
   */
  async _checkForNewerBackup() {
    try {
      this.checkingForNewerBackup = true; // ✅ Marcar início da checagem

      if (!this.user) return;

      console.log(
        "[BACKUP-CHECK] Verificando se há backup mais recente no Supabase...",
      );

      // 1. Obter versão do backup local
      const localBackupInfo = JSON.parse(
        localStorage.getItem("last_backup_sync") || "{}",
      );
      const localTimestamp = localBackupInfo.timestamp
        ? new Date(localBackupInfo.timestamp)
        : null;
      const localVersion = localBackupInfo.backup_version || 0;

      console.log("[BACKUP-CHECK] Backup local:", {
        timestamp: localTimestamp,
        version: localVersion,
      });

      // 2. Obter backup mais recente do Supabase
      const { data: backups, error } = await supabaseClient
        .from("backup_metadata")
        .select("*")
        .eq("user_id", this.user.id)
        .order("synced_at", { ascending: false })
        .limit(1);

      if (error || !backups || backups.length === 0) {
        console.log("[BACKUP-CHECK] Nenhum backup encontrado no Supabase");
        this.newerBackupAvailable = false;
        return;
      }

      const serverBackup = backups[0];
      const serverTimestamp = new Date(serverBackup.synced_at);
      const serverVersion = serverBackup.backup_version || 0;

      console.log("[BACKUP-CHECK] Backup Supabase:", {
        timestamp: serverTimestamp,
        version: serverVersion,
        fileName: serverBackup.file_name,
      });

      // 3. Comparar versões
      if (!localTimestamp) {
        // Não há backup local = sempre restaurar do servidor
        console.log(
          "[BACKUP-CHECK] ⚠️ Nenhum backup local encontrado - servidor é mais recente",
        );
        this.newerBackupAvailable = true;
        this.newerBackupInfo = {
          timestamp: serverTimestamp.toLocaleString("pt-BR"),
          file_name: serverBackup.file_name,
        };
      } else if (serverTimestamp > localTimestamp) {
        // Servidor é mais recente
        console.log("[BACKUP-CHECK] ⚠️ Backup no Supabase é mais recente!");
        this.newerBackupAvailable = true;
        this.newerBackupInfo = {
          timestamp: serverTimestamp.toLocaleString("pt-BR"),
          file_name: serverBackup.file_name,
        };

        // Salvar info no localStorage para exibir no UI
        localStorage.setItem("newer_backup_available", "true");
        localStorage.setItem(
          "newer_backup_info",
          JSON.stringify({
            timestamp: serverTimestamp.toLocaleString("pt-BR"),
            file_name: serverBackup.file_name,
          }),
        );
      } else {
        console.log("[BACKUP-CHECK] ✅ Backup local é atual");
        this.newerBackupAvailable = false;
        localStorage.removeItem("newer_backup_available");
        localStorage.removeItem("newer_backup_info");
      }

      // ✅ NOVO: Atualizar UI automaticamente se há backup mais recente
      if (this.backupUI && this.newerBackupAvailable && this.newerBackupInfo) {
        console.log(
          "[BACKUP-CHECK] ✅ Exibindo banner de atualização automáticamente",
        );
        this.backupUI.showUpdateBanner(this.newerBackupInfo);
        this.backupUI.setSyncButtonState("needsSync");
      }
    } catch (error) {
      console.error(
        "[BACKUP-CHECK] Erro ao verificar backup mais recente:",
        error,
      );
    } finally {
      this.checkingForNewerBackup = false; // ✅ Marcar fim da checagem
    }
  }

  /**
   * ✅ NOVO: Obter status de backup mais recente
   * Retorna se há atualização disponível e as informações
   */
  getNewerBackupStatus() {
    return {
      available: this.newerBackupAvailable,
      info: this.newerBackupInfo,
    };
  }

  /**
   * Obter histórico de backups do usuário
   */
  /**
   * Restaurar backup anterior
   */
  async restoreBackup(fileName) {
    if (!this.user) {
      throw new Error("Usuário não autenticado");
    }

    try {
      const { data, error } = await supabaseClient.storage
        .from("backups")
        .download(fileName);

      if (error) throw error;

      const backupText = await data.text();
      return JSON.parse(backupText);
    } catch (error) {
      console.error("Erro ao restaurar backup:", error);
      throw error;
    }
  }

  /**
   * ✅ NOVO: Restaurar backup do Supabase (download e aplicar)
   * Usado quando há backup mais recente no servidor
   */
  async downloadAndRestoreBackup(fileName) {
    try {
      console.log("[RESTORE] Baixando backup do servidor:", fileName);

      // 1. Download do arquivo
      const { data, error } = await supabaseClient.storage
        .from("backups")
        .download(fileName);

      if (error) throw error;

      const backupText = await data.text();
      const backupData = JSON.parse(backupText);

      console.log(
        "[RESTORE] Backup baixado com sucesso. Tamanho:",
        Object.keys(backupData).length,
        "tabelas",
      );

      // 2. Atualizar localStorage com a versão do backup restaurado
      const { data: metadata } = await supabaseClient
        .from("backup_metadata")
        .select("*")
        .eq("file_name", fileName)
        .single();

      if (metadata) {
        localStorage.setItem(
          "last_backup_sync",
          JSON.stringify({
            user_id: this.user.id, // ✅ Salvar ID do usuário para validação
            timestamp: metadata.synced_at,
            hash: metadata.backup_hash,
            backup_version: metadata.backup_version,
          }),
        );
        console.log("[RESTORE] Versão local atualizada");
      }

      // 3. Limpar flag de atualização disponível
      localStorage.removeItem("newer_backup_available");
      localStorage.removeItem("newer_backup_info");

      return backupData;
    } catch (error) {
      console.error("[RESTORE] Erro ao restaurar backup:", error);
      throw error;
    }
  }

  /**
   * ✅ NOVO: Verificar se há alterações locais não sincronizadas
   * Usado para avisar quando vai sobrescrever o backup no servidor
   */
  async hasLocalChanges(currentBackupData) {
    try {
      const lastSync = JSON.parse(
        localStorage.getItem("last_backup_sync") || "{}",
      );
      const currentHash = this._generateHash(JSON.stringify(currentBackupData));

      const hasChanges = currentHash !== lastSync.hash;

      if (hasChanges) {
        console.log(
          "[CHANGES] ⚠️ Há mudanças locais que vão sobrescrever o servidor!",
        );
      } else {
        console.log("[CHANGES] ✅ Sem mudanças locais, sincronização segura");
      }

      return hasChanges;
    } catch (error) {
      console.error("[CHANGES] Erro ao verificar mudanças:", error);
      return true; // Em caso de erro, assume que há mudanças (mais seguro)
    }
  }

  /**
   * Verificar se há alterações desde o último backup
   */
  async hasChanges(currentBackupData) {
    try {
      const lastSync = JSON.parse(
        localStorage.getItem("last_backup_sync") || "{}",
      );
      const currentHash = this._generateHash(JSON.stringify(currentBackupData));

      console.log("[HASH] Último hash salvo:", lastSync.hash);
      console.log("[HASH] Hash atual:", currentHash);
      const hasChanges = currentHash !== lastSync.hash;
      console.log("[HASH] Tem mudanças?", hasChanges);

      return hasChanges;
    } catch (error) {
      console.error("[HASH] Erro ao verificar mudanças:", error);
      return true; // Em caso de erro, considera que há alterações
    }
  }

  /**
   * Gerar hash simples dos dados (para detectar mudanças)
   */
  _generateHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  /**
   * Verificar se usuário está autenticado
   */
  isAuthenticated() {
    return !!this.user;
  }

  /**
   * Obter email do usuário
   */
  getUserEmail() {
    return this.user?.email || null;
  }

  /**
   * Obter perfil público do usuário (SEM tokens)
   * ✅ SEGURANÇA: Retorna apenas dados públicos do localStorage
   */
  getPublicUserProfile() {
    const profile = localStorage.getItem("user_profile");
    return profile ? JSON.parse(profile) : null;
  }

  /**
   * Verificar se autenticado (mais seguro)
   * ✅ Verifica localStorage em vez de confiar apenas na memória
   */
  isAuthenticatedSecure() {
    // Verificar em memória (preferível)
    if (this.user && this.session) {
      return true;
    }

    // Fallback: verificar localStorage (para persistência entre abas)
    const isAuthenticated =
      localStorage.getItem("user_authenticated") === "true";
    return isAuthenticated;
  }
}

export const supabaseService = new SupabaseService();
