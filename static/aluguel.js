/**
 * aluguel.js
 * Lógica para manipulação do formulário de locação/aluguel
 */

// Formata valores monetários para o padrão BRL
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseMoeda(valorStr) {
    if (!valorStr || valorStr === "R$ 0,00" || valorStr === "R$ ") return 0;
    if (typeof valorStr === 'number') return valorStr;
    
    // Remove R$, espaços e pontos de milhar, troca vírgula por ponto
    let limpo = String(valorStr)
        .replace(/R\$/g, '')
        .replace(/[\s\xa0]/g, '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim();
    
    return parseFloat(limpo) || 0;
}

/**
 * Carrega a lista de clientes no select de clientes (conforme solicitado)
 */
async function carregarClientesAluguel() {
    try {
        const response = await fetch('/api/clientes');
        const clientes = await response.json();
        const select = document.getElementById('cliente_id') || document.querySelector('select[name="cliente_id"]');

        if (select && Array.isArray(clientes)) {
            const valorAtual = select.value;
            select.innerHTML = '<option value="">Selecione um cliente...</option>';
            clientes.forEach(c => {
                const opt = document.createElement('option');
                opt.value = parseInt(c.id);
                opt.text = c.nome;
                if (parseInt(c.id) == valorAtual) opt.selected = true;
                select.appendChild(opt);
            });
        }
    } catch (error) {
        console.error("Erro ao carregar clientes:", error);
    }
}

/**
 * Carrega produtos com lógica estrita de fallback e filtragem por tipo
 */
async function carregarProdutosAluguel() {
    try {
        const response = await fetch('/api/produtos');
        const dados = await response.json();
        const produtos = Array.isArray(dados) ? dados : [];

        // REGRA: Filtro idêntico ao vendas.js, mas para o tipo aluguel
        const produtosFiltrados = produtos.filter(p => {
            const tipo = (p.tipo || "").toLowerCase().trim();
            return tipo === 'aluguel' || tipo === 'ambos';
        });

        const selects = document.querySelectorAll('select[name="produto_id[]"]');
        selects.forEach(select => {
            const valorAtual = select.value;
            select.innerHTML = '<option value="" data-preco="0">Selecione um produto...</option>';
            
            produtosFiltrados.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id; 
                opt.text = p.nome;
                
                // REGRA 2: Consumo de API com Fallback de preço (Locação -> Venda -> 0)
                const precoParaUso = (parseFloat(p.valor_locacao) > 0) ? p.valor_locacao : (p.preco_venda || 0);
                opt.setAttribute('data-preco', precoParaUso);
                
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
    const preco = parseFloat(option?.getAttribute('data-preco')) || 0;
    
    const row = selectElement.closest('.item-row');
    const valorInput = row.querySelector('.preco-unitario');
    
    if (valorInput) {
        valorInput.value = formatarMoeda(preco);
        calcularSubtotal(selectElement);
    }
}

// Calcula (Quantidade * Valor Unitário) * Dias
function calcularSubtotal(element) {
    const row = element.closest('.item-row');
    
    const qtdInput = row.querySelector('input[name="quantidade[]"]');
    const valorInput = row.querySelector('.preco-unitario');
    const subtotalInput = row.querySelector('.subtotal');
    const diasInput = document.getElementById('quantidade_dias');
    
    const qtd = parseInt(qtdInput.value) || 0;
    const valor = parseMoeda(valorInput.value);
    
    // REGRA 3: Cálculo obrigatório (Quantidade * Preço Unitário) * Dias
    const dias = Math.max(parseInt(diasInput?.value) || 1, 1);
    
    const subtotal = (qtd * valor) * dias;
    subtotalInput.value = formatarMoeda(subtotal);
    
    calcularTotalGeral();
}

/**
 * Calcula a Data de Devolução somando a Quantidade de Dias à Data de Início
 */
function atualizarDataPelaQuantidadeDias() {
    const dataInicioInput = document.querySelector('input[name="data_inicio"]');
    const dataFimInput = document.querySelector('input[name="data_prevista_devolucao"]');
    const diasInput = document.getElementById('quantidade_dias');

    if (dataInicioInput?.value) {
        const dataInicio = new Date(dataInicioInput.value);
        const dias = parseInt(diasInput.value) || 1;
        
        const dataFim = new Date(dataInicio);
        dataFim.setDate(dataFim.getDate() + dias);
        
        const offset = dataFim.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(dataFim - offset)).toISOString().slice(0, 16);
        dataFimInput.value = localISOTime;
    }
}

/**
 * Calcula a Quantidade de Dias com base na diferença entre Início e Fim (Calendário)
 */
function atualizarQuantidadeDiasPelaData() {
    const dataInicioInput = document.querySelector('input[name="data_inicio"]');
    const dataFimInput = document.querySelector('input[name="data_prevista_devolucao"]');
    const diasInput = document.getElementById('quantidade_dias');

    if (dataInicioInput?.value && dataFimInput?.value) {
        const dataInicio = new Date(dataInicioInput.value);
        const dataFim = new Date(dataFimInput.value);
        
        const diffTime = dataFim - dataInicio;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 0) {
            diasInput.value = diffDays;
            // REGRA 3: Recálculo em Cadeia ao mudar dias via data
            recalcularTodosItens();
        }
    }
}

// Soma todos os subtotais + frete
function calcularTotalGeral() {
    const subtotais = document.querySelectorAll('.subtotal');
    let totalItens = 0;
    
    subtotais.forEach(input => {
        totalItens += parseMoeda(input.value);
    });
    
    const freteInput = document.getElementById('frete');
    const frete = parseMoeda(freteInput?.value);
    
    const totalGeral = totalItens + frete;
    
    const displayTotal = document.getElementById('display-total');
    if (displayTotal) {
        displayTotal.innerText = formatarMoeda(totalGeral);
    }
    
    const inputTotal = document.getElementById('total_venda'); 
    if (inputTotal) {
        inputTotal.value = totalGeral.toFixed(2);
    }
}

/**
 * Percorre todos os itens para atualizar subtotais (Cálculo em Cadeia)
 */
function recalcularTodosItens() {
    document.querySelectorAll('.item-row select[name="produto_id[]"]').forEach(select => {
        calcularSubtotal(select);
    });
}

// Event Listeners para inicialização e cálculos automáticos
document.addEventListener('DOMContentLoaded', () => {
    carregarClientesAluguel();
    carregarProdutosAluguel();
    carregarHistoricoLocacoes();

    const form = document.querySelector('.form-locacao');
    if (form) {
        form.addEventListener('submit', finalizarLocacao);
    }

    // Monitora mudanças nos campos de data e dias para atualizar cálculos
    const diasInput = document.getElementById('quantidade_dias');
    const dataInicioInput = document.querySelector('input[name="data_inicio"]');
    const dataFimInput = document.querySelector('input[name="data_prevista_devolucao"]');

    // Tratamento especial para o campo de Frete (igual ao vendas.js)
    const freteInput = document.getElementById('frete');
    if (freteInput) {
        if (!freteInput.value) freteInput.value = 'R$ 0,00';
        
        freteInput.addEventListener('input', (e) => {
            let valor = e.target.value;
            if (!valor.startsWith('R$ ')) {
                e.target.value = 'R$ ' + valor.replace('R$', '').trim();
            }
            calcularTotalGeral();
        });

        freteInput.addEventListener('change', () => {
            calcularTotalGeral();
        });
    }

    if (diasInput) {
        diasInput.addEventListener('input', () => {
            // REGRA 3: Se mudar os dias, atualiza a data e recalcula itens
            atualizarDataPelaQuantidadeDias();
            recalcularTodosItens();
        });
    }
    
    // Monitora mudança na quantidade de cada linha
    document.addEventListener('input', (e) => {
        if (e.target.name === 'quantidade[]') {
            calcularSubtotal(e.target);
        }
    });

    // Monitora a seleção de produtos para atualizar o preço unitário
    document.addEventListener('change', (e) => {
        if (e.target.name === 'produto_id[]') {
            atualizarPreco(e.target);
        }
    });

    if (dataInicioInput) {
        dataInicioInput.addEventListener('change', () => {
            atualizarDataPelaQuantidadeDias();
            recalcularTodosItens();
        });
    }

    if (dataFimInput) {
        dataFimInput.addEventListener('change', atualizarQuantidadeDiasPelaData);
    }
});

/**
 * Adiciona nova linha de produto
 */
function adicionarItem() {
    const container = document.getElementById('lista-itens');
    if (!container) return;
    
    const primeiraLinha = container.querySelector('.item-row');
    if (!primeiraLinha) return;
    const novaLinha = primeiraLinha.cloneNode(true);
    
    // Limpa os valores para a nova linha
    novaLinha.querySelector('select').selectedIndex = 0;
    novaLinha.querySelector('input[name="quantidade[]"]').value = 1;
    novaLinha.querySelector('.preco-unitario').value = 'R$ 0,00';
    novaLinha.querySelector('.subtotal').value = 'R$ 0,00';
    
    container.appendChild(novaLinha);
}

/**
 * Remove linha de produto
 */
function removerItem(btn) {
    const row = btn.closest('.item-row');
    if (document.querySelectorAll('.item-row').length > 1) {
        row.remove();
        calcularTotalGeral();
    } else {
        alert("A locação precisa ter pelo menos um item.");
    }
}

/**
 * Envia os dados da locação via JSON para o backend
 */
async function finalizarLocacao(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    const dataInicioRaw = formData.get('data_inicio');
    const dataDevolucaoRaw = formData.get('data_prevista_devolucao');
    const freteRaw = formData.get('frete');

    if (!dataInicioRaw || !dataDevolucaoRaw) {
        alert("Por favor, preencha as datas de início e devolução.");
        return;
    }

    const itens = [];
    document.querySelectorAll('.item-row').forEach(row => {
        const produtoId = row.querySelector('select[name="produto_id[]"]').value;
        if (produtoId) {
            itens.push({
                produto_id: parseInt(produtoId),
                quantidade: parseInt(row.querySelector('input[name="quantidade[]"]').value) || 0,
                valor_unitario: parseMoeda(row.querySelector('.preco-unitario').value)
            });
        }
    });

    if (itens.length === 0) {
        alert("Adicione pelo menos um produto para a locação.");
        return;
    }
    
    // REGRA 1: Estrutura do Payload com Tipagem Estrita, seguindo EXATAMENTE o esquema fornecido
    // Nota: Se a API espera múltiplos itens, o esquema fornecido está incompleto.
    // Esta implementação envia apenas os dados do primeiro item da lista.
    const dados = {
        cliente_id: parseInt(formData.get('cliente_id')) || 0,
        produto_id: parseInt(itens[0].produto_id),
        quantidade: parseInt(itens[0].quantidade), 
        valor_unitario: parseFloat(itens[0].valor_unitario), 
        frete_valor: parseFloat(parseMoeda(freteRaw)) || 0.0,
        data_inicio: new Date(dataInicioRaw).toISOString(), 
        data_prevista_devolucao: new Date(dataDevolucaoRaw).toISOString(), 
    };

    try {
        const response = await fetch('/api/locacoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        if (response.ok) {
            alert("Locação registrada com sucesso!");
            window.location.reload();
        } else {
            // REGRA 4: Feedback de Erro (HTTP 400 ou 500)
            const erro = await response.json();
            alert(`Erro na API: ${erro.message || 'Verifique os dados enviados.'}`);
        }
    } catch (error) {
        alert("Erro fatal ao processar locação. Verifique os dados e tente novamente.");
    }
}

/**
 * Busca e renderiza o histórico de locações
 */
async function carregarHistoricoLocacoes() {
    const tbody = document.querySelector('#tabela-locacoes tbody');
    if (!tbody) return;

    try {
        const response = await fetch('/api/locacoes');
        const locacoes = await response.json();

        if (locacoes && Array.isArray(locacoes)) {
            // Injeta o cabeçalho de Ações se ele não existir no HTML
            const headerRow = document.querySelector('#tabela-locacoes thead tr');
            if (headerRow && !headerRow.querySelector('.col-acoes')) {
                const th = document.createElement('th');
                th.textContent = 'Ações';
                th.className = 'col-acoes';
                headerRow.appendChild(th);
            }

            tbody.innerHTML = locacoes.map(l => `
                <tr>
                    <td>${l.id || '-'}</td>
                    <td>${l.cliente_nome || 'Cliente não identificado'}</td>
                    <td>${l.data_inicio ? new Date(l.data_inicio).toLocaleDateString('pt-BR') : '-'}</td>
                    <td>${l.data_prevista_devolucao ? new Date(l.data_prevista_devolucao).toLocaleDateString('pt-BR') : '-'}</td>
                    <td>${formatarMoeda(parseFloat(l.valor_total) || 0)}</td>
                    <td><span class="status-badge">${l.status || 'Ativo'}</span></td>
                    <td>
                        <button onclick="verDetalhesLocacao(${l.id})" class="btn-acao-tabela btn-ver">Itens</button>
                        ${(l.status || 'Ativo').toLowerCase() !== 'devolvido' ? `<button onclick="devolverLocacao(${l.id}, event)" class="btn-acao-tabela btn-devolucao">Devolver</button>` : ''}
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error("Erro ao carregar histórico de locações:", error);
    }
}

/**
 * Busca detalhes da locação e exibe o que foi alocado
 */
async function verDetalhesLocacao(id) {
    try {
        const response = await fetch(`/api/locacoes/${id}`);
        const locacao = await response.json();
        
        if (!locacao || (!locacao.itens && !locacao.produto_id)) {
            alert("Detalhes não encontrados.");
            return;
        }

        // Normaliza itens para suportar tanto retorno de lista quanto objeto único (fallback)
        const itens = locacao.itens || [{
            produto_id: locacao.produto_id,
            produto_nome: locacao.produto_nome || `Produto #${locacao.produto_id}`,
            quantidade: locacao.quantidade,
            valor_unitario: locacao.valor_unitario,
            produto_descricao: locacao.produto_descricao || locacao.descricao || '-'
        }];

        // Cria o Modal dinamicamente
        let modal = document.getElementById('modal-detalhes-locacao');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modal-detalhes-locacao';
            modal.className = 'modal-overlay-custom';
            document.body.appendChild(modal);
        }

        const rowsHtml = itens.map(i => {
            // Tenta capturar a descrição de forma mais precisa de várias fontes possíveis
            const desc = i.produto_descricao || i.descricao || (i.produto && i.produto.descricao) || '-';
            return `
                <tr>
                    <td style="text-align: left; font-weight: 600;">${i.produto_nome || 'Produto'}</td>
                    <td>${i.quantidade}</td>
                    <td>${formatarMoeda(i.valor_unitario || 0)}</td>
                    <td class="col-descricao-detalhada">${desc}</td>
                    <td>
                        <button onclick="renovarItem(${id}, ${i.produto_id})" class="btn-mini btn-renovar" title="Renovar este item">Renovar</button>
                        <button onclick="devolverItem(${id}, ${i.produto_id}, event)" class="btn-mini btn-devolver" title="Devolver este item">Devolver</button>
                    </td>
                </tr>
            `;
        }).join('');

        modal.innerHTML = `
            <div class="modal-content-custom">
                <div class="modal-header-custom">
                    <h3>Itens da Locação #${id}</h3>
                    <button onclick="fecharModalDetalhes()" class="btn-fechar">&times;</button>
                </div>
                <div class="modal-body-custom">
                    <p><strong>Cliente:</strong> ${locacao.cliente_nome || 'N/A'}</p>
                    <div class="tabela-scroll">
                        <table class="tabela-itens-modal">
                            <thead>
                                <tr>
                                    <th style="text-align: left;">Produto</th>
                                    <th>Qtd</th>
                                    <th>Preço Un.</th>
                                    <th style="text-align: left;">Descrição</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>${rowsHtml}</tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer-custom">
                    <button onclick="renovarLocacaoCompleta(${id})" class="btn-acao-modal btn-renovar-tudo">Renovar Tudo</button>
                    <button onclick="devolverLocacao(${id}, event)" class="btn-acao-modal btn-devolver-tudo">Devolver Tudo</button>
                </div>
            </div>
        `;
        modal.style.display = 'flex';

    } catch (error) {
        console.error("Erro ao buscar detalhes:", error);
        alert("Erro ao carregar detalhes da locação.");
    }
}

function fecharModalDetalhes() {
    const modal = document.getElementById('modal-detalhes-locacao');
    if (modal) modal.style.display = 'none';
}

/**
 * Solicita a devolução total da locação alterando o status para 'devolvida'
 */
async function devolverLocacao(id, event) {
    if (event) event.preventDefault();
    if (!confirm("Confirmar a devolução total desta locação? O estoque dos itens será atualizado automaticamente.")) return;

    try {
        const response = await fetch(`/api/locacoes/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'devolvida' })
        });

        const result = await response.json();
        if (response.ok) {
            alert("Locação finalizada e estoque atualizado!");
            window.location.reload();
        } else {
            alert(`Erro na devolução: ${result.message || 'Erro desconhecido'}`);
        }
    } catch (error) {
        console.error("Erro ao processar devolução:", error);
        alert("Erro de comunicação com o servidor.");
    }
}