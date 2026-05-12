import os
import requests
from flask import Flask, session, render_template, request, redirect, url_for, jsonify

# Isso obriga o Flask a entender onde está a pasta atual
# Melhoria: Usa o diretório do arquivo atual para localizar os templates, independente de onde o script é executado
base_dir = os.path.dirname(os.path.abspath(__file__))
template_dir = os.path.join(base_dir, 'templates')
app = Flask(__name__, template_folder=template_dir)

API_BASE = "https://api-jose-jhbt.onrender.com"

# Chave secreta para permitir o uso de 'session' e 'flash'
app.secret_key = os.environ.get('SECRET_KEY', 'uma_chave_muito_segura_aqui')

def sync_to_api(endpoint, data=None, method='post', use_token=True):
    url = f"{API_BASE}/{endpoint}"
    # Debug para visualizar a URL completa e o método que está sendo enviado à API externa
    print(f"DEBUG API -> {method.upper()} {url}")
    
    if data:
        print(f"DEBUG PAYLOAD -> {data}")

    headers = {}
    
    # Se o usuário estiver logado, envia o token no cabeçalho
    if use_token and 'token' in session:
        headers['Authorization'] = f"Bearer {session['token']}"
    
    try:
        if method.lower() == 'post':
            # Garante que envia pelo menos um objeto vazio {} se data for None, evitando erro 500 em algumas APIs
            response = requests.post(url, json=data if data is not None else {}, headers=headers, timeout=10)
        elif method.lower() == 'get':
            response = requests.get(url, params=data, headers=headers, timeout=10)
        elif method.lower() == 'put':
            response = requests.put(url, json=data if data is not None else {}, headers=headers, timeout=10)
        
        # Adicionado 204 (No Content) que é comum em respostas de ações como 'devolver'
        if response.status_code in [200, 201, 204]:
            try:
                return response.json()
            except:
                return {} # Retorna dicionário vazio se não houver JSON mas o status for sucesso
        else:
            # Retorna o erro da API para que o controlador possa repassar ao front-end
            return {"error_api": True, "status": response.status_code, "body": response.text}
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
    if 'token' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    # Rota para o JavaScript buscar os dados via Fetch
    dados = sync_to_api("api/clientes", method="get")
    return jsonify(dados if dados is not None else [])

@app.route("/salvar_cliente", methods=['POST'])
def salvar_cliente():
    # 1. Captura os dados do formulário em um dicionário
    dados = {
        "nome": request.form.get("nome"),
        "email": request.form.get("email"),
        "telefone": request.form.get("telefone"),
        "celular": request.form.get("celular"),
        "cpf": request.form.get("cpf"),
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

    if resultado and not (isinstance(resultado, dict) and resultado.get('error_api')):
        print(f"Cliente {dados['nome']} cadastrado com sucesso via API!")
    else:
        print(f"Erro ao sincronizar cliente: {resultado}")

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
                p['valor_locacao'] = p.get('valor_locacao') or 0.0
                # Adicionado suporte ao campo 'estoque' retornado pela API
                p['quantidade'] = p.get('quantidade') or p.get('estoque_atual') or p.get('estoque') or 0
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
                p['valor_locacao'] = p.get('valor_locacao') or 0.0
                # Adicionado suporte ao campo 'estoque' retornado pela API
                p['quantidade'] = p.get('quantidade') or p.get('estoque_atual') or p.get('estoque') or 0
                p['tipo'] = p.get('tipo') or '-'
                
    return jsonify(dados if dados is not None else [])

@app.route("/salvar_produtos", methods=['POST'])
def salvar_produtos():
    if 'token' not in session:
        return redirect(url_for('login'))

    # Detecta se os dados vieram via JSON (AJAX) ou Form (POST padrão)
    if request.is_json:
        dados_brutos = request.get_json()
    else:
        dados_brutos = request.form

    print(f"DEBUG - Dados brutos recebidos: {dados_brutos}")

    def limpar_numero(valor, retornar_int=False):
        # Se o valor for nulo ou apenas símbolos, retorna None (será null no JSON)
        if valor is None or str(valor).strip() in ["", "R$", "R$ ", "R$ 0,00", "0,00", "None", "null", "undefined"]:
            return None
        try:
            # Se já for um tipo numérico (vindo de JSON), apenas garante o cast
            if isinstance(valor, (int, float)):
                return int(valor) if retornar_int else float(valor)

            # Limpeza via regex: Remove R$, espaços e caracteres não numéricos exceto ponto e vírgula
            import re
            v = re.sub(r'[R\$\s\xa0]', '', str(valor)).strip()
            
            if not v:
                return None
            
            # Conversão BR -> Internacional
            if ',' in v:
                v = v.replace('.', '').replace(',', '.')
            
            num = float(v)
            if retornar_int:
                return int(num)
            # Se o número não tem decimais significativos, envia como int para a API
            if num == int(num):
                return int(num)
            return num
        except (ValueError, TypeError):
            return None

    # 1. Coleta e sanitiza os dados. Campos vazios serão enviados como null (None)
    dados = {
        "nome": dados_brutos.get("nome"),
        "descricao": dados_brutos.get("descricao") if dados_brutos.get("descricao") else None,
        "codigo_barras": str(dados_brutos.get("codigo_barras")).strip() if dados_brutos.get("codigo_barras") else None,
        "preco_custo": limpar_numero(dados_brutos.get("preco_custo")) or 0,
        "preco_venda": limpar_numero(dados_brutos.get("preco_venda")) or 0,
        "valor_locacao": limpar_numero(dados_brutos.get("valor_locacao")), # Envia null se vazio
        "quantidade": limpar_numero(dados_brutos.get("quantidade"), retornar_int=True) or 0,
        "tipo": str(dados_brutos.get("tipo")).strip().lower() if dados_brutos.get("tipo") else "venda",
        "nota_fiscal": str(dados_brutos.get("nota_fiscal")).strip() if dados_brutos.get("nota_fiscal") else None
    }

    # 2. Utiliza a função sync_to_api para enviar ao Render
    resultado = sync_to_api("api/produtos", data=dados, method="post")

    # Validação robusta do retorno da API
    if resultado and not (isinstance(resultado, dict) and resultado.get('error_api')):
        # Se o JS estiver usando fetch, o Flask deve responder JSON para sucesso
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest' or 'fetch' in request.user_agent.string.lower():
            return {"status": "success", "message": "Produto salvo na API"}, 200
        return redirect(url_for('produtos'))
    else:
        msg_erro = resultado.get('body') if isinstance(resultado, dict) else "Erro de conexão"
        return {"status": "error", "message": f"Erro na API: {msg_erro}"}, 500

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

@app.route("/api/vendas", methods=['GET', 'POST'])
def salvar_venda():
    """
    Interface com a API externa de vendas (localhost:3000).
    Suporta listagem (GET) e criação (POST).
    """
    if 'token' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    if request.method == 'POST':
        try:
            dados = request.get_json()
            resultado = sync_to_api("api/vendas", data=dados, method="post")
            if resultado and not resultado.get('error_api'):
                return {"status": "success", "data": resultado}, 200
            
            # Repassa o erro exato da API externa (como o 400 de formato inválido)
            status_code = 400 
            msg_erro = "Erro de validação nos dados da venda."
            if isinstance(resultado, dict):
                status_code = resultado.get('status', 500)
                msg_erro = resultado.get('body', "Erro interno na API")
                
            return {"status": "error", "message": f"Erro na API: {msg_erro}"}, status_code
        except Exception as e:
            return {"status": "error", "message": str(e)}, 400

    # Método GET para listagem
    resultado = sync_to_api("api/vendas", method="get")
    return jsonify(resultado if resultado is not None else [])

@app.route("/api/locacoes", methods=['GET', 'POST'])
def salvar_aluguel():
    """
    Interface com a API externa de locações.
    POST: Cria uma nova locação.
    GET: Lista todas as locações.
    """
    if 'token' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    if request.method == 'POST':
        try:
            dados = request.get_json()
            resultado = sync_to_api("api/locacoes", data=dados, method="post")
            
            if resultado and not resultado.get('error_api'):
                return jsonify({"status": "success", "data": resultado}), 201
            
            msg_erro = resultado.get('body') if isinstance(resultado, dict) else "Erro de conexão"
            return jsonify({"status": "error", "message": f"Erro na API: {msg_erro}"}), 500
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 400

    # Método GET para listagem geral
    resultado = sync_to_api("api/locacoes", method="get")
    return jsonify(resultado if resultado is not None else [])

@app.route("/api/locacoes/<int:id>/status", methods=['PUT'])
def atualizar_status_locacao(id):
    """
    Proxy para atualização de status de locação na API externa.
    """
    if 'token' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    try:
        dados = request.get_json()
        resultado = sync_to_api(f"api/locacoes/{id}/status", data=dados, method="put")
        if resultado and not (isinstance(resultado, dict) and resultado.get('error_api')):
            return jsonify(resultado), 200
        msg_erro = resultado.get('body') if isinstance(resultado, dict) else "Erro de conexão"
        return jsonify({"status": "error", "message": f"Erro na API: {msg_erro}"}), 500
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route("/api/locacoes/<int:id>/devolver", methods=['POST'])
def devolver_locacao(id):
    """
    Endpoint para processar a devolução de uma locação específica.
    """
    if 'token' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    # Envia o comando de devolução para a API externa (https://api-jose-jhbt.onrender.com)
    resultado = sync_to_api(f"api/locacoes/{id}/devolver", method="post")
    
    if resultado is not None and not (isinstance(resultado, dict) and resultado.get('error_api')):
        return jsonify({"status": "success", "message": "Devolução realizada com sucesso"}), 200
    
    # Melhoria no tratamento de erro: se a API externa retornar HTML (Cannot POST), evitamos quebrar o JSON do Flask
    msg_erro = "Erro desconhecido ao processar devolução."

    if resultado is None:
        msg_erro = "Falha total de comunicação com a API externa."
    elif isinstance(resultado, dict):
        status_code = resultado.get('status')
        if status_code == 404:
            # Se a API externa retornar 404, o Flask agora reporta exatamente qual URL falhou
            msg_erro = f"A rota de devolução (POST api/locacoes/{id}/devolver) não foi encontrada na API externa. Verifique se o código foi atualizado no Render."
        elif status_code == 500:
            msg_erro = "Erro interno no servidor da API externa ao processar a transação de estoque."
        else:
            msg_erro = resultado.get('body') if (resultado.get('body') and len(str(resultado.get('body'))) < 150) else f"Erro inesperado (Status {status_code})."

    return jsonify({"status": "error", "message": msg_erro}), 500

@app.route("/api/locacoes/<int:id>/renovar", methods=['POST'])
def renovar_locacao(id):
    if 'token' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    dados = request.get_json()
    resultado = sync_to_api(f"api/locacoes/{id}/renovar", data=dados, method="post")
    if resultado and not (isinstance(resultado, dict) and resultado.get('error_api')):
        return jsonify({"status": "success", "message": "Locação renovada"}), 200
    return jsonify({"status": "error", "message": "Erro ao renovar"}), 500

@app.route("/api/locacoes/<int:id>/itens/<int:produto_id>/devolver", methods=['POST'])
def devolver_item_locacao(id, produto_id):
    if 'token' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    resultado = sync_to_api(f"api/locacoes/{id}/itens/{produto_id}/devolver", method="post")
    if resultado is not None and not (isinstance(resultado, dict) and resultado.get('error_api')):
        return jsonify({"status": "success", "message": "Item devolvido"}), 200
    return jsonify({"status": "error", "message": "Erro ao devolver item"}), 500

@app.route("/api/locacoes/<int:id>/itens/<int:produto_id>/renovar", methods=['POST'])
def renovar_item_locacao(id, produto_id):
    if 'token' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    dados = request.get_json()
    resultado = sync_to_api(f"api/locacoes/{id}/itens/{produto_id}/renovar", data=dados, method="post")
    if resultado and not (isinstance(resultado, dict) and resultado.get('error_api')):
        return jsonify({"status": "success", "message": "Item renovado"}), 200
    return jsonify({"status": "error", "message": "Erro ao renovar item"}), 500

@app.route("/api/locacoes/<int:id>")
def get_locacao_detalhe(id):
    if 'token' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    # Método GET para detalhe de uma locação específica (conforme especificação da API)
    resultado = sync_to_api(f"api/locacoes/{id}", method="get")
    return jsonify(resultado if resultado is not None else {})

@app.route("/aluguel")
def aluguel():
    if 'token' not in session:
        return redirect(url_for('login'))
    
    # Busca dados para popular os selects do formulário inicial
    res_clientes = sync_to_api("api/clientes", method="get")
    res_produtos = sync_to_api("api/produtos", method="get")

    # Garante que passamos listas para o template, mesmo em caso de erro na API
    lista_clientes = res_clientes if isinstance(res_clientes, list) else []
    lista_produtos = res_produtos if isinstance(res_produtos, list) else []

    for p in lista_produtos:
        if isinstance(p, dict):
            p['tipo'] = p.get('tipo') or '-'
            p['preco_venda'] = p.get('preco_venda') or 0.0
            p['valor_locacao'] = p.get('valor_locacao') or 0.0

    return render_template("aluguel.html", clientes=lista_clientes, produtos=lista_produtos)

@app.route("/dashboard")
def dashboard():
    if 'token' not in session:
        return redirect(url_for('login'))
    return render_template("dashboard.html")

@app.route("/api/dashboard/resumo")
def get_dashboard_resumo():
    if 'token' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    dados = sync_to_api("api/dashboard/resumo", method="get")
    return jsonify(dados if dados is not None else {})

@app.route("/api/dashboard/vendas-relatorio")
def get_vendas_relatorio():
    if 'token' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    dados = sync_to_api("api/dashboard/vendas-relatorio", method="get")
    return jsonify(dados if dados is not None else [])

@app.route("/api/dashboard/locacoes-relatorio")
def get_locacoes_relatorio():
    if 'token' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    dados = sync_to_api("api/dashboard/locacoes-relatorio", method="get")
    return jsonify(dados if dados is not None else [])

@app.route("/api/dashboard/financeiro-completo")
def get_financeiro_completo():
    if 'token' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    dados = sync_to_api("api/dashboard/financeiro-completo", method="get")
    return jsonify(dados if dados is not None else [])

@app.route("/api/dashboard/auditoria-integracao")
def get_auditoria_integracao():
    if 'token' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    dados = sync_to_api("api/dashboard/auditoria-integracao", method="get")
    return jsonify(dados if dados is not None else [])

if __name__ == "__main__":
    app.run(debug=True) 