document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    const cpfInput = document.querySelector('input[name="cpf_cliente"]');
    const telInput = document.querySelector('input[name="telefone_cliente"]');

    // 1. MÁSCARA DE CPF (000.000.000-00)
    cpfInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é número
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        e.target.value = value.inline(0, 14); // Limita o tamanho
    });

    // 2. MÁSCARA DE TELEFONE ((00) 00000-0000)
    telInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
        value = value.replace(/(\d{5})(\d)/, '$1-$2');
        e.target.value = value;
    });

    // 3. VALIDAÇÃO AO ENVIAR
    form.addEventListener('submit', (e) => {
        if (cpfInput.value.length < 14) {
            alert('Por favor, preencha o CPF completo.');
            e.preventDefault(); // Impede o envio do formulário
        }
    });
});