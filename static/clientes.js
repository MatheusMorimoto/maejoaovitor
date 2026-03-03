document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    const selectTipo = document.querySelector('select[name="tipo_pessoa"]');
    
    // Elementos para controle de exibição
    const campoCPF = document.querySelector('input[name="cpf"]').parentElement;
    const campoCNPJ = document.querySelector('input[name="cnpj"]').parentElement;
    const campoFantasia = document.querySelector('input[name="nome_fantasia"]').parentElement;

    // 1. LÓGICA DE EXIBIÇÃO (Física vs Jurídica)
    const alternarCampos = () => {
        if (selectTipo.value === 'F') {
            campoCPF.style.display = 'flex';
            campoCNPJ.style.display = 'none';
            campoFantasia.style.display = 'none';
        } else {
            campoCPF.style.display = 'none';
            campoCNPJ.style.display = 'flex';
            campoFantasia.style.display = 'flex';
        }
    };

    selectTipo.addEventListener('change', alternarCampos);
    alternarCampos(); // Executa ao carregar a página

    // 2. MÁSCARAS DE ENTRADA
    const aplicarMascara = (input, mascara) => {
        input.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (mascara === 'cpf') {
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            } else if (mascara === 'cnpj') {
                value = value.replace(/^(\d{2})(\d)/, '$1.$2');
                value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
                value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
                value = value.replace(/(\d{4})(\d)/, '$1-$2');
            } else if (mascara === 'cep') {
                value = value.replace(/(\d{5})(\d)/, '$1-$2');
            } else if (mascara === 'tel') {
                value = value.replace(/^(\d{2})(\d)/, '($1) $2');
                value = value.replace(/(\d{5})(\d)/, '$1-$2');
            }
            e.target.value = value;
        });
    };

    aplicarMascara(document.querySelector('input[name="cpf"]'), 'cpf');
    aplicarMascara(document.querySelector('input[name="cnpj"]'), 'cnpj');
    aplicarMascara(document.querySelector('input[name="cep"]'), 'cep');
    aplicarMascara(document.querySelector('input[name="celular"]'), 'tel');

    // 3. BUSCA AUTOMÁTICA DE CEP (ViaCEP)
    const inputCEP = document.querySelector('input[name="cep"]');
    inputCEP.addEventListener('blur', () => {
        let cep = inputCEP.value.replace(/\D/g, '');
        if (cep.length === 8) {
            fetch(`https://viacep.com.br/ws/${cep}/json/`)
                .then(res => res.json())
                .then(dados => {
                    if (!dados.erro) {
                        document.querySelector('input[name="logradouro"]').value = dados.logradouro;
                        document.querySelector('input[name="bairro"]').value = dados.bairro;
                        document.querySelector('input[name="cidade"]').value = dados.localidade;
                        document.querySelector('input[name="estado"]').value = dados.uf;
                    }
                });
        }
    });
});