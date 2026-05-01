document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const headers = {
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

    const carregarCards = async () => {
        const data = await fetchDashboard('/api/dashboard/resumo');
        if (data) {
            document.getElementById('total-vendas').innerText = data.total_vendas || 0;
            document.getElementById('faturamento').innerText = formatarMoeda(data.faturamento || 0);
            document.getElementById('locacoes-ativas').innerText = data.locacoes_ativas || 0;
            document.getElementById('alertas-auditoria').innerText = data.alertas_auditoria || 0;
        }
    };

    const carregarGraficoVendas = async () => {
        const data = await fetchDashboard('/api/dashboard/vendas-relatorio');
        if (!data) return;
        const ctx = document.getElementById('chartVendasPagamento').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(i => i.label || i.forma_pagamento),
                datasets: [{
                    label: 'Vendas (R$)',
                    data: data.map(i => i.valor || i.total),
                    backgroundColor: '#EF9C00',
                    borderColor: '#333',
                    borderWidth: 1
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
    };

    const carregarGraficoLocacoes = async () => {
        const data = await fetchDashboard('/api/dashboard/locacoes-relatorio');
        if (!data) return;
        const ctx = document.getElementById('chartStatusLocacoes').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(i => i.label || i.status),
                datasets: [{
                    label: 'Quantidade',
                    data: data.map(i => i.valor || i.quantidade),
                    backgroundColor: '#333',
                    borderColor: '#EF9C00',
                    borderWidth: 1
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
    };

    const carregarGraficoFinanceiro = async () => {
        const data = await fetchDashboard('/api/dashboard/financeiro-completo');
        if (!data) return;
        const ctx = document.getElementById('chartFinanceiro').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Créditos', 'Débitos'],
                datasets: [{
                    label: 'Valor (R$)',
                    data: [data.creditos || 0, data.debitos || 0],
                    backgroundColor: ['#EF9C00', '#333'],
                    borderWidth: 1
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
    };

    const carregarAuditoria = async () => {
        const data = await fetchDashboard('/api/dashboard/auditoria-integracao');
        const tbody = document.querySelector('#tabela-auditoria tbody');
        if (data && Array.isArray(data)) {
            tbody.innerHTML = data.map(item => `
                <tr>
                    <td>${item.id}</td>
                    <td>${item.modulo}</td>
                    <td>${item.evento}</td>
                    <td><span class="status-badge">${item.status}</span></td>
                    <td>${new Date(item.data).toLocaleString('pt-BR')}</td>
                </tr>
            `).join('');
        }
    };

    carregarCards();
    carregarGraficoVendas();
    carregarGraficoLocacoes();
    carregarGraficoFinanceiro();
    carregarAuditoria();
});