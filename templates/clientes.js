document.addEventListener('DOMContentLoaded', () => {
    const inputCEP = document.querySelector('input[name="cep"]');
    
    // Selecionando os campos que precisam de máscara
    const inputCPF = document.querySelector('input[name="cpf"]');
    const inputCelular = document.querySelector('input[name="celular"]');
    const inputTelefone = document.querySelector('input[name="telefone"]');

    // 2. MÁSCARAS DE FORMATAÇÃO
    const aplicarMascara = (input, tipo) => {
        input.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, ''); // Remove tudo que não é número

            if (tipo === 'cpf') {
                v = v.replace(/(\d{3})(\d)/, '$1.$2');
                v = v.replace(/(\d{3})(\d)/, '$1.$2');
                v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                e.target.value = v.substring(0, 14);
            }
            else if (tipo === 'cep') {
                v = v.replace(/(\d{5})(\d)/, '$1-$2');
                e.target.value = v.substring(0, 9);
            }
            else if (tipo === 'tel') {
                v = v.replace(/^(\d{2})(\d)/, '($1) $2');
                v = v.replace(/(\d{4,5})(\d{4})$/, '$1-$2');
                e.target.value = v.substring(0, 15);
            }
        });
    };

    aplicarMascara(inputCPF, 'cpf');
    aplicarMascara(inputCEP, 'cep');
    aplicarMascara(inputCelular, 'tel');
    aplicarMascara(inputTelefone, 'tel');

    // 3. BUSCA DE CEP AUTOMÁTICA
    inputCEP.addEventListener('blur', () => {
        let cep = inputCEP.value.replace(/\D/g, '');
        
        if (cep.length === 8) {
            fetch(`https://viacep.com.br/ws/${cep}/json/`)
                .then(response => response.json())
                .then(data => {
                    if (!data.erro) {
                        document.querySelector('input[name="logradouro"]').value = data.logradouro;
                        document.querySelector('input[name="bairro"]').value = data.bairro;
                        document.querySelector('input[name="cidade"]').value = data.localidade;
                        document.querySelector('input[name="estado"]').value = data.uf;
                        document.querySelector('input[name="numero"]').focus();
                    } else {
                        alert("CEP não encontrado!");
                    }
                })
                .catch(() => alert("Erro ao buscar CEP."));
        }
    });
});