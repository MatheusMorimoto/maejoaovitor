/**
 * produtos.js
 * Gerencia o carregamento dinâmico da tabela de produtos.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Helper para converter "R$ 1.250,00" em 1250.00 (Garante tipo numérico puro para a API)
    const parseNumeric = (valor, isInt = false) => {
        if (valor === null || valor === undefined) return isInt ? 0 : null;
        let str = String(valor).trim();
        
        // Validação de Nulos e Máscara 'R$ 0,00'
        if (str === "" || str === "R$" || str === "R$ 0,00" || str === "0,00" || str === "0") {
            return isInt ? 0 : null;
        }

        // 1. Remove o símbolo 'R$' e 2. todos os espaços em branco (incluindo &nbsp; / \xa0)
        let limpo = str.replace(/R\$/g, '').replace(/[\s\xa0]/g, '');

        // 3. Remover pontos de milhar (apenas se houver vírgula, preservando decimais tipo 212.00)
        // 4. Substituir vírgula decimal por ponto
        if (limpo.includes(',')) {
            limpo = limpo.replace(/\./g, '').replace(',', '.');
        }

        const num = parseFloat(limpo);
        if (isNaN(num)) return isInt ? 0 : null;
        return isInt ? Math.floor(num) : num;
    };


    // --- FUNÇÃO PARA CARREGAR PRODUTOS NA TABELA ---
    const carregarProdutos = async () => {
        const tbody = document.querySelector('#tabela-produtos tbody');
        
        try {
            const response = await fetch('/api/produtos');
            let produtos = await response.json();
            console.log("Dados recebidos da API:", produtos); // Para diagnóstico

            // Se houver produtos e a tabela existir na tela
            if (produtos && produtos.length > 0) {
                // Se o Jinja2 renderizou o 'empty-state', precisamos recarregar a estrutura 
                // da tabela. O jeito mais simples sem reescrever o HTML é recarregar se a tabela sumiu.
                if (!tbody) {
                    // Se há produtos mas a tabela não está no DOM (está mostrando o aviso de 'vazio'),
                    // recarregamos a página para que o Jinja2 renderize a estrutura correta.
                    location.reload();
                    return; 
                }

                // Cria todas as linhas de uma vez para melhor performance (evita "reflow" constante)
                const linhasHTML = produtos.map(produto => {
                    // Tratamento seguro para valores nulos ou strings na renderização
                    let valorRaw = produto.preco_venda;
                    if (valorRaw === null || valorRaw === undefined) valorRaw = 0;
                    
                    const valorNumerico = typeof valorRaw === 'string' 
                        ? parseFloat(valorRaw.replace(',', '.')) 
                        : parseFloat(valorRaw);

                    // Formata para moeda BRL
                    const precoFormatado = (isNaN(valorNumerico) ? 0 : valorNumerico)
                        .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                    return `
                        <tr>
                            <td>${produto.id}</td>
                            <td>${produto.nome}</td>
                            <td>${produto.quantidade || 0}</td>
                            <td>${precoFormatado}</td>
                            <td>${produto.tipo || '-'}</td>
                        </tr>`;
                }).join('');

                tbody.innerHTML = linhasHTML;
            }
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
        }
    };

    // Executa o carregamento ao abrir a página
    carregarProdutos();

    // --- FUNÇÃO PARA TRATAR O ENVIO DO FORMULÁRIO DE PRODUTOS ---
    // Assumindo que o formulário de cadastro/edição de produtos tem o ID 'form-produto'
    const formProduto = document.getElementById('form-produto');
    if (formProduto) {
        formProduto.addEventListener('submit', async (event) => {
            event.preventDefault(); // Impede o envio padrão do formulário

            // Coleta os dados do formulário e os sanitiza usando parseNumeric
            const dados = {
                nome: document.querySelector('[name="nome"]')?.value || '',
                descricao: document.querySelector('[name="descricao"]')?.value || null,
                codigo_barras: document.querySelector('[name="codigo_barras"]')?.value || null,
                // Campos numéricos devem ser convertidos para Number usando parseNumeric
                preco_custo: parseNumeric(document.querySelector('[name="preco_custo"]')?.value),
                preco_venda: parseNumeric(document.querySelector('[name="preco_venda"]')?.value),
                // Garante que valor_locacao envie 0 ou null (se a API aceitar null)
                valor_locacao: parseNumeric(document.querySelector('[name="valor_locacao"]')?.value),
                // Quantidade deve ser um inteiro
                quantidade: parseNumeric(document.querySelector('[name="quantidade"]')?.value, true) || 0,
                tipo: (document.querySelector('[name="tipo"]')?.value || 'venda').toLowerCase(),
                // Garante o envio de campos adicionais vistos no log de debug
                nota_fiscal: document.querySelector('[name="nota_fiscal"]')?.value || null
            };

            console.log("Dados sendo enviados para a API:", dados);

            try {
                const response = await fetch('/salvar_produtos', { // Endpoint Flask
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest' // Indica que é uma requisição AJAX
                    },
                    body: JSON.stringify(dados) // Garante que números são enviados como números, não strings
                });

                const resultado = await response.json();

                if (response.ok) {
                    alert('Produto salvo com sucesso!');
                    formProduto.reset(); // Limpa o formulário após o sucesso
                    carregarProdutos(); // Recarrega a tabela para mostrar o novo produto
                } else {
                    console.error('Erro ao salvar produto:', resultado);
                    alert(`Erro ao salvar produto: ${resultado.message || 'Verifique o console para mais detalhes.'}`);
                }
            } catch (error) {
                console.error('Erro na comunicação com o servidor:', error);
                alert('Erro na comunicação com o servidor. Tente novamente.');
            }
        });
    }
});