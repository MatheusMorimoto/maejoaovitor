document.addEventListener('DOMContentLoaded', () => {
    // Seleciona o formulário e os campos principais
    const form = document.querySelector('.form-vertical');
    const inputRG = document.querySelector('name="rg_cliente"');
    const inputCodigo = document.querySelector('name="codigo_barras"');
    const inputQtd = document.querySelector('name="quantidade"');

    // 1. MÁSCARA PARA RG (Formato: 00.000.000-0)
    if (inputRG) {
        inputRG.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, ''); // Remove letras
            value = value.replace(/(\d{2})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1})$/, '$1-$2');
            e.target.value = value.substring(0, 12); // Limita ao tamanho real do RG
        });
    }

    // 2. FILTRO PARA CÓDIGO DE BARRAS (Apenas números)
    if (inputCodigo) {
        inputCodigo.addEventListener('input', (e) => {
            // Impede a digitação de letras em campos numéricos
            e.target.value = e.target.value.replace(/\D/g, ''); 
        });
    }

    // 3. VALIDAÇÃO DE ESTOQUE (Impedir números negativos)
    if (inputQtd) {
        inputQtd.addEventListener('change', (e) => {
            if (parseInt(e.target.value) < 0) {
                alert("A quantidade em estoque não pode ser negativa!");
                e.target.value = 0;
            }
        });
    }

    // 4. FEEDBACK NO BOTÃO AO ENVIAR
    if (form) {
        form.addEventListener('submit', () => {
            const btn = form.querySelector('button');
            if (btn) {
                btn.innerText = "Cadastrando...";
                btn.style.opacity = "0.6";
                btn.style.cursor = "not-allowed";
            }
            console.log("Dados enviados para o Flask!"); //
        });
    }
});