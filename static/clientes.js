/**
 * clientes.js
 * Gerencia a busca de endereço automática via CEP.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- FUNÇÃO PARA CARREGAR CLIENTES NA TABELA ---
    const carregarClientes = async () => {
        const tbody = document.querySelector('#tabela-clientes tbody');
        
        try {
            const response = await fetch('/api/clientes');
            const clientes = await response.json();

            if (clientes && clientes.length > 0) {
                tbody.innerHTML = ''; // Limpa a tabela antes de preencher
                clientes.forEach(cliente => {
                    const row = `
                        <tr>
                            <td>${cliente.id}</td>
                            <td>${cliente.nome}</td>
                            <td>${cliente.cpf || '-'}</td>
                            <td>${cliente.rg || '-'}</td>
                            <td>${cliente.email || '-'}</td>
                            <td>${cliente.telefone || '-'}</td>
                            <td>${cliente.celular || '-'}</td>
                            <td>${cliente.cep || '-'}</td>
                            <td>${cliente.logradouro || '-'}</td>
                            <td>${cliente.numero || '-'}</td>
                            <td>${cliente.complemento || '-'}</td>
                            <td>${cliente.bairro || '-'}</td>
                            <td>${cliente.cidade || '-'}</td>
                            <td>${cliente.estado || '-'}</td>
                        </tr>`;
                    tbody.innerHTML += row;
                });
            }
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
        }
    };

    // Executa o carregamento ao abrir a página
    carregarClientes();

    // Seleciona os campos baseados no atributo 'name' definido no main.py
    const cepInput = document.querySelector('input[name="cep"]');
    const logradouroInput = document.querySelector('input[name="logradouro"]');
    const bairroInput = document.querySelector('input[name="bairro"]');
    const cidadeInput = document.querySelector('input[name="cidade"]');
    const estadoInput = document.querySelector('input[name="estado"]');

    if (cepInput) {
        cepInput.addEventListener('blur', () => {
            // Remove caracteres não numéricos do valor (trata o typo 'cpe')
            const cep = cepInput.value.replace(/\D/g, '');

            // Verifica se o formato é válido (8 dígitos)
            if (cep.length === 8) {
                // Consulta a API ViaCEP para buscar o endereço
                fetch(`https://viacep.com.br/ws/${cep}/json/`)
                    .then(response => response.json())
                    .then(data => {
                        if (!data.erro) {
                            // Preenche os campos automaticamente se eles existirem no HTML
                            if (logradouroInput) logradouroInput.value = data.logradouro;
                            if (bairroInput) bairroInput.value = data.bairro;
                            if (cidadeInput) cidadeInput.value = data.localidade;
                            if (estadoInput) estadoInput.value = data.uf;
                        } else {
                            alert("CEP não encontrado.");
                        }
                    })
                    .catch(error => {
                        console.error('Erro ao buscar o endereço:', error);
                    });
            }
        });
    }
});