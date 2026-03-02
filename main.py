import os
from flask import Flask, render_template, request, redirect, url_for

# Isso obriga o Flask a entender onde está a pasta atual
# Melhoria: Usa o diretório do arquivo atual para localizar os templates, independente de onde o script é executado
base_dir = os.path.dirname(os.path.abspath(__file__))
template_dir = os.path.join(base_dir, 'templates')
app = Flask(__name__, template_folder=template_dir)

@app.route("/home")
def home():
    return render_template("home.html")

@app.route("/clientes")
def clientes():
    return render_template("clientes.html")

@app.route("/salvar_cliente", methods=['POST'])
def salvar_cliente():
    # 1. Captura os dados enviados pelo formulário usando o atributo 'name' do HTML
    nome = request.form.get("nome_cliente")
    email = request.form.get("email_cliente")
    telefone = request.form.get("telefone_cliente")
    endereco = request.form.get("endereco_cliente")
    rg = request.form.get("rg_cliente")
    cpf = request.form.get("cpf_cliente")

    # 2. Por enquanto, vamos exibir no terminal para conferir se chegou tudo certo
    print(f"--- NOVO CADASTRO ---")
    print(f"Nome: {nome} | CPF: {cpf}")
    
    # 3. Após salvar (ou imprimir), redirecionamos o usuário de volta para a página de clientes
    # Isso evita o erro de 'Confirmar reenvio de formulário' ao dar F5
    return redirect(url_for('clientes'))

# Adiciona uma rota raiz para que o acesso direto ao site carregue a home
@app.route("/")
def index():
    return render_template("home.html")


@app.route("/produtos")
def produtos():
    return render_template("produtos.html")

@app.route("/salvar_produtos", methods=['POST'])
def salvar_produtos():
    # Captura os dados do formulário de produtos
    nome = request.form.get("nome_produto")
    codigo = request.form.get("codigo_barras")
    qtd = request.form.get("quantidade")
    
    print(f"Produto Recebido: {nome} | Estoque: {qtd}")
    
    return redirect(url_for('produtos')) # Redireciona para a página de produtos

if __name__ == "__main__":
    app.run(debug=True) 