/**
 * Serviço de Banco de Dados com IndexedDB (Dexie.js)
 * Gerencia todas as operações de leitura/escrita no banco de dados
 */

// Inicializar banco de dados com Dexie
const db = new Dexie("FluxoEstrategicoDB");

// Definir esquema do banco de dados
db.version(1).stores({
  settings: "++id, key", // tema, dias de descanso, categoria cores, etc
  categories: "++id", // categorias de estudo
  subjects: "++id", // ciclo de estudo (matérias ativas)
  history: "++id", // histórico de estudos
  notes: "++id, linkedId", // notas de estudo
  achievements: "++id, achievementId", // conquistas desbloqueadas
});

/**
 * Classe para gerenciar todas as operações do banco de dados
 */
class DBService {
  // ========== SETTINGS (Tema, cores customizadas) ==========

  /**
   * Obter configuração específica
   * @param {string} key - Chave da configuração (ex: 'theme', 'customCategoryColors')
   * @returns {Promise<any>} Valor da configuração ou undefined
   */
  async getSetting(key) {
    const setting = await db.settings.where("key").equals(key).first();
    return setting ? setting.value : undefined;
  }
  /**
   * Salvar configuração
   * @param {string} key - Chave da configuração
   * @param {any} value - Valor a ser salvo
   */
  async setSetting(key, value) {
    const existing = await db.settings.where("key").equals(key).first();
    if (existing) {
      await db.settings.update(existing.id, { value, updatedAt: new Date() });
    } else {
      await db.settings.add({
        key,
        value,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }
  /**
   * Obter todas as configurações
   * @returns {Promise<Object>} Objeto com todas as configurações
   */
  async getAllSettings() {
    const settings = await db.settings.toArray();
    const result = {};
    settings.forEach((setting) => {
      result[setting.key] = setting.value;
    });
    return result;
  }
  /**
   * Deletar configuração
   * @param {string} key - Chave da configuração
   */
  async deleteSetting(key) {
    await db.settings.where("key").equals(key).delete();
  }

  // ========== BACKUP HISTORY CACHE (localStorage - não sincroniza) ==========

  /**
   * Obter cache do histórico de backups
   * ✅ Usa localStorage para não modificar IndexedDB e não afetar hash
   * @returns {Object|null} Objeto com data e histórico, ou null se expirado
   */
  getBackupHistoryCache() {
    try {
      const cacheStr = localStorage.getItem("backup_history_cache");
      if (!cacheStr) return null;

      const cache = JSON.parse(cacheStr);

      // Verificar se cache expirou (1 hora = 3600000 ms)
      const now = Date.now();
      const cacheAge = now - cache.timestamp;
      if (cacheAge > 3600000) {
        // Cache expirado
        this.clearBackupHistoryCache();
        return null;
      }

      return cache;
    } catch (error) {
      console.error("[CACHE] Erro ao obter cache do histórico:", error);
      return null;
    }
  }

  /**
   * Salvar cache do histórico de backups
   * ✅ Usa localStorage para não modificar IndexedDB e não afetar hash
   * @param {Array} historyData - Array com dados do histórico
   */
  setBackupHistoryCache(historyData) {
    try {
      localStorage.setItem(
        "backup_history_cache",
        JSON.stringify({
          data: historyData,
          timestamp: Date.now(),
        }),
      );
    } catch (error) {
      console.error("[CACHE] Erro ao salvar cache do histórico:", error);
    }
  }

  /**
   * Limpar cache do histórico de backups
   * ✅ Usa localStorage para não modificar IndexedDB
   */
  clearBackupHistoryCache() {
    try {
      localStorage.removeItem("backup_history_cache");
    } catch (error) {
      console.error("[CACHE] Erro ao limpar cache do histórico:", error);
    }
  }

  // ========== CATEGORIES (Categorias de Estudo) ==========

  /**
   * Obter todas as categorias
   * @returns {Promise<Array>} Array de categorias
   */
  async getCategories() {
    return await db.categories.toArray();
  }
  /**
   * Adicionar categoria
   * @param {string} categoryName - Nome da categoria
   */
  async addCategory(categoryName) {
    return await db.categories.add({
      name: categoryName,
      createdAt: new Date(),
    });
  }
  /**
   * Deletar categoria
   * @param {number} id - ID da categoria
   */
  async deleteCategory(id) {
    await db.categories.delete(id);
  }
  /**
   * Limpar todas as categorias
   */
  async clearCategories() {
    await db.categories.clear();
  }
  /**
   * Adicionar múltiplas categorias
   * @param {Array<string>} categoryNames - Array com nomes das categorias
   */
  async addCategories(categoryNames) {
    const categories = categoryNames.map((name) => ({
      name,
      createdAt: new Date(),
    }));
    await db.categories.bulkAdd(categories);
  }
  // ========== SUBJECTS (Ciclo de Estudo) ==========

  /**
   * Obter todos os sujeitos (matérias) do ciclo ativo
   * @returns {Promise<Array>} Array de sujeitos
   */
  async getSubjects() {
    return await db.subjects.toArray();
  }
  /**
   * Adicionar sujeito
   * @param {string} subjectName - Nome do sujeito
   */
  async addSubject(subjectName) {
    return await db.subjects.add({
      name: subjectName,
      createdAt: new Date(),
    });
  }
  /**
   * Deletar sujeito
   * @param {number} id - ID do sujeito
   */
  async deleteSubject(id) {
    await db.subjects.delete(id);
  }
  /**
   * Limpar todos os sujeitos
   */
  async clearSubjects() {
    await db.subjects.clear();
  }
  /**
   * Adicionar múltiplos sujeitos
   * @param {Array<string>} subjectNames - Array com nomes dos sujeitos
   */
  async addSubjects(subjectNames) {
    const subjects = subjectNames.map((name) => ({
      name,
      createdAt: new Date(),
    }));
    await db.subjects.bulkAdd(subjects);
  }
  // ========== HISTORY (Histórico de Estudos) ==========

  /**
   * Obter todo o histórico de estudos
   * @returns {Promise<Array>} Array com registros de histórico
   */
  async getHistory() {
    return await db.history.toArray();
  }
  /**
   * Obter histórico por intervalo de datas (filtrado em memória)
   * @param {string} startDate - Data inicial (formato DD/MM/YYYY)
   * @param {string} endDate - Data final (formato DD/MM/YYYY)
   * @returns {Promise<Array>} Array de registros no intervalo
   */
  async getHistoryByDateRange(startDate, endDate) {
    const all = await db.history.toArray();
    // Filtrar em memória já que date é string
    return all.filter((entry) => {
      const entryDate = entry.date ? entry.date.split(" às ")[0] : "";
      return entryDate >= startDate && entryDate <= endDate;
    });
  }
  /**
   * Adicionar registro ao histórico
   * @param {Object} historyEntry - Objeto com dados do estudo
   */
  async addHistoryEntry(historyEntry) {
    return await db.history.add({
      ...historyEntry,
      createdAt: new Date(),
    });
  }
  /**
   * Adicionar múltiplos registros de histórico
   * @param {Array<Object>} entries - Array de registros
   */
  async addHistoryEntries(entries) {
    const processedEntries = entries.map((entry) => ({
      ...entry,

      createdAt: new Date(),
    }));
    await db.history.bulkAdd(processedEntries);
  }
  /**
   * Atualizar registro de histórico
   * @param {number} id - ID do registro
   * @param {Object} updates - Dados a atualizar
   */
  async updateHistoryEntry(id, updates) {
    await db.history.update(id, { ...updates, updatedAt: new Date() });
  }
  /**
   * Deletar registro de histórico
   * @param {number} id - ID do registro
   */
  async deleteHistoryEntry(id) {
    // Delete related note if exists (linkedId === history id)
    await db.notes.where("linkedId").equals(id).delete();
    // Delete history entry
    await db.history.delete(id);
  }
  /**
   * Limpar todo o histórico
   */
  async clearHistory() {
    await db.history.clear();
    // Also clear all notes when clearing history
    await db.notes.clear();
  }
  // ========== NOTES (Notas de Estudo) ==========

  /**
   * Obter todas as notas
   * @returns {Promise<Array>} Array de notas
   */
  async getNotes() {
    return await db.notes.toArray();
  }
  /**
   * Obter notas por intervalo de datas (filtrado em memória)
   * @param {string} startDate - Data inicial (formato DD/MM/YYYY)
   * @param {string} endDate - Data final (formato DD/MM/YYYY)
   * @returns {Promise<Array>} Array de notas no intervalo
   */
  async getNotesByDateRange(startDate, endDate) {
    const all = await db.notes.toArray();
    // Filtrar em memória já que date é string
    return all.filter((note) => {
      const noteDate = note.date ? note.date.split(" às ")[0] : "";
      return noteDate >= startDate && noteDate <= endDate;
    });
  }
  /**
   * Adicionar nota
   * @param {Object} noteData - Dados da nota
   */
  async addNote(noteData) {
    return await db.notes.add({
      ...noteData,

      createdAt: new Date(),
    });
  }
  /**
   * Adicionar múltiplas notas
   * @param {Array<Object>} notes - Array de notas
   */
  async addNotes(notes) {
    const processedNotes = notes.map((note) => ({
      ...note,

      createdAt: new Date(),
    }));
    await db.notes.bulkAdd(processedNotes);
  }
  /**
   * Atualizar nota
   * @param {number} id - ID da nota
   * @param {Object} updates - Dados a atualizar
   */
  async updateNote(id, updates) {
    await db.notes.update(id, { ...updates, updatedAt: new Date() });
  }
  /**
   * Deletar nota
   * @param {number} id - ID da nota
   */
  async deleteNote(id) {
    await db.notes.delete(id);
  }
  /**
   * Limpar todas as notas
   */
  async clearNotes() {
    await db.notes.clear();
  }
  // ========== ACHIEVEMENTS (Conquistas Desbloqueadas) ==========

  /**
   * Obter todos os IDs de conquistas desbloqueadas
   * @returns {Promise<Array>} Array com IDs das conquistas desbloqueadas
   */
  async getUnlockedAchievements() {
    const achievements = await db.achievements.toArray();
    return achievements.map((a) => a.achievementId);
  }
  /**
   * Verificar se conquista está desbloqueada
   * @param {string} achievementId - ID da conquista
   * @returns {Promise<boolean>} True se desbloqueada
   */
  async isAchievementUnlocked(achievementId) {
    const achievement = await db.achievements
      .where("achievementId")
      .equals(achievementId)
      .first();
    return !!achievement;
  }
  /**
   * Desbloquear conquista
   * @param {string} achievementId - ID da conquista
   */
  async unlockAchievement(achievementId) {
    const exists = await this.isAchievementUnlocked(achievementId);
    if (!exists) {
      await db.achievements.add({
        achievementId,
        unlockedAt: new Date(),
      });
    }
  }
  /**
   * Desbloquear múltiplas conquistas
   * @param {Array<string>} achievementIds - Array de IDs de conquistas
   */
  async unlockAchievements(achievementIds) {
    const achievements = achievementIds.map((id) => ({
      achievementId: id,
      unlockedAt: new Date(),
    }));
    await db.achievements.bulkAdd(achievements, { allKeys: true });
  }
  /**
   * Bloquear conquista
   * @param {string} achievementId - ID da conquista
   */
  async lockAchievement(achievementId) {
    await db.achievements.where("achievementId").equals(achievementId).delete();
  }
  /**
   * Limpar todas as conquistas
   */
  async clearAchievements() {
    await db.achievements.clear();
  }
  // ========== SPECIAL: Dias de Descanso (REST DAYS) ==========

  /**
   * Obter dias de descanso (array de 0-6)
   * @returns {Promise<Array>} Array com números de dias (0=dom, 6=sab)
   */
  async getRestDays() {
    const restDays = await this.getSetting("restDays");
    return restDays || [];
  }
  /**
   * Salvar dias de descanso
   * @param {Array<number>} days - Array com números dos dias (0-6)
   */
  async setRestDays(days) {
    await this.setSetting("restDays", days);
  }
  /**
   * Obter tema
   * @returns {Promise<string>} Tema atual (light/dark)
   */
  async getTheme() {
    const theme = await this.getSetting("theme");
    return theme || "light";
  }
  /**
   * Salvar tema
   * @param {string} theme - Tema a salvar (light/dark)
   */
  async setTheme(theme) {
    await this.setSetting("theme", theme);
  }
  /**
   * Obter cores customizadas das categorias
   * @returns {Promise<Object>} Objeto com cores das categorias
   */
  async getCustomCategoryColors() {
    const colors = await this.getSetting("customCategoryColors");
    return colors || {};
  }
  /**
   * Salvar cores customizadas das categorias
   * @param {Object} colors - Objeto com cores das categorias
   */
  async setCustomCategoryColors(colors) {
    await this.setSetting("customCategoryColors", colors);
  }
  /**
   * Obter índice atual
   * @returns {Promise<number>} Índice atual
   */
  async getCurrentIndex() {
    const index = await this.getSetting("currentIndex");
    return index || 0;
  }
  /**
   * Salvar índice atual
   * @param {number} index - Índice a salvar
   */
  async setCurrentIndex(index) {
    await this.setSetting("currentIndex", index);
  }
  /**
   * Obter data do último backup
   * @returns {Promise<string>} Data do último backup
   */
  async getLastBackupDate() {
    const date = await this.getSetting("lastBackupDate");
    return date || "";
  }
  /**
   * Salvar data do último backup
   * @param {string} date - Data do backup
   */
  async setLastBackupDate(date) {
    await this.setSetting("lastBackupDate", date);
  }
  /**
   * Obter estado de lock do sortable
   * @returns {Promise<boolean>} Se está bloqueado
   */
  async getSortableLocked() {
    const locked = await this.getSetting("sortableLocked");
    return locked === "true" || locked === true;
  }
  /**
   * Salvar estado de lock do sortable
   * @param {boolean} isLocked - Se está bloqueado
   */
  async setSortableLocked(isLocked) {
    await this.setSetting("sortableLocked", isLocked);
  }
  // ========== EXPORT/IMPORT ==========

  /**
   * Exportar todos os dados para backup
   * @returns {Promise<Object>} Objeto com todos os dados
   */
  async exportAll() {
    return {
      settings: await db.settings.toArray(),
      categories: await db.categories.toArray(),
      subjects: await db.subjects.toArray(),
      history: await db.history.toArray(),
      notes: await db.notes.toArray(),
      achievements: await db.achievements.toArray(),
    };
  }
  /**
   * Importar dados de backup
   * @param {Object} data - Dados para importar
   */
  async importAll(data) {
    await db.transaction(
      "rw",
      [
        db.settings,
        db.categories,
        db.subjects,
        db.history,
        db.notes,
        db.achievements,
      ],
      async () => {
        if (data.settings)
          await db.settings.bulkAdd(data.settings, { allKeys: true });
        if (data.categories)
          await db.categories.bulkAdd(data.categories, { allKeys: true });
        if (data.subjects)
          await db.subjects.bulkAdd(data.subjects, { allKeys: true });
        if (data.history)
          await db.history.bulkAdd(data.history, { allKeys: true });
        if (data.notes) await db.notes.bulkAdd(data.notes, { allKeys: true });
        if (data.achievements)
          await db.achievements.bulkAdd(data.achievements, { allKeys: true });
      },
    );
  }

  // ========== CICLO CORRENTE (Current Cycle Index) ==========

  /**
   * Obter índice do ciclo corrente
   */
  async getCurrentCycleIndex() {
    const index = await this.getSetting("currentIndex");
    return index || 0;
  }

  /**
   * Definir índice do ciclo corrente
   * @param {number} index - Índice da matéria ativa
   */
  async setCurrentCycleIndex(index) {
    await this.setSetting("currentIndex", index);
  }

  /**
   * Limpar todo o banco de dados
   */
  async clearAll() {
    await db.delete();
    await db.open();
  }
}

// Exportar como classe e como instância singleton
export default DBService;
export const dbService = new DBService();
