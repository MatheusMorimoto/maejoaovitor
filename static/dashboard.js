document.addEventListener('DOMContentLoaded', async () => { // Torna o callback assíncrono para usar await
    const token = localStorage.getItem('token');
    const headers = { // Headers permanecem inalterados
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const formatarMoeda = (valor) => {
        return (parseFloat(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
    const carregarCards = (resumoVendas, resumoLocacoes, auditoria) => {
        if (resumoVendas && resumoVendas.resumo) {
            document.getElementById('total-vendas').innerText = resumoVendas.resumo.total_vendas || 0;
            document.getElementById('faturamento').innerText = formatarMoeda(parseFloat(resumoVendas.resumo.faturamento_total || 0));
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
    };

    // Carrega o gráfico financeiro comparando Débito, Crédito (Vendas Totais) e Dinheiro
    const carregarGraficoFinanceiro = (vendasResponse, financeiroResponse) => {
        if (!financeiroResponse || !financeiroResponse.resumo) return;
        
        const financeiroResumo = financeiroResponse.resumo;
        const vendasItens = (vendasResponse && vendasResponse.por_forma_pagamento) ? vendasResponse.por_forma_pagamento : [];

        // Localiza o valor específico de 'Dinheiro' dentro do relatório de vendas
        const itemDinheiro = vendasItens.find(i => (i.label || i.forma_pagamento || "").toLowerCase().includes('dinheiro'));
        const valorDinheiro = itemDinheiro ? parseFloat(itemDinheiro.valor || itemDinheiro.total || 0) : 0;

        // Puxa o faturamento total de todas as vendas realizadas para a coluna de Crédito
        const faturamentoTotalVendas = (vendasResponse && vendasResponse.resumo) ? parseFloat(vendasResponse.resumo.faturamento_total || 0) : 0;

        const labels = ['Débito', 'Crédito', 'Dinheiro'];
        const dataValues = [
            parseFloat(financeiroResumo.total_debitos || 0),
            faturamentoTotalVendas,
            valorDinheiro
        ];

        const ctx = document.getElementById('chartFinanceiro').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Financeiro (Débito, Crédito e dinheiro) (R$)',
                    data: dataValues,
                    backgroundColor: ['#333', '#EF9C00', '#40A13A'], // Cinza p/ Débito, Laranja p/ Crédito, Verde p/ Dinheiro
                    borderWidth: 1
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
    };

    // Refatora carregarGraficoLocacoes para receber os dados como argumento
    const carregarGraficoLocacoes = (response) => {
        if (!response || !response.por_status) return; // Mantém a verificação de segurança
        const items = response.por_status;
        const ctx = document.getElementById('chartStatusLocacoes').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: items.map(i => i.label || i.status),
                datasets: [{
                    label: 'Quantidade',
                    data: items.map(i => parseFloat(i.valor || i.quantidade || 0)),
                    backgroundColor: '#333',
                    borderColor: '#EF9C00',
                    borderWidth: 1
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
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
        financeiroData
    ] = await Promise.all([
        fetchDashboard('/api/dashboard/vendas-relatorio'),
        fetchDashboard('/api/dashboard/locacoes-relatorio'),
        fetchDashboard('/api/dashboard/auditoria-integracao'),
        fetchDashboard('/api/dashboard/financeiro-completo')
    ]);

    carregarCards(resumoVendasData, resumoLocacoesData, auditoriaData);
    carregarGraficoFinanceiro(resumoVendasData, financeiroData);
    carregarGraficoLocacoes(resumoLocacoesData);
    carregarAuditoria(auditoriaData);
});