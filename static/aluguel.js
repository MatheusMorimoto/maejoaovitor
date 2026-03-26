/**
 * locacao.js
 * Lógica para manipulação do formulário de locação/aluguel
 */

function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseMoeda(valorStr) {
    if (!valorStr) return 0;
    // Se já for um número (de um input type="number"), retorna o float direto
    if (typeof valorStr === 'number') return valorStr;
    // Se for uma string numérica simples (ex: "10.50" vindo de um input number), não remove o ponto
    if (typeof valorStr === 'string' && !valorStr.includes('R$') && !valorStr.includes(',')) {
        return parseFloat(valorStr) || 0;
    }
    let limpo = valorStr.toString().replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
    return parseFloat(limpo) || 0;
}

// Carrega clientes da API
async function carregarClientesLocacao() {
    try {
        const response = await fetch('/api/clientes');
        const clientes = await response.json();
        const select = document.querySelector('select[name="cliente_id"]');
        if (select) {
            select.innerHTML = '<option value="">Selecione um cliente...</option>';
            clientes.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.text = c.nome;
                select.appendChild(opt);
            });
        }
    } catch (error) {
        console.error("Erro ao carregar clientes:", error);
    }
}

// 1. Carrega produtos filtrados por 'aluguel' ou 'ambos'
async function carregarProdutosLocacao() {
    try {
        const response = await fetch('/api/produtos');
        const produtos = await response.json();

        // Filtra produtos para locação
        const produtosLocacao = produtos.filter(p => p.tipo === 'aluguel' || p.tipo === 'ambos');

        const selects = document.querySelectorAll('select[name="produto_id[]"]');
        selects.forEach(select => {
            const valorAtual = select.value;
            select.innerHTML = '<option value="" data-preco="0">Selecione o produto...</option>';
            
            produtosLocacao.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.text = p.nome;
                // Usa o preço de locação/diária vindo da API
                opt.setAttribute('data-preco', p.preco_aluguel || p.preco_venda); 
                if (p.id == valorAtual) opt.selected = true;
                select.appendChild(opt);
            });
        });
    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
    }
}

function atualizarPreco(selectElement) {
    const option = selectElement.options[selectElement.selectedIndex];
    const preco = parseFloat(option.getAttribute('data-preco')) || 0;
    const row = selectElement.closest('.item-row');
    const valorInput = row.querySelector('.preco-diario'); // Ajustado nome da classe
    
    valorInput.value = formatarMoeda(preco);
    calcularSubtotal(selectElement);
}

// 2. Cálculo do Subtotal incluindo a "Quantidade de Dias"
function calcularSubtotal(element) {
    const row = element.closest('.item-row');
    if (!row) return;
    
    const qtdItemInput = row.querySelector('input[name="quantidade[]"]');
    const valorInput = row.querySelector('.preco-diario');
    const subtotalInput = row.querySelector('.subtotal');
    
    const qtdItem = parseFloat(qtdItemInput.value) || 0;
    const valorDiario = parseMoeda(valorInput.value);
    
    // Pega a quantidade de dias do cabeçalho
    const diasInput = document.getElementById('quantidade_dias');
    const qtdDias = parseInt(diasInput ? diasInput.value : 1) || 1;
    
    // Cálculo: (Qtd Itens * Valor Diário) * Total de Dias
    const subtotal = (qtdItem * valorDiario) * qtdDias;
    if (subtotalInput) subtotalInput.value = formatarMoeda(subtotal);
    
    calcularTotalGeral();
}

// 3. Soma subtotais + frete
function calcularTotalGeral() {
    const subtotais = document.querySelectorAll('.subtotal');
    let totalItens = 0;
    
    subtotais.forEach(input => {
        totalItens += parseMoeda(input.value);
    });
    
    const freteInput = document.getElementById('valor_frete');
    const frete = parseMoeda(freteInput.value);
    
    const totalGeral = totalItens + frete;
    
    const displayTotal = document.getElementById('display-total-geral');
    if (displayTotal) {
        displayTotal.innerText = formatarMoeda(totalGeral);
    }
}

// 4. Adiciona nova linha de produto para locação
function adicionarItem() {
    const container = document.querySelector('.secao-itens');
    const primeiraLinha = container.querySelector('.item-row');
    
    // Clona a primeira linha (mantendo os eventos inline do HTML como onchange)
    const novaLinha = primeiraLinha.cloneNode(true);
    
    // Limpa os valores dos campos na nova linha
    novaLinha.querySelector('select').selectedIndex = 0;
    novaLinha.querySelector('input[name="quantidade[]"]').value = 1;
    novaLinha.querySelector('.preco-diario').value = 'R$ 0,00';
    novaLinha.querySelector('.subtotal').value = 'R$ 0,00';
    
    // Insere a nova linha antes do botão "+ Adicionar Item"
    const btnAdd = container.querySelector('.btn-add-item');
    container.insertBefore(novaLinha, btnAdd);
}

// 5. Remove uma linha de produto
function removerItem(btn) {
    const container = document.querySelector('.secao-itens');
    if (container.querySelectorAll('.item-row').length > 1) {
        btn.closest('.item-row').remove();
        calcularTotalGeral();
    } else {
        alert("A locação precisa ter pelo menos um item.");
    }
}

// 6. Envio dos dados para a rota de locação
async function finalizarLocacao(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    const itens = [];
    document.querySelectorAll('.item-row').forEach(row => {
        const produtoId = row.querySelector('select[name="produto_id[]"]').value;
        if (produtoId) {
            itens.push({
                produto_id: parseInt(produtoId),
                quantidade: parseInt(row.querySelector('input[name="quantidade[]"]').value),
                valor_diario: parseMoeda(row.querySelector('.preco-diario').value)
            });
        }
    });

    const dados = {
        cliente_id: parseInt(formData.get('cliente_id')),
        data_inicio: formData.get('data_inicio'),
        quantidade_dias: parseInt(formData.get('quantidade_dias')),
        forma_pagamento: formData.get('pagamento'),
        frete_valor: parseFloat(formData.get('valor_frete')) || 0,
        total: parseMoeda(document.getElementById('display-total-geral').innerText),
        itens: itens
    };

    try {
        const response = await fetch('/salvar_aluguel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        if (response.ok) {
            alert("Locação registrada com sucesso!");
            window.location.reload();
        }
    } catch (error) {
        console.error("Erro:", error);
    }
}

// Listeners
document.addEventListener('DOMContentLoaded', () => {
    carregarProdutosLocacao();
    carregarClientesLocacao();

    // Listener para o botão de adicionar item
    const btnAdd = document.querySelector('.btn-add-item');
    if (btnAdd) {
        btnAdd.addEventListener('click', adicionarItem);
    }

    // Listener para os botões de remover (usando delegação para funcionar em itens novos)
    const containerItens = document.querySelector('.secao-itens');
    if (containerItens) {
        containerItens.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('btn-remove')) {
                removerItem(e.target);
            }
        });
    }

    // Recalcula tudo se mudar a quantidade de dias no topo
    const diasInput = document.getElementById('quantidade_dias');
    if (diasInput) {
        diasInput.addEventListener('input', () => {
            document.querySelectorAll('select[name="produto_id[]"]').forEach(s => calcularSubtotal(s));
        });
    }

    const form = document.getElementById('form-locacao');
    if (form) form.addEventListener('submit', finalizarLocacao);
});