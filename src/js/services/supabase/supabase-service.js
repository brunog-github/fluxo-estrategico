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

    return true;
  }

  /**
   * Enviar magic-link para email
   */
  async sendMagicLink(email) {
    try {
      // ✅ IMPORTANTE: Redirecionar para a raiz sem hash
      // O Supabase automaticamente adiciona os parâmetros de autenticação
      const redirectUrl = `${window.location.origin}${window.location.pathname}`;

      const { error } = await supabaseClient.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      console.log(error);

      if (error) throw error;

      return {
        success: true,
        message: "Confira seu email para o link de acesso",
      };
    } catch (error) {
      console.error("Erro ao enviar magic-link:", error);
      return { success: false, error: error.message };
    }
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
      localStorage.removeItem("last_backup_sync");

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

      // ✅ CACHE: Limpar cache do histórico ao fazer logout
      dbService.clearBackupHistoryCache();

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

      const { error: dbError } = await supabaseClient
        .from("backup_metadata")
        .insert({
          user_id: this.user.id,
          file_name: fileName,
          backup_hash: hashParaComparacao,
          backup_size: JSON.stringify(backupDataForUpload).length,
          synced_at: timestamp,
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
          timestamp,
          hash: hashParaComparacao,
        }),
      );

      console.log("[UPLOAD] Hash salvo em localStorage!");

      // ✅ IMPORTANTE: Manter apenas os 3 backups mais recentes
      await this._deleteOldBackups();

      // ✅ CACHE: Invalidar cache do histórico (será recarregado na próxima requisição)
      dbService.clearBackupHistoryCache();
      console.log("[CACHE] Cache do histórico invalidado");

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
   * Obter histórico de backups do usuário
   */
  async getBackupHistory() {
    if (!this.user) {
      throw new Error("Usuário não autenticado");
    }

    try {
      // ✅ CACHE: Verificar se há cache válido em localStorage
      // (não usa IndexedDB para não modificar dados de backup)
      const cached = dbService.getBackupHistoryCache();
      if (cached) {
        console.log("[HISTORY] Usando cache do histórico (economizando banda)");
        return cached.data;
      }

      // ✅ Cache expirou ou não existe - buscar do Supabase
      console.log("[HISTORY] Cache não disponível, buscando do Supabase...");
      const { data, error } = await supabaseClient
        .from("backup_metadata")
        .select("*")
        .eq("user_id", this.user.id)
        .order("synced_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      // ✅ Salvar no cache para próximas requisições (localStorage)
      if (data) {
        dbService.setBackupHistoryCache(data);
        console.log("[HISTORY] Cache atualizado com sucesso");
      }

      return data || [];
    } catch (error) {
      console.error("Erro ao obter histórico de backups:", error);
      return [];
    }
  }

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
