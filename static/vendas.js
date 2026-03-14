        function atualizarPreco(select) {
            const preco = select.options[select.selectedIndex].getAttribute('data-preco');
            const row = select.closest('.item-row');
            row.querySelector('.preco-unitario').value = 'R$ ' + parseFloat(preco).toFixed(2);
            calcularSubtotal(row.querySelector('input[name="quantidade[]"]'));
        }

        function calcularSubtotal(inputQtd) {
            const row = inputQtd.closest('.item-row');
            const qtd = inputQtd.value;
            const select = row.querySelector('select');
            const preco = select.options[select.selectedIndex].getAttribute('data-preco') || 0;
            const total = qtd * preco;
            row.querySelector('.subtotal').value = 'R$ ' + total.toFixed(2);
        }

        // Função simplificada para clonar a primeira linha (apenas visual para este exemplo)
        function adicionarItem() {
            const lista = document.getElementById('lista-itens');
            const novoItem = lista.firstElementChild.cloneNode(true);
            // Limpar valores
            novoItem.querySelector('input[name="quantidade[]"]').value = 1;
            novoItem.querySelector('.subtotal').value = "R$ 0.00";
            novoItem.querySelector('.preco-unitario').value = "R$ 0.00";
            novoItem.querySelector('select').selectedIndex = 0;
            lista.appendChild(novoItem);
        }

        function removerItem(btn) {
            const lista = document.getElementById('lista-itens');
            if (lista.children.length > 1) {
                btn.closest('.item-row').remove();
            } else {
                alert("É necessário ter pelo menos um item.");
            }
        }

        // Nova lógica para enviar os dados para a API
        document.addEventListener('DOMContentLoaded', () => {
            const form = document.querySelector('.form-venda');
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const formData = new FormData(form);
                    
                    try {
                        const response = await fetch('/salvar_venda', {
                            method: 'POST',
                            body: formData
                        });

                        if (response.ok) {
                            alert("Venda registrada com sucesso!");
                            window.location.reload();
                        } else {
                            const erro = await response.json();
                            alert("Erro ao salvar: " + erro.message);
                        }
                    } catch (error) {
                        console.error("Erro na comunicação:", error);
                        alert("Erro de conexão com o servidor.");
                    }
                });
            }
        });