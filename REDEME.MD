Balão,Cor Aproximada,RGB,Hexadecimal
Roxo (Esquerda),Roxo vibrante,"(133, 61, 172)",#853DAC
Vermelho (Topo),Vermelho tomate,"(224, 49, 45)",#E0312D
Azul (Topo/Centro),Azul royal,"(28, 117, 219)",#1C75DB
Laranja (Centro),Laranja âmbar,"(245, 159, 0)",#F59F00
Verde (Direita),Verde grama,"(64, 161, 58)",#40A13A

        home.html e css.html resumo do que foi feito 
1. O Cabeçalho (Header)
Alinhamento: Usamos o display: flex para que os itens do menu fiquem um ao lado do outro em uma linha horizontal.

Menu Suspenso (Dropdown): Criamos uma lista escondida dentro de "Cadastro". Ela só aparece quando você passa o mouse por cima (:hover), usando position: absolute para flutuar sobre o conteúdo sem empurrar o resto da página para baixo.

2. Seção de Objetivos (Missão, Visão e Valores)
Organização: Também usamos o Flexbox para alinhar as três caixas lado a lado e centralizadas.

Estilização: Definimos tamanhos fixos (width: 190px), cores de fundo azuis e bordas verdes grossas para dar destaque. O box-sizing: border-box foi usado para garantir que o tamanho da borda não "estique" a caixa além do planejado.

3. Seção de Depoimentos
Empilhamento Vertical: No #secao-depoimentos, usamos flex-direction: column. Isso é o que faz o título "Depoimentos" ficar no topo e os cards logo abaixo dele.

Centralização: O comando align-items: center garante que tanto o título quanto o bloco de cards fiquem perfeitamente centralizados na tela.

Cards: Os cards individuais ganharam um fundo verde e bordas azuis, mantendo o padrão visual do seu site.

Em resumo, as ferramentas "mágicas" usadas foram:
Flexbox: Para colocar coisas lado a lado ou uma em cima da outra de forma organizada.

Hover: Para criar interatividade quando o mouse passa sobre os elementos.

Position Absolute: Para que o submenu "flutue" sem quebrar o layout.

    MAIN.PY

import os: Importa ferramentas do sistema operacional. É usado aqui para manipular caminhos de pastas de forma inteligente, garantindo que o código funcione bem no Windows, Linux ou Mac.
from flask import ...: Traz as ferramentas do framework:
Flask: A classe que cria o objeto da aplicação web.
render_template: A função mágica que pega um arquivo HTML, processa (se tiver lógica dentro dele) e envia para o navegador do usuário
base_dir: O código pergunta ao sistema: "Qual é a pasta exata onde este arquivo main.py está salvo?".
template_dir: Com base na resposta anterior, ele monta o caminho para a pasta templates que deve estar junto ao main.py.
app = Flask(...): Cria a aplicação. O parâmetro template_folder=template_dir força o Flask a procurar os HTMLs no caminho exato que calculamos, em vez de tentar adivinhar (o que muitas vezes falha se você rodar o script de um diretório diferente no terminal).
3. As Rotas (URLs)
As rotas são como o "mapa" do seu site. Elas dizem ao Flask qual função Python executar quando uma URL específica é acessada.

if __name__ == "__main__":: É uma verificação de segurança do Python. Garante que o servidor só inicie se você executar este arquivo diretamente (clicando nele ou rodando python main.py), e não se ele for apenas importado por outro programa.
app.run(debug=True): Inicia o servidor de desenvolvimento.
debug=True: Ativa o modo de depuração. Isso é excelente enquanto você programa, pois:
O servidor reinicia sozinho sempre que você salva uma alteração no código.
Se houver um erro, ele mostra uma página detalhada no navegador explicando o que quebrou, em vez de apenas um erro genérico.