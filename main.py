import os
from flask import Flask, render_template, request, redirect, url_for
import mysql.connector

# Isso obriga o Flask a entender onde está a pasta atual
# Melhoria: Usa o diretório do arquivo atual para localizar os templates, independente de onde o script é executado
base_dir = os.path.dirname(os.path.abspath(__file__))
template_dir = os.path.join(base_dir, 'templates')
app = Flask(__name__, template_folder=template_dir)

def get_db_connection():
    conn = mysql.connector.connect(
        host='localhost',
        user='root',
        password='M@vi2101',
        database='josedecorando',
        charset='utf8mb4'
    )
    return conn

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
    cidade = request.form.get("cidade")
    estado = request.form.get("estado")

    # 2. Conectar e Salvar no MySQL
    conn = get_db_connection()
    cursor = conn.cursor()

    sql = """INSERT INTO clientes 
             (tipo_pessoa, nome, email, telefone, celular, cpf, cnpj, rg, cep, cidade, estado) 
             VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
    
    valores = (tipo_pessoa, nome, email, telefone, celular, cpf, cnpj, rg, cep, cidade, estado)

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

if __name__ == "__main__":
    app.run(debug=True) 