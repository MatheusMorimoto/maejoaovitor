CREATE VIEW vw_estoque_resumo AS
SELECT 
    p.id,
    p.nome,
    p.tipo,
    p.estoque_atual,
    p.quantidade_disponivel,
    p.estoque_minimo,
    CASE 
        WHEN p.estoque_atual <= p.estoque_minimo THEN 'baixo'
        ELSE 'normal'
    END AS status_estoque
FROM produtos p;

CREATE VIEW vw_vendas_detalhadas AS
SELECT 
    v.id AS venda_id,
    v.criado_em,
    v.forma_pagamento,
    v.status,
    v.valor_total,
    v.frete_valor,
    (v.valor_total + v.frete_valor) AS total_final,
    
    c.nome AS cliente_nome,
    c.cpf,
    
    u.nome AS vendedor
    
FROM vendas v
LEFT JOIN clientes c ON c.id = v.cliente_id
LEFT JOIN usuarios u ON u.id = v.usuario_id;

CREATE VIEW vw_venda_itens_margem AS
SELECT 
    vi.id,
    vi.venda_id,
    p.nome AS produto,
    vi.quantidade,
    vi.valor_unitario,
    vi.valor_total,
    p.preco_custo,
    (vi.valor_unitario - p.preco_custo) AS lucro_unitario,
    (vi.valor_total - (p.preco_custo * vi.quantidade)) AS lucro_total
FROM venda_itens vi
JOIN produtos p ON p.id = vi.produto_id;

CREATE VIEW vw_locacoes_ativas AS
SELECT 
    l.id,
    p.nome AS produto,
    c.nome AS cliente,
    l.quantidade,
    l.valor_total,
    l.data_inicio,
    l.data_prevista_devolucao,
    DATEDIFF(NOW(), l.data_prevista_devolucao) AS dias_atraso,
    l.status
FROM locacoes l
JOIN produtos p ON p.id = l.produto_id
JOIN clientes c ON c.id = l.cliente_id
WHERE l.status IN ('ativa','atrasada');

CREATE VIEW vw_financeiro_clientes AS
SELECT 
    c.id AS cliente_id,
    c.nome,
    SUM(
        CASE 
            WHEN f.tipo = 'debito' AND f.status = 'pendente' 
            THEN f.valor 
            ELSE 0 
        END
    ) AS total_em_aberto
FROM clientes c
LEFT JOIN financeiro_clientes f ON f.cliente_id = c.id
GROUP BY c.id;

CREATE VIEW vw_dashboard_resumo AS
SELECT
    (SELECT COUNT(*) FROM clientes WHERE ativo = TRUE) AS total_clientes,
    (SELECT COUNT(*) FROM produtos WHERE ativo = TRUE) AS total_produtos,
    (SELECT SUM(valor_total + frete_valor) FROM vendas WHERE status = 'concluida') AS faturamento_total,
    (SELECT COUNT(*) FROM locacoes WHERE status = 'ativa') AS locacoes_ativas;
    
CREATE VIEW vw_produtos_mais_vendidos AS
SELECT 
    p.id,
    p.nome,
    SUM(vi.quantidade) AS total_vendido
FROM venda_itens vi
JOIN produtos p ON p.id = vi.produto_id
GROUP BY p.id
ORDER BY total_vendido DESC;

CREATE VIEW vw_cliente_historico AS
SELECT 
    c.id AS cliente_id,
    c.nome,
    v.id AS venda_id,
    v.criado_em,
    (v.valor_total + v.frete_valor) AS total_venda
FROM clientes c
LEFT JOIN vendas v ON v.cliente_id = c.id;