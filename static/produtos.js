document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.form-vertical');

    if (form) {
        form.addEventListener('submit', async (e) => {
            // 1. Evita o recarregamento padrão para processar a lógica
            e.preventDefault();

            const btn = form.querySelector('button');
            const tipoSelecionado = form.querySelector('select[name="tipo"]').value;

            // Feedback visual no botão
            btn.innerText = "Salvando...";
            btn.disabled = true;

            // 2. Captura os dados do formulário
            const formData = new FormData(form);

            try {
                // 3. Envia os dados para o seu Python (Flask)
                const response = await fetch('/salvar_produtos', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    // 4. LÓGICA DE REDIRECIONAMENTO
                    // Se o tipo for 'venda', vai para a rota de vendas, senão aluguel
                    if (tipoSelecionado === 'venda') {
                        window.location.href = '/vendas'; // Ajuste para sua rota real
                    } else {
                        window.location.href = '/aluguel'; // Ajuste para sua rota real
                    }
                } else {
                    alert("Erro ao salvar o produto.");
                    btn.innerText = "Cadastrar Produto";
                    btn.disabled = false;
                }
            } catch (error) {
                console.error("Erro na requisição:", error);
                alert("Erro de conexão com o servidor.");
                btn.innerText = "Cadastrar Produto";
                btn.disabled = false;
            }
        });
    }
});