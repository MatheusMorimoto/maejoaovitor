/**
 * vendas.js
 * Lógica para manipulação do formulário de vendas
 */

// Formata valores monetários para o padrão BRL
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Converte string de moeda (R$ 1.000,00) para float
function parseMoeda(valorStr) {
    if (valorStr === undefined || valorStr === null || valorStr === "") return 0;
    if (typeof valorStr === 'number') return valorStr;
    
    let limpo = String(valorStr)
        .replace('R$', '')
        .replace(/\s/g, '')
        .trim();

    // Se houver vírgula, assume formato brasileiro (1.000,00) e remove pontos de milhar
    if (limpo.includes(',')) {
        limpo = limpo.replace(/\./g, '').replace(',', '.');
    }
    
    const parsed = parseFloat(limpo);
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Carrega a lista de clientes no select de clientes
 */
async function carregarClientesVenda() {
    try {
        const response = await fetch('/api/clientes');
        const clientes = await response.json();
        const select = document.querySelector('select[name="cliente_id"]');

        if (select && Array.isArray(clientes)) {
            const valorAtual = select.value;
            select.innerHTML = '<option value="">Selecione um cliente...</option>';
            clientes.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.text = c.nome;
                if (c.id == valorAtual) opt.selected = true;
                select.appendChild(opt);
            });
        }
    } catch (error) {
        console.error("Erro ao carregar clientes:", error);
    }
}

// Atualiza o preço unitário quando um produto é selecionado
/**
 * Carrega produtos filtrados pelo tipo (venda/aluguel) nos selects
 */
async function carregarProdutosVenda() {
    try {
        // Busca da sua própria API Flask que já sanitiza os dados
        const response = await fetch('/api/produtos');
        const produtos = await response.json();

        // Filtra apenas produtos que são do tipo 'venda' ou 'ambos'
        const produtosVenda = produtos.filter(p => {
            const tipo = (p.tipo || "").toLowerCase().trim();
            return tipo === 'venda' || tipo === 'ambos';
        });

        const selects = document.querySelectorAll('select[name="produto_id[]"]');
        selects.forEach(select => {
            const valorAtual = select.value;
            select.innerHTML = '<option value="" data-preco="0">Selecione um produto</option>';
            
            produtosVenda.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.text = p.nome;
                opt.setAttribute('data-preco', p.preco_venda);
                if (p.id == valorAtual) opt.selected = true;
                select.appendChild(opt);
            });
        });
    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
    }
}

// Atualiza o preço unitário e calcula subtotal (chamado pelo HTML)
function atualizarPreco(selectElement) {
    const option = selectElement.options[selectElement.selectedIndex];
    const preco = parseFloat(option.getAttribute('data-preco')) || 0;
    
    const row = selectElement.closest('.item-row');
    const valorInput = row.querySelector('.preco-unitario');
    
    valorInput.value = formatarMoeda(preco);
    calcularSubtotal(selectElement);
}

// Calcula Quantidade * Valor Unitário
function calcularSubtotal(element) {
    const row = element.closest('.item-row');
    
    const qtdInput = row.querySelector('input[name="quantidade[]"]');
    const valorInput = row.querySelector('.preco-unitario');
    const subtotalInput = row.querySelector('.subtotal');
    
    const qtd = parseFloat(qtdInput.value) || 0;
    const valor = parseMoeda(valorInput.value);
    
    const subtotal = qtd * valor;
    subtotalInput.value = formatarMoeda(subtotal);
    
    calcularTotalGeral();
}

// Soma todos os subtotais + frete
function calcularTotalGeral() {
    const subtotais = document.querySelectorAll('.subtotal');
    let totalItens = 0;
    
    subtotais.forEach(input => {
        totalItens += parseMoeda(input.value);
    });
    
    const freteInput = document.getElementById('frete');
    const frete = parseMoeda(freteInput.value);
    
    const totalGeral = totalItens + frete;
    
    // Atualiza o display visual
    const displayTotal = document.getElementById('display-total');
    if (displayTotal) {
        displayTotal.innerText = formatarMoeda(totalGeral);
    }
    
    // Atualiza o input hidden que vai para o backend
    const inputTotal = document.getElementById('total_venda');
    if (inputTotal) {
        inputTotal.value = totalGeral.toFixed(2);
    }
}

// Adiciona nova linha de produto
function adicionarItem() {
    const container = document.getElementById('lista-itens');
    const primeiraLinha = container.querySelector('.item-row');
    
    // Clona a primeira linha
    const novaLinha = primeiraLinha.cloneNode(true);
    
    // Limpa os valores dos inputs da nova linha
    novaLinha.querySelector('select').selectedIndex = 0;
    novaLinha.querySelector('input[name="quantidade[]"]').value = 1;
    novaLinha.querySelector('.preco-unitario').value = 'R$ 0,00';
    novaLinha.querySelector('.subtotal').value = 'R$ 0,00';
    
    container.appendChild(novaLinha);
}

// Remove linha de produto
function removerItem(btn) {
    const row = btn.closest('.item-row');
    const container = document.getElementById('lista-itens');
    
    // Impede remover a última linha restante
    if (container.querySelectorAll('.item-row').length > 1) {
        row.remove();
        calcularTotalGeral();
    } else {
        alert("A venda precisa ter pelo menos um item.");
    }
}

// Função para enviar os dados da venda via JSON (incluindo itens) para o backend
async function finalizarVenda(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const dataRaw = formData.get('data');
    if (!dataRaw) {
        alert("Por favor, preencha a data da venda.");
        return;
    }

    // Coleta a lista de itens da venda percorrendo as linhas da tabela
    const itens = [];
    const rows = document.querySelectorAll('.item-row');
    rows.forEach(row => {
        const produtoId = row.querySelector('select[name="produto_id[]"]').value;
        if (produtoId) {
            itens.push({
                produto_id: parseInt(produtoId),
                quantidade: parseInt(row.querySelector('input[name="quantidade[]"]').value) || 0,
                valor_unitario: parseMoeda(row.querySelector('.preco-unitario').value) || 0 // Garante que seja 0 se parseMoeda retornar null
            });
        }
    });

    if (itens.length === 0) {
        alert("Selecione pelo menos um produto para a venda.");
        return;
    }

    // Conforme a especificação "Vendas mais consistentes" e o SQL (ENUM):
    // 1. Normalizamos a forma de pagamento para os valores aceitos: dinheiro, pix, cartao, boleto.
    // 2. Incluímos valor_total e data para garantir a integridade dos registros financeiros e estoque.
    const freteNumerico = parseMoeda(document.getElementById('frete')?.value);
    const freteFormatadoApi = "R$ " + freteNumerico.toFixed(2).replace('.', ',');
    const valorTotalVenda = parseFloat(document.getElementById('total_venda')?.value) || 0;

    const formaPagamentoRaw = (formData.get('forma_pagamento') || "").trim();
    let formaPagamentoLimpa = formaPagamentoRaw.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove acentos (Crédito -> credito)

    // Mapeamento para o ENUM do Banco de Dados ('dinheiro','pix','cartao','boleto')
    if (formaPagamentoLimpa === 'credito' || formaPagamentoLimpa === 'debito') {
        formaPagamentoLimpa = 'cartao';
    }

    const dados = {
        cliente_id: parseInt(formData.get('cliente_id')) || 0,
        forma_pagamento: formaPagamentoLimpa,
        frete_valor: freteFormatadoApi,
        valor_total: valorTotalVenda,
        data: dataRaw,
        itens: itens
    };

    // Validações antes do envio
    if (!dados.forma_pagamento || dados.forma_pagamento.trim() === "") {
        alert("Por favor, selecione uma forma de pagamento.");
        return;
    }
    if (dados.cliente_id === 0) {
        alert("Por favor, selecione um cliente válido para a venda.");
        return; // Impede o envio da venda
    }
    console.log("Dados da venda sendo enviados para a API externa:", dados); // DEBUG: Verifique este log no console do navegador

    try {
        const response = await fetch('/api/vendas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        if (response.ok) {
            alert("Venda realizada com sucesso!");
            window.location.reload();
        } else {
            const erroData = await response.json();
            alert(`Erro ao salvar venda: ${erroData.message || "Verifique os dados na API externa."}`);
        }
    } catch (error) {
        console.error("Erro ao enviar venda:", error);
    }
}

/**
 * Busca e renderiza o histórico de vendas na tabela usando os novos campos
 */
async function carregarHistoricoVendas() {
    const tbody = document.querySelector('#tabela-vendas tbody');
    if (!tbody) return;

    try {
        const response = await fetch('/api/vendas');
        const vendas = await response.json();

        if (vendas && Array.isArray(vendas)) {
            tbody.innerHTML = vendas.map(v => `
                <tr>
                    <td>${v.id || '-'}</td>
                    <td>${v.cliente_nome || 'Cliente não identificado'}</td>
                    <td>${v.vendedor || '-'}</td>
                    <td>${formatarMoeda(v.valor_total || 0)}</td>
                    <td><span class="status-badge">${v.status || 'Pendente'}</span></td>
                    <td>${v.data || '-'}</td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error("Erro ao carregar histórico:", error);
    }
}

// Event Listeners globais ao carregar
document.addEventListener('DOMContentLoaded', () => {
    // Garante que apenas produtos de venda apareçam (opcional, se o Jinja já não filtrar)
    carregarClientesVenda();
    carregarProdutosVenda();
    carregarHistoricoVendas();

    const form = document.querySelector('.form-venda');
    if (form) {
        form.addEventListener('submit', finalizarVenda);
    }

    const freteInput = document.getElementById('frete');

    if (freteInput) {
        // 1. Define o valor inicial com o R$
        freteInput.value = 'R$ ';

        // 2. Escuta mudanças e impede que o R$ seja apagado
        freteInput.addEventListener('input', (e) => {
            let valor = e.target.value;

            // Se o usuário tentar apagar o R$, ele é reinserido na hora
            if (!valor.startsWith('R$ ')) {
                e.target.value = 'R$ ' + valor.replace('R$', '').trim();
            }

            // Chama sua função original de cálculo
            calcularTotalGeral();
        });

        freteInput.addEventListener('change', calcularTotalGeral);
    }
});