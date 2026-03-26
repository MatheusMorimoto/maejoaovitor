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
    if (!valorStr) return 0;
    // Remove R$, espaços e pontos de milhar, troca vírgula por ponto
    let limpo = valorStr.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
    return parseFloat(limpo) || 0;
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
        const produtosVenda = produtos.filter(p => p.tipo === 'venda' || p.tipo === 'ambos');

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
    
    // Coleta a lista de itens da venda percorrendo as linhas da tabela
    const itens = [];
    const rows = document.querySelectorAll('.item-row');
    rows.forEach(row => {
        const produtoId = row.querySelector('select[name="produto_id[]"]').value;
        if (produtoId) {
            itens.push({
                produto_id: parseInt(produtoId),
                quantidade: parseInt(row.querySelector('input[name="quantidade[]"]').value) || 0,
                preco_unitario: parseMoeda(row.querySelector('.preco-unitario').value)
            });
        }
    });

    const dados = {
        cliente_id: parseInt(formData.get('cliente_id')) || null,
        data: formData.get('data'),
        pagamento: formData.get('forma_pagamento'),
        total: parseFloat(document.getElementById('total_venda').value) || 0,
        frete: parseMoeda(formData.get('frete')) || 0,
        itens: itens
    };

    try {
        const response = await fetch('/salvar_venda', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        if (response.ok) {
            alert("Venda realizada com sucesso!");
            window.location.reload();
        } else {
            alert("Erro ao salvar venda na API externa.");
        }
    } catch (error) {
        console.error("Erro ao enviar venda:", error);
    }
}

// Event Listeners globais ao carregar
document.addEventListener('DOMContentLoaded', () => {
    // Garante que apenas produtos de venda apareçam (opcional, se o Jinja já não filtrar)
    carregarProdutosVenda();

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