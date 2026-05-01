/**
 * logout.js
 * Injeta automaticamente o botão de "Sair" no menu de navegação.
 * Funciona em todas as telas que possuem o elemento #header.
 */

document.addEventListener('DOMContentLoaded', () => {
    const header = document.getElementById('header');

    // Se o menu existir na página (evita erro na tela de login se não houver menu lá)
    if (header) {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = "/logout";
        link.textContent = "Sair";
        
        li.appendChild(link);
        header.appendChild(li);
    }
});