import { dbService } from "../services/db/db-service.js";

export class EditaisSummaryUI {
  static async render(containerSelector = "editais-summary-container") {
    const container = document.getElementById(containerSelector);
    if (!container) return;

    try {
      const editais = await dbService.getEditais();

      if (editais.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; color: var(--text-secondary); padding: 15px; font-size: 13px">
            Nenhum edital cadastrado
          </div>
        `;
        return;
      }

      let html = "";

      for (const edital of editais) {
        const materias = await dbService.getEditalMaterias(edital.id);
        const simulados = await dbService.getSimuladosByEdital(edital.id);

        if (materias.length === 0) {
          continue;
        }

        let totalTopicos = 0;
        let completedTopicos = 0;

        for (const materia of materias) {
          const topicos = await dbService.getEditalTopicos(materia.id);
          totalTopicos += topicos.length;
          completedTopicos += topicos.filter((t) => t.completed).length;
        }

        const totalSimulados = simulados.length;

        const percentage =
          totalTopicos === 0
            ? 0
            : Math.round((completedTopicos / totalTopicos) * 100);

        // Formatar texto do resumo
        const simuladosText =
          totalSimulados === 1 ? "1 simulado" : `${totalSimulados} simulados`;
        const topicosText =
          completedTopicos === 1
            ? "1 tópico concluído"
            : `${completedTopicos} tópicos concluídos`;

        html += `
          <div style="
            background: var(--table-stripe);
            border-radius: 8px;
            padding: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            border-left: 4px solid var(--primary-color);
            margin-bottom: 10px;
          ">
            <div style="flex: 1; min-width: 0">
              <div style="font-weight: 600; font-size: 14px; color: var(--text-color); margin-bottom: 6px">
                ${edital.nome}
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px">
                <span style="
                  font-size: 11px;
                  color: var(--text-secondary);
                ">
                  ${simuladosText} e ${topicosText}
                </span>
                <div style="display: flex; align-items: center; gap: 8px">
                  <div style="
                    flex: 1;
                    height: 6px;
                    background: var(--border-color);
                    border-radius: 3px;
                    overflow: hidden;
                    min-width: 50px;
                  ">
                    <div style="
                      height: 100%;
                      background: linear-gradient(90deg, rgb(0, 123, 255), rgb(0, 86, 179));
                      width: ${percentage}%;
                      transition: width 0.3s ease;
                    "></div>
                  </div>
                  <span style="
                    font-size: 12px;
                    font-weight: bold;
                    color: var(--primary-color);
                    min-width: 35px;
                    text-align: right;
                  ">
                    ${percentage}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      container.innerHTML =
        html ||
        `
        <div style="text-align: center; color: var(--text-secondary); padding: 15px; font-size: 13px">
          Nenhum edital com matérias cadastradas
        </div>
      `;
    } catch (error) {
      console.error("Erro ao renderizar resumo dos editais:", error);
      container.innerHTML = `
        <div style="text-align: center; color: var(--text-secondary); padding: 15px; font-size: 13px">
          Erro ao carregar editais
        </div>
      `;
    }
  }

  static async renderBoth() {
    await this.render("editais-summary-container");
    await this.render("editais-summary-container-reports");
  }
}
