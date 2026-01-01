// --- FUNÇÕES AUXILIARES DE DIAS ---
const MAPA_DIAS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

// Converte [0, 6] -> "Domingo, Sábado"
function convertRestDaysToString(indices) {
  if (!Array.isArray(indices)) return "";
  return indices.map((i) => MAPA_DIAS[i]).join(", ");
}

// Converte "Sábado, domingo" -> [0, 6]
function convertStringToRestDays(text) {
  if (!text) return [];
  const normalized = text.toLowerCase();
  const result = [];

  MAPA_DIAS.forEach((dia, index) => {
    // Verifica se o nome do dia (ex: "domingo") existe no texto do usuário
    // Usamos includes para ser flexível (aceitar "sáb", "sabado", etc se quiser refinar)
    if (normalized.includes(dia.toLowerCase())) {
      result.push(index);
    }
  });
  return result;
}

// --- 1. EXPORTAR CONFIGURAÇÕES ---
function exportConfigCSV() {
  const subjects = JSON.parse(localStorage.getItem("studyCycle")) || [];
  const restDays = JSON.parse(localStorage.getItem("restDays")) || [];

  // Transforma os números dos dias em texto legível para o usuário
  const restDaysText = convertRestDaysToString(restDays);

  // Cabeçalho
  let csvContent = "Materia,Dias_Descanso\n";

  // Lógica: Listamos todas as matérias.
  // Colocamos a string de dias de descanso apenas na primeira linha para não ficar repetitivo,
  // mas o usuário pode colocar em qualquer linha se quiser na importação.

  // Se não houver matérias, exportamos pelo menos os dias
  const maxRows = Math.max(subjects.length, 1);

  for (let i = 0; i < maxRows; i++) {
    const mat = subjects[i] || ""; // Matéria da linha ou vazio

    // Apenas na primeira linha escrevemos os dias de descanso.
    // Colocamos entre aspas para evitar bugs se tiver vírgulas na string
    const dias = i === 0 ? `"${restDaysText}"` : "";

    csvContent += `${mat},${dias}\n`;
  }

  // Download do arquivo
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "config_estudos.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --- 2. IMPORTAR CONFIGURAÇÕES ---
function importConfigCSV(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    processConfigCSV(text);
    // Limpa o input para permitir importar o mesmo arquivo novamente se errar
    input.value = "";
  };
  reader.readAsText(file);
}

function processConfigCSV(csvText) {
  const lines = csvText.split("\n");
  if (lines.length < 2) return alert("Arquivo inválido ou vazio.");

  let newSubjects = [];
  let newRestDaysString = "";

  // Começa do 1 para pular o cabeçalho
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Regex complexo para lidar com aspas no CSV (caso dias sejam "Sabado, Domingo")
    // Divide por vírgula, mas ignora vírgulas dentro de aspas
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

    // Remove aspas extras que o CSV possa ter adicionado
    const mat = cols[0] ? cols[0].replace(/^"|"$/g, "").trim() : "";
    const dias = cols[1] ? cols[1].replace(/^"|"$/g, "").trim() : "";

    if (mat) newSubjects.push(mat);

    // Se encontrar alguma definição de dias em qualquer linha, salva
    if (dias && dias.length > 2) {
      newRestDaysString = dias;
    }
  }

  if (newSubjects.length === 0 && newRestDaysString === "") {
    return showToast("error", "Nenhuma configuração encontrada no arquivo.");
  }

  confirmAction(
    "Isso irá substituir suas matérias e dias de descanso atuais. Continuar?",
    () => {
      // Salva Matérias
      if (newSubjects.length > 0) {
        // Remove duplicatas
        newSubjects = [...new Set(newSubjects)];
        localStorage.setItem("studyCycle", JSON.stringify(newSubjects));
      }

      // Salva Dias de Descanso (Converte Texto -> Números)
      if (newRestDaysString) {
        const restIndices = convertStringToRestDays(newRestDaysString);
        localStorage.setItem("restDays", JSON.stringify(restIndices));
      }

      showToast("success", "Configurações importadas com sucesso!");
      location.reload(); // Recarrega para aplicar mudanças
    }
  );
}

function clearConfig() {
  confirmAction(
    "Isso irá remover todas as suas configurações, tem certeza disso ?",
    () => {
      localStorage.removeItem("studyCycle");
      localStorage.removeItem("restDays");
      showToast("success", "Configurações resetadas com sucesso!");
      location.reload();
    }
  );
}
