/**
 * aluguel.js
 * Gerencia a lógica de interface e comunicação da página de locação.
 */

document.addEventListener('DOMContentLoaded', () => {
    const btnAddItem = document.querySelector('.btn-add-item');
    const containerItens = document.querySelector('.secao-itens');
    const totalGeralElement = document.querySelector('.total-geral');
    const form = document.querySelector('.form-locacao');

    // 1. Função para calcular o total geral
    function calcularTotalGeral() {
        const subtoais = document.querySelectorAll('.item-subtotal input');
        const frete = parseFloat(document.querySelector('input[name="frete"]').value) || 0;
        const dias = parseInt(document.querySelector('input[name="dias"]').value) || 1;
        
        let somaItens = 0;
        subtoais.forEach(input => {
            const valor = parseFloat(input.value.replace('R$ ', '').replace(',', '.')) || 0;
            somaItens += valor;
        });

        const total = (somaItens * dias) + frete;
        totalGeralElement.textContent = `Total Geral: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }

    // 2. Adicionar nova linha de produto
    btnAddItem.addEventListener('click', () => {
        const firstRow = document.querySelector('.item-row');
        const newRow = firstRow.cloneNode(true);
        
        // Limpa os campos da nova linha
        newRow.querySelectorAll('input').forEach(input => input.value = input.readOnly ? '0,00' : '1');
        newRow.querySelector('select').selectedIndex = 0;
        
        // Insere antes do botão "Adicionar Item"
        containerItens.insertBefore(newRow, btnAddItem);
    });

    // 3. Remover linha e atualizar cálculos
    containerItens.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove')) {
            const rows = document.querySelectorAll('.item-row');
            if (rows.length > 1) {
                e.target.closest('.item-row').remove();
                calcularTotalGeral();
            } else {
                alert('A locação deve ter pelo menos um item.');
            }
        }
    });

    // 4. Escuta mudanças nos inputs para atualizar totais
    form.addEventListener('input', (e) => {
        if (e.target.name === 'frete' || e.target.name === 'dias') {
            calcularTotalGeral();
        }
    });

    // 5. Lógica de Envio para a API
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Captura dos dados do formulário
        const formData = new FormData(form);
        const dados = {
            cliente: formData.get('cliente'),
            pagamento: formData.get('pagamento'),
            data_inicio: formData.get('data_inicio'),
            dias: formData.get('dias'),
            frete: formData.get('frete'),
            total: totalGeralElement.textContent.replace('Total Geral: R$ ', '').replace('.', '').replace(',', '.')
        };

        // Envia para o backend Flask para sincronização segura com a API
        const API_PATH = "/salvar_aluguel";

        try {
            console.log("Enviando dados para:", API_PATH, dados);
            
            // Nota: Para funcionar direto via JS, a API precisa de CORS habilitado.
            const response = await fetch(API_PATH, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dados)
            });

            if (response.ok) {
                alert("Locação registrada com sucesso!");
                form.reset();
            }
            
        } catch (error) {
            console.error("Erro ao conectar com a API:", error);
        }
    });
});