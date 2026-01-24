# Migração de localStorage para IndexedDB

## 📋 Visão Geral

A aplicação foi migrada de **localStorage** para **IndexedDB** utilizando **Dexie.js v4.0.8** via CDN. Um sistema automático de migração foi implementado para transferir os dados do localStorage para IndexedDB na primeira execução.

---

## 🔄 Como Funciona a Migração

### 1. **Detecção Automática**

- Na inicialização da aplicação, o método `migrateFromLocalStorage()` é chamado
- Verifica se existe a flag `migrationCompleted` no IndexedDB
- Se já foi migrado, pula o processo
- Se não foi, inicia a migração

### 2. **Transferência de Dados**

Os seguintes dados são migrados automaticamente:

```
✅ studyCategories → categories table
✅ studyCycle → subjects table + currentIndex setting
✅ studyHistory → history table
✅ studyNotes → notes table (com linkedId)
✅ unlockedAchievements → achievements table
✅ theme → settings table
✅ restDays → settings table
✅ lastBackupDate → settings table
✅ customCategoryColors → embedded em categories.color
```

### 3. **Pós-Migração**

- Uma flag `migrationCompleted: true` é salva no IndexedDB
- A data/hora da migração é registrada como `migrationDate`
- Console exibe relatório com quantidade de registros migrados

---

## 📂 Arquivos Modificados

### 1. **src/js/services/db/migration.js** (NOVO)

Contém as funções de migração:

- `migrateFromLocalStorage()` - Executa a migração
- `getMigrationStatus()` - Verifica status
- `clearLocalStorageAfterMigration()` - Limpa localStorage (opcional)

### 2. **src/js/main.js**

Modificado para chamar migração no `start()`:

```javascript
// Passo 0: Migrar dados do localStorage se necessário
await migrateFromLocalStorage();
```

### 3. **src/js/services/db/db-service.js**

Adicionados novos métodos:

- `getCurrentCycleIndex()` - Obter índice do ciclo
- `setCurrentCycleIndex(index)` - Definir índice do ciclo

---

## 📊 Dados Migrados

### De localStorage para IndexedDB

| localStorage           | IndexedDB Table    | Tipo                        |
| ---------------------- | ------------------ | --------------------------- |
| `studyCategories`      | `categories`       | array → múltiplos registros |
| `customCategoryColors` | `categories.color` | embedded no registro        |
| `studyCycle`           | `subjects`         | array → múltiplos registros |
| `currentIndex`         | `settings`         | key=`currentIndex`          |
| `studyHistory`         | `history`          | array → múltiplos registros |
| `studyNotes`           | `notes`            | array → múltiplos registros |
| `unlockedAchievements` | `achievements`     | array → múltiplos registros |
| `theme`                | `settings`         | key=`theme`                 |
| `restDays`             | `settings`         | key=`restDays`              |
| `lastBackupDate`       | `settings`         | key=`lastBackupDate`        |

---

## 🔍 Verificar Status da Migração

### No Console do Navegador:

```javascript
// Importar a função
import { getMigrationStatus } from "./services/db/migration.js";

// Verificar status
const status = await getMigrationStatus();
console.log(status);
// Output:
// {
//   isMigrated: true,
//   migrationDate: "2026-01-24T15:30:45.123Z"
// }
```

### Logs Automáticos:

Durante a inicialização, você verá logs como:

```
🔍 Verificando migração de dados...
🔄 Iniciando migração do localStorage para IndexedDB...
📁 Migrando categorias...
📚 Migrando ciclo de estudo...
📊 Migrando histórico de estudo...
📝 Migrando anotações...
🏆 Migrando conquistas...
⚙️ Migrando configurações...
✅ Migração concluída com sucesso!
📦 Dados transferidos:
   - 6 categorias
   - 5 matérias
   - 1862 sessões de estudo
   - 2 anotações
   - 6 conquistas
```

---

## 🛡️ Segurança e Backup

### ✅ Dados Preservados

- Nenhum dado é perdido durante a migração
- Todos os registros são copiados para IndexedDB
- Histórico completo é preservado

### ⚠️ Importante

Após confirmar que a migração funcionou corretamente:

1. **Aguarde alguns dias** para garantir estabilidade
2. **Considere fazer um backup** dos dados no IndexedDB
3. **Opcionalmente**, limpe o localStorage:
   ```javascript
   import { clearLocalStorageAfterMigration } from "./services/db/migration.js";
   clearLocalStorageAfterMigration();
   ```

---

## 🚀 Deploy para Produção

### Checklist:

- [x] Migração automática implementada
- [x] Detecta se já foi migrado (evita duplicação)
- [x] Logs informativos no console
- [x] Trata erros gracefully
- [x] Preserva integridade dos dados
- [x] Suporta dados históricos antigos

### Passos:

1. Deploy do código com os arquivos modificados
2. Primeira execução migra dados automaticamente
3. Acompanhe os logs da migração
4. Verifique dados no IndexedDB (DevTools → Application → IndexedDB)
5. Após 48h, opcionalmente limpe localStorage

---

## 📱 Compatibilidade

- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile Browsers

IndexedDB é suportado em 99% dos navegadores modernos.

---

## 🔧 Troubleshooting

### "Migração não funcionou?"

1. Abra DevTools (F12)
2. Vá em Application → IndexedDB
3. Verifique se os dados estão lá
4. Veja os logs no console para mensagens de erro

### "Dados duplicados?"

- Não é possível com o sistema atual
- A flag `migrationCompleted` garante que roda apenas uma vez

### "Quero forçar nova migração?"

```javascript
// No console do navegador:
import { dbService } from "./services/db/db-service.js";
await dbService.setSetting("migrationCompleted", false);
location.reload();
```

---

## 📝 Estrutura do localStorage (Referência)

Veja o arquivo `Estruturas-do-localStorage.txt` para consultar a estrutura original dos dados em produção.

---

**Data de Implementação:** 24 de Janeiro de 2026
**Versão:** 1.0
**Status:** Pronto para Produção ✅
