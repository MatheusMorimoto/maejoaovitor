document.addEventListener('DOMContentLoaded', async () => { // Torna o callback assíncrono para usar await
    const token = localStorage.getItem('token');
    const headers = { // Headers permanecem inalterados
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const formatarMoeda = (valor) => {
        return (parseFloat(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // Nova função auxiliar para converter strings financeiras (R$ 1.250,00) em números reais
    const limparValor = (valor) => {
        if (typeof valor === 'number') return valor;
        if (valor === undefined || valor === null || valor === "") return 0;
        
        let limpo = String(valor)
            .replace('R$', '')
            .replace(/\s/g, '')
            .trim();

        // Só remove pontos de milhar se houver uma vírgula indicando formato brasileiro (ex: 1.250,00)
        if (limpo.includes(',')) {
            limpo = limpo.replace(/\./g, '').replace(',', '.');
        }
        
        const parsed = parseFloat(limpo);
        return isNaN(parsed) ? 0 : parsed;
    };

    async function fetchDashboard(endpoint) {
        try {
            const res = await fetch(endpoint, { headers });
            if (!res.ok) throw new Error(`Erro ao carregar ${endpoint}`);
            return await res.json();
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    // Refatora carregarCards para receber os dados como argumento
    const carregarCards = (resumoVendas, resumoLocacoes, auditoria, saldoCaixa) => {
        if (resumoVendas && resumoVendas.resumo) {
            document.getElementById('total-vendas').innerText = resumoVendas.resumo.total_vendas || 0;
            document.getElementById('faturamento').innerText = formatarMoeda(limparValor(resumoVendas.resumo.faturamento_total));
        } else {
            console.warn("Dados de resumo de vendas não disponíveis para cards.");
        }
    
        if (resumoLocacoes && resumoLocacoes.resumo) {
            document.getElementById('locacoes-ativas').innerText = resumoLocacoes.resumo.ativas || 0;
        } else {
            console.warn("Dados de resumo de locações não disponíveis para cards.");
        }
        if (!document.getElementById('locacoes-ativas').innerText) {
            document.getElementById('locacoes-ativas').innerText = '0';
        }

        if (auditoria) {
            // Soma o valor numérico de todas as inconsistências reportadas na auditoria para o card de alerta
            const totalAlertas = Object.values(auditoria).reduce((acc, val) => acc + (parseInt(val) || 0), 0);
            document.getElementById('alertas-auditoria').innerText = totalAlertas;
        }
        if (!document.getElementById('alertas-auditoria').innerText) {
            document.getElementById('alertas-auditoria').innerText = '0';
        }

        // Exibe o Saldo de Caixa Real se houver um elemento correspondente (ex: id="saldo-caixa")
        const elSaldo = document.getElementById('saldo-caixa');
        if (elSaldo && saldoCaixa) {
            elSaldo.innerText = formatarMoeda(limparValor(saldoCaixa.saldo || saldoCaixa.total_caixa || 0));
        }
    };

    // Carrega o gráfico financeiro comparando Débito, Crédito (Vendas Totais), Dinheiro e Pix
    const carregarGraficoFinanceiro = (vendasResponse, financeiroResponse) => {
        if (!financeiroResponse || !financeiroResponse.resumo) return;
        
        const financeiroResumo = financeiroResponse.resumo;

        // Função padronizada para extrair valores de formas de pagamento específicas
        const extrairValorPorForma = (termo, sourceArray) => {
            if (!Array.isArray(sourceArray)) return 0;
            // Filtra todos os itens que correspondem ao termo para somar vendas reais (evita pegar apenas o primeiro)
            const matches = sourceArray.filter(i => 
                (i.label || i.forma_pagamento || i.metodo || i.forma || i.origem || "").toLowerCase().includes(termo.toLowerCase())
            );
            return matches.reduce((acc, item) => {
                return acc + limparValor(item.valor || item.total || item.faturamento || item.total_vendas || item.total_final || item.total_pago || 0);
            }, 0);
        };

        // Define a fonte prioritária para detalhamento para evitar duplicidade na soma manual
        const listaDetalhamento = (financeiroResponse?.por_origem && financeiroResponse.por_origem.length > 0)
            ? financeiroResponse.por_origem
            : (vendasResponse?.por_forma_pagamento || []);

        // Extração de Dinheiro e Pix baseada na estrutura estrita da API Node.js (PostgreSQL)
        // Prioridade 1: comparacao_metodos (Objeto consolidado do backend)
        // Prioridade 2: analise_metodo (Estatísticas detalhadas)
        // Prioridade 3: Fallback para busca manual na lista de origens
        const valorDinheiro = limparValor(financeiroResponse?.comparacao_metodos?.total_dinheiro) || 
                             limparValor(financeiroResponse?.analise_dinheiro?.valor_total_dinheiro) ||
                             limparValor(financeiroResumo?.total_vendas_dinheiro) ||
                             extrairValorPorForma('dinheiro', listaDetalhamento);

        const valorPix = limparValor(financeiroResponse?.comparacao_metodos?.total_pix) || 
                         limparValor(financeiroResponse?.analise_pix?.valor_total_pix) ||
                         limparValor(financeiroResumo?.total_vendas_pix) ||
                         extrairValorPorForma('pix', listaDetalhamento);

        // Puxa as vendas reais para Débito e Crédito. 
        // Tenta buscar na lista de formas de pagamento das vendas antes de usar o resumo financeiro global.
        const totalDebitos = extrairValorPorForma('debito', listaDetalhamento) || limparValor(financeiroResumo?.total_debitos || 0);

        const totalCreditos = extrairValorPorForma('credito', listaDetalhamento) || 
                             limparValor(financeiroResumo?.total_creditos) ||
                             limparValor(financeiroResumo?.total_vendas) ||
                             limparValor(vendasResponse?.resumo?.faturamento_total || 0);

        // Extração de metadados de vendas para detalhamento
        const totalFrete = limparValor(vendasResponse?.resumo?.total_frete);
        const subtotalProdutos = limparValor(vendasResponse?.resumo?.subtotal_produtos);

        const labels = ['Saídas (Débito)', 'Entradas (Crédito)', 'Dinheiro', 'PIX'];
        const dataValues = [
            totalDebitos,
            totalCreditos,
            valorDinheiro,
            valorPix
        ];

        // Popula a tabela de resumo financeiro para demonstração textual dos registros
        const resumoTbody = document.querySelector('#tabela-resumo-financeiro tbody');
        if (resumoTbody) {
            resumoTbody.innerHTML = `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 8px;">Saídas (Débito)</td>
                    <td style="padding: 8px; text-align: right;">${formatarMoeda(dataValues[0])}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 8px;">Entradas (Crédito)</td>
                    <td style="padding: 8px; text-align: right;">${formatarMoeda(dataValues[1])}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee; font-size: 0.9em; color: #666;">
                    <td style="padding: 4px 8px 4px 20px;">└ Subtotal (Produtos)</td>
                    <td style="padding: 4px 8px; text-align: right;">${formatarMoeda(subtotalProdutos)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee; font-size: 0.9em; color: #666;">
                    <td style="padding: 4px 8px 4px 20px;">└ Total em Fretes</td>
                    <td style="padding: 4px 8px; text-align: right;">${formatarMoeda(totalFrete)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee; color: #40A13A; font-weight: bold;">
                    <td style="padding: 8px;">Vendas em Dinheiro</td>
                    <td style="padding: 8px; text-align: right;">${formatarMoeda(dataValues[2])}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee; color: #1C75DB; font-weight: bold;">
                    <td style="padding: 8px;">Vendas em PIX</td>
                    <td style="padding: 8px; text-align: right;">${formatarMoeda(dataValues[3])}</td>
                </tr>
            `;
        }

        const ctx = document.getElementById('chartFinanceiro').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Financeiro Completo (R$)',
                    data: dataValues,
                    backgroundColor: ['#333', '#EF9C00', '#40A13A', '#1C75DB'], // Cinza p/ Débito, Laranja p/ Crédito, Verde p/ dinheiro, Azul p/ pix
                    borderWidth: 1
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
    };

    // Unifica a exibição de locações ativas e devolvidas para uma comparação clara e exata
    const carregarGraficoLocacoes = (response) => {
        if (!response) return;

        const resumo = response.resumo || {};
        const porStatus = Array.isArray(response.por_status) ? response.por_status : [];

        // Função auxiliar para buscar o valor real filtrando pelo status_id (PostgreSQL/Supabase)
        // Conforme a API: 1=Ativa, 2=Devolvida, 3=Cancelada, 4=Atrasada
        const extrairQtd = (idStatus, campoResumo) => {
            const item = porStatus.find(i => (i.status_id == idStatus || i.id == idStatus));
            if (item) {
                return parseFloat(item.quantidade || item.total || item.valor || 0);
            }
            // Fallback para o resumo global caso o ID não esteja na lista detalhada
            return limparValor(resumo[campoResumo] || resumo[`total_${campoResumo}`] || 0);
        };

        // Define rótulos fixos para garantir que as cores correspondam sempre ao status correto (Ativas vs Devolvidas)
        const labels = ['Ativas (Locadas)', 'Devolvidas', 'Atrasadas', 'Canceladas'];
        const dataValues = [
            extrairQtd(1, 'ativas'),  
            extrairQtd(2, 'devolvidas'),
            extrairQtd(4, 'atrasadas'),
            extrairQtd(3, 'canceladas')
        ];

        const ctx = document.getElementById('chartStatusLocacoes').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Quantidade',
                    data: dataValues,
                    backgroundColor: ['#EF9C00', '#40A13A', '#dc3545', '#333'], // Laranja para Ativas, Verde para Devolvidas, Vermelho para Atrasadas
                    borderWidth: 1
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    };

    // Refatora carregarAuditoria para receber os dados como argumento
    const carregarAuditoria = (data) => {
        const tbody = document.querySelector('#tabela-auditoria tbody');
        if (data && tbody) {
            // A API de auditoria retorna um objeto com chaves como "vendas_sem_itens" e seus valores
            const inconsistencias = Object.entries(data);
            tbody.innerHTML = inconsistencias.map(([chave, valor], index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>Integridade</td>
                    <td>${chave.replace(/_/g, ' ').toUpperCase()}</td>
                    <td><span class="status-badge ${parseInt(valor) > 0 ? 'bg-danger' : 'bg-success'}">
                        ${valor} pendências
                    </span></td>
                    <td>${new Date().toLocaleDateString('pt-BR')}</td>
                </tr>
            `).join('');
        }
    };

    // Inicia o carregamento de todos os componentes do Dashboard
    // Carrega todos os dados necessários em uma única chamada Promise.all para otimização
    const [
        resumoVendasData,
        resumoLocacoesData,
        auditoriaData,
        financeiroData,
        saldoCaixaData
    ] = await Promise.all([
        fetchDashboard('/api/dashboard/vendas-relatorio'),
        fetchDashboard('/api/dashboard/locacoes-relatorio'),
        fetchDashboard('/api/dashboard/auditoria-integracao'),
        fetchDashboard('/api/dashboard/financeiro-completo'),
        fetchDashboard('/api/dashboard/saldo-caixa-real')
    ]);

    carregarCards(resumoVendasData, resumoLocacoesData, auditoriaData, saldoCaixaData);
    carregarGraficoFinanceiro(resumoVendasData, financeiroData);
    carregarGraficoLocacoes(resumoLocacoesData);
    carregarAuditoria(auditoriaData);
});