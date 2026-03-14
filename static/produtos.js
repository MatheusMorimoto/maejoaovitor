/**
 * produtos.js
 * Gerencia o carregamento dinâmico da tabela de produtos.
 */

document.addEventListener('DOMContentLoaded', () => {
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

                tbody.innerHTML = ''; // Limpa a tabela antes de preencher
                produtos.forEach(produto => {
                    const row = `
                        <tr>
                            <td>${produto.id}</td>
                            <td>${produto.nome}</td>
                            <td>R$ ${parseFloat(produto.preco_venda || 0).toFixed(2)}</td>
                            <td>${produto.tipo || '-'}</td>
                        </tr>`;
                    tbody.innerHTML += row;
                });
            }
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
        }
    };

    // Executa o carregamento ao abrir a página
    carregarProdutos();
});