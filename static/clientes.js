document.addEventListener('DOMContentLoaded', () => {
    const selectTipo = document.querySelector('select[name="tipo_pessoa"]');
    const inputCEP = document.querySelector('input[name="cep"]');
    
    // Selecionando os campos que precisam de máscara
    const inputCPF = document.querySelector('input[name="cpf"]');
    const inputCNPJ = document.querySelector('input[name="cnpj"]');
    const inputCelular = document.querySelector('input[name="celular"]');
    const inputTelefone = document.querySelector('input[name="telefone"]');

    // 1. LÓGICA PARA MOSTRAR/ESCONDER CAMPOS (Física vs Jurídica)
    const toggleCampos = () => {
        const isFisica = selectTipo.value === 'F';
        
        // Se for Física, mostra CPF e esconde CNPJ/Nome Fantasia
        inputCPF.parentElement.style.display = isFisica ? 'flex' : 'none';
        inputCNPJ.parentElement.style.display = isFisica ? 'none' : 'flex';
        document.querySelector('input[name="nome_fantasia"]').parentElement.style.display = isFisica ? 'none' : 'flex';
        document.querySelector('input[name="inscricao_estadual"]').parentElement.style.display = isFisica ? 'none' : 'flex';
    };

    selectTipo.addEventListener('change', toggleCampos);
    toggleCampos(); // Executa ao carregar para definir o estado inicial

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
            else if (tipo === 'cnpj') {
                v = v.replace(/^(\d{2})(\d)/, '$1.$2');
                v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
                v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
                v = v.replace(/(\d{4})(\d)/, '$1-$2');
                e.target.value = v.substring(0, 18);
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
    aplicarMascara(inputCNPJ, 'cnpj');
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