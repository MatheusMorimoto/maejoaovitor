import os
import requests
from flask import Flask, session, render_template, request, redirect, url_for

# Isso obriga o Flask a entender onde está a pasta atual
# Melhoria: Usa o diretório do arquivo atual para localizar os templates, independente de onde o script é executado
base_dir = os.path.dirname(os.path.abspath(__file__))
template_dir = os.path.join(base_dir, 'templates')
app = Flask(__name__, template_folder=template_dir)

# URL da sua API no Render (Banco PostgreSQL remoto)
API_BASE = "https://api-jose-jhbt.onrender.com"

# Chave secreta para permitir o uso de 'session' e 'flash'
app.secret_key = os.environ.get('SECRET_KEY', 'uma_chave_muito_segura_aqui')

def sync_to_api(endpoint, data=None, method='post', use_token=True):
    url = f"{API_BASE}/{endpoint}"
    headers = {}
    
    # Se o usuário estiver logado, envia o token no cabeçalho
    if use_token and 'token' in session:
        headers['Authorization'] = f"Bearer {session['token']}"
    
    try:
        if method.lower() == 'post':
            response = requests.post(url, json=data, headers=headers, timeout=10)
        elif method.lower() == 'get':
            response = requests.get(url, params=data, headers=headers, timeout=10)
        
        if response.status_code in [200, 201]:
            return response.json()
        else:
            print(f"Erro na API ({response.status_code}): {response.text}")
            return None
    except Exception as e:
        print(f"Falha de conexão com a API: {e}")
        return None


@app.route("/home")
def home():
    return render_template("home.html")

@app.route("/clientes")
def clientes():
    return render_template("clientes.html")

@app.route("/salvar_cliente", methods=['POST'])
def salvar_cliente():
    # 1. Captura os dados (Ajustado para bater com o seu HTML)
    tipo_pessoa = request.form.get("tipo_pessoa")
    nome = request.form.get("nome")
    email = request.form.get("email")
    telefone = request.form.get("telefone")
    celular = request.form.get("celular")
    cpf = request.form.get("cpf")
    cnpj = request.form.get("cnpj")
    rg = request.form.get("rg")
    cep = request.form.get("cep")
    logradouro = request.form.get("logradouro")
    numero = request.form.get("numero")
    complemento = request.form.get("complemento")
    bairro = request.form.get("bairro")
    cidade = request.form.get("cidade")
    estado = request.form.get("estado")

    # 2. Conectar e Salvar no MySQL
    conn = get_db_connection()
    cursor = conn.cursor()

    sql = """INSERT INTO clientes 
             (tipo_pessoa, nome, email, telefone, celular, cpf, cnpj, rg, cep, logradouro, numero, complemento, bairro, cidade, estado) 
             VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
    
    valores = (tipo_pessoa, nome, email, telefone, celular, cpf, cnpj, rg, cep, logradouro, numero, complemento, bairro, cidade, estado)

    try:
        cursor.execute(sql, valores)
        conn.commit() # Grava no MySQL
        print(f"Cliente {nome} cadastrado com sucesso!")
    except Exception as e:
        print(f"Erro ao salvar cliente: {e}")
    finally:
        cursor.close()
        conn.close()

    # 3. Redirecionamento
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
    # 1. Coleta os dados do formulário HTML
    nome = request.form.get("nome")
    descricao = request.form.get("descricao")
    codigo = request.form.get("codigo_barras")
    preco_custo = request.form.get("preco_custo")
    preco_venda = request.form.get("preco_venda")
    tipo = request.form.get("tipo")

    # 2. Conecta ao MySQL
    conn = get_db_connection()
    cursor = conn.cursor()

    # 3. Comando SQL para inserir (Baseado na sua estrutura image_62a4df.png)
    sql = """INSERT INTO produtos 
             (nome, descricao, codigo_barras, preco_custo, preco_venda, tipo) 
             VALUES (%s, %s, %s, %s, %s, %s)"""
    valores = (nome, descricao, codigo, preco_custo, preco_venda, tipo)

    try:
        cursor.execute(sql, valores)
        conn.commit() # Salva as alterações de fato
    except Exception as e:
        print(f"Erro ao salvar: {e}")
    finally:
        cursor.close()
        conn.close()

    # 4. Redireciona de volta para a página de produtos
    return redirect(url_for('produtos'))

@app.route("/vendas")
def vendas():
    return render_template("vendas.html")

@app.route("/aluguel")
def aluguel():
    return render_template("aluguel.html")

if __name__ == "__main__":
    app.run(debug=True) 