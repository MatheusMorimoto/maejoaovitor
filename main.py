import os
import requests
from flask import Flask, session, render_template, request, redirect, url_for, jsonify

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
    # Debug para visualizar a URL completa e o método que está sendo enviado à API externa
    print(f"DEBUG API -> {method.upper()} {url}")
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


@app.route("/login", methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        usuario = request.form.get("usuario")
        senha = request.form.get("senha")
        
        # Alterado para 'api/auth/login'. Como seus recursos estão sob o prefixo 'api/',
        # o endpoint de autenticação provavelmente segue o padrão 'api/auth/login'.
        resposta = sync_to_api("api/auth/login", data={"email": usuario, "password": senha}, method="post", use_token=False)
        
        if resposta and 'token' in resposta:
            session['token'] = resposta['token']
            return redirect(url_for('home'))
        else:
            return render_template("login.html", erro="Credenciais inválidas ou falha na API")
            
    return render_template("login.html")

@app.route("/logout")
def logout():
    session.pop('token', None)
    return redirect(url_for('login'))

@app.route("/home")
def home():
    if 'token' not in session:
        return redirect(url_for('login'))
    return render_template("home.html")

@app.route("/clientes")
def clientes():
    if 'token' not in session:
        return redirect(url_for('login'))
    # Busca a lista de clientes na API para o carregamento inicial (Jinja2)
    lista_clientes = sync_to_api("api/clientes", method="get")
    return render_template("clientes.html", clientes=lista_clientes if lista_clientes else [])

@app.route("/api/clientes")
def get_clientes_json():
    # Rota para o JavaScript buscar os dados via Fetch
    dados = sync_to_api("api/clientes", method="get")
    return jsonify(dados if dados is not None else [])

@app.route("/salvar_cliente", methods=['POST'])
def salvar_cliente():
    # 1. Captura os dados do formulário em um dicionário
    dados = {
        "tipo_pessoa": request.form.get("tipo_pessoa"),
        "nome": request.form.get("nome"),
        "email": request.form.get("email"),
        "telefone": request.form.get("telefone"),
        "celular": request.form.get("celular"),
        "cpf": request.form.get("cpf"),
        "cnpj": request.form.get("cnpj"),
        "rg": request.form.get("rg"),
        "cep": request.form.get("cep"),
        "logradouro": request.form.get("logradouro"),
        "numero": request.form.get("numero"),
        "complemento": request.form.get("complemento"),
        "bairro": request.form.get("bairro"),
        "cidade": request.form.get("cidade"),
        "estado": request.form.get("estado")
    }

    # 2. Utiliza a função sync_to_api para enviar os dados ao Render
    resultado = sync_to_api("api/clientes", data=dados, method="post")

    if resultado:
        print(f"Cliente {dados['nome']} cadastrado com sucesso via API!")
    else:
        print("Erro ao sincronizar cliente com a API.")

    # 3. Redirecionamento
    return redirect(url_for('clientes'))

# Adiciona uma rota raiz para que o acesso direto ao site carregue a home
@app.route("/")
def index():
    if 'token' not in session:
        return redirect(url_for('login'))
    return redirect(url_for('home'))



@app.route("/produtos")
def produtos():
    if 'token' not in session:
        return redirect(url_for('login'))
    # Busca a lista de produtos na API para o carregamento inicial (Jinja2)
    lista_produtos = sync_to_api("api/produtos", method="get")
    
    # Sanitização completa: Garante que todos os atributos existam para evitar erro no Jinja2
    if isinstance(lista_produtos, list):
        for p in lista_produtos:
            if isinstance(p, dict):
                p['descricao'] = p.get('descricao') or '-'
                p['codigo_barras'] = p.get('codigo_barras') or '-'
                p['preco_custo'] = p.get('preco_custo') or 0.0
                p['preco_venda'] = p.get('preco_venda') or 0.0
                p['tipo'] = p.get('tipo') or '-'
                
    return render_template("produtos.html", produtos=lista_produtos if lista_produtos else [])

@app.route("/api/produtos")
def get_produtos_json():
    if 'token' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    # Rota para o JavaScript buscar os dados via Fetch
    dados = sync_to_api("api/produtos", method="get")
    
    # Sanitização completa para o JavaScript
    if isinstance(dados, list):
        for p in dados:
            if isinstance(p, dict):
                p['descricao'] = p.get('descricao') or '-'
                p['codigo_barras'] = p.get('codigo_barras') or '-'
                p['preco_custo'] = p.get('preco_custo') or 0.0
                p['preco_venda'] = p.get('preco_venda') or 0.0
                p['tipo'] = p.get('tipo') or '-'
                
    return jsonify(dados if dados is not None else [])

@app.route("/salvar_produtos", methods=['POST'])
def salvar_produtos():
    if 'token' not in session:
        return redirect(url_for('login'))

    # Adicionado para depuração: Imprime os dados brutos recebidos do formulário
    print(f"DEBUG - Dados recebidos do formulário de produtos: {request.form}")

    # Função auxiliar para converter strings do formulário em números (float)
    # Isso garante que a API receba um tipo numérico e trate a vírgula decimal
    def converter_valor(valor):
        if not valor: return 0.0
        try:
            # Remove R$, espaços e pontos de milhar, transformando vírgula em ponto decimal
            v = str(valor).replace('R$', '').replace(' ', '')
            if ',' in v:
                # Se houver vírgula, assume-se formato brasileiro (ex: 1.234,56 ou 10,50)
                v = v.replace('.', '').replace(',', '.')
            return float(v)
        except (ValueError, TypeError):
            return 0.0

    # 1. Coleta os dados do formulário HTML
    dados = {
        "nome": request.form.get("nome"),
        "descricao": request.form.get("descricao"),
        "codigo_barras": request.form.get("codigo_barras"),
        "preco_custo": converter_valor(request.form.get("preco_custo")),
        "preco_venda": converter_valor(request.form.get("preco_venda")),
        "tipo": request.form.get("tipo")
    }

    # 2. Utiliza a função sync_to_api para enviar ao Render
    resultado = sync_to_api("api/produtos", data=dados, method="post")

    if resultado:
        # Se o JS estiver usando fetch, o Flask deve responder JSON para sucesso
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest' or 'fetch' in request.user_agent.string.lower():
            return {"status": "success", "message": "Produto salvo na API"}, 200
        return redirect(url_for('produtos'))
    else:
        return {"status": "error", "message": "Falha ao sincronizar com API"}, 500

@app.route("/vendas")
def vendas():
    if 'token' not in session:
        return redirect(url_for('login'))
        
    # Busca dados para popular os selects do formulário
    lista_clientes = sync_to_api("api/clientes", method="get")
    lista_produtos = sync_to_api("api/produtos", method="get")
    
    # Sanitização básica para evitar erros no template
    if lista_produtos:
        for p in lista_produtos:
            p['preco_venda'] = p.get('preco_venda') or 0.0

    return render_template("vendas.html", clientes=lista_clientes or [], produtos=lista_produtos or [])

@app.route("/salvar_venda", methods=['POST'])
def salvar_venda():
    # Agora recebe JSON do vendas.js para incluir a lista de itens
    dados = request.get_json()
    resultado = sync_to_api("api/vendas", data=dados, method="post")
    
    if resultado:
        return {"status": "success"}, 200
    return {"status": "error", "message": "Falha na API"}, 500

@app.route("/salvar_aluguel", methods=['POST'])
def salvar_aluguel():
    # Recebe os dados JSON enviados pelo aluguel.js
    dados = request.get_json()
    resultado = sync_to_api("api/locacoes", data=dados, method="post")
    
    if resultado:
        return {"status": "success"}, 200
    return {"status": "error", "message": "Falha na API"}, 500

@app.route("/aluguel")
def aluguel():
    return render_template("aluguel.html")

if __name__ == "__main__":
    app.run(debug=True) 