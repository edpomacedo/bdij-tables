const axios = require('axios');
const { JSDOM } = require('jsdom');
const fs = require('fs');

class SPARQLQueryDispatcher {
    constructor(endpoint) {
        this.endpoint = endpoint;
    }

    async query(sparqlQuery) {
        try {
            const fullUrl = this.endpoint + '?query=' + encodeURIComponent(sparqlQuery);
            const headers = { 'Accept': 'application/sparql-results+json' };

            const response = await axios.get(fullUrl, { headers });
            return response.data;
        } catch (error) {
            throw new Error('Erro na execução da consulta SPARQL: ' + error.message);
        }
    }
}

async function main() {
    try {
        // 1. Acessar a página mediawiki
        const mediawikiPage = await axios.get('https://web.bdij.com.br/wiki/Project_talk:Minist%C3%A9rios');

        // 2. Capturar conteúdo entre as tags <pre> e </pre>
        const { window } = new JSDOM(mediawikiPage.data);
        const sparqlContent = window.document.querySelector('pre').textContent;

        // 3. Consultar o Query Service
        const endpointUrl = 'https://web.bdij.com.br/query/sparql';
        const queryDispatcher = new SPARQLQueryDispatcher(endpointUrl);
        const queryServiceResponse = await queryDispatcher.query(sparqlContent);

        // 4. Coletar resultado da consulta e transformar em tabela wikitext
        const wikitextTable = transformToWikitextTable(queryServiceResponse);

        // 5. Salvar a tabela wikitext em uma pasta do projeto, no formato txt
        fs.writeFileSync('C:\\Development\\bdij-tables\\dump.txt', wikitextTable);

        console.log('Processo concluído com sucesso.');
    } catch (error) {
        console.error('Erro durante a execução:', error.message);
    }
}

function transformToWikitextTable(queryResult) {
    // Verifica se há resultados na consulta
    if (!queryResult || !queryResult.results || !queryResult.results.bindings) {
        return 'Nenhum resultado encontrado';
    }

    // Inicializa a tabela wikitext com os cabeçalhos das colunas
    let wikitextTable = `{| class="wikitable"
  |+ Resultados da Consulta
  ! Entidade
  ! Rótulo
  ! Descrição
  ! Alias
  `;

    // Itera sobre os resultados da consulta
    queryResult.results.bindings.forEach((result) => {
        // Extrai os valores das colunas
        const entidade = result.item?.value || 'N/A';
        const rotulo = result.itemLabel?.value || 'N/A';
        const descricao = result.itemDescription?.value || 'N/A';
        const alias = result.itemAltLabel?.value || 'N/A';

        // Adiciona uma linha à tabela wikitext com os valores extraídos
        wikitextTable += `|-
  | ${entidade}
  | ${rotulo}
  | ${descricao}
  | ${alias}
  `;
    });

    // Fecha a tabela wikitext
    wikitextTable += '|}';

    return wikitextTable;
}

main();
