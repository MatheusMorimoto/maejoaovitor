DELIMITER $$

CREATE TRIGGER trg_before_insert_locacoes
BEFORE INSERT ON locacoes
FOR EACH ROW
BEGIN
    DECLARE disponivel INT;

    SELECT quantidade_disponivel INTO disponivel
    FROM produtos
    WHERE id = NEW.produto_id;

    IF disponivel < NEW.quantidade THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Quantidade indisponível para locação.';
    END IF;
END$$

DELIMITER ;

DELIMITER $$

CREATE TRIGGER trg_before_insert_venda_itens
BEFORE INSERT ON venda_itens
FOR EACH ROW
BEGIN
    DECLARE estoque INT;

    SELECT estoque_atual INTO estoque
    FROM produtos
    WHERE id = NEW.produto_id;

    IF estoque < NEW.quantidade THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Estoque insuficiente para venda.';
    END IF;
END$$

DELIMITER ;

DELIMITER $$

CREATE TRIGGER trg_after_insert_venda_itens
AFTER INSERT ON venda_itens
FOR EACH ROW
BEGIN
    UPDATE produtos
    SET estoque_atual = estoque_atual - NEW.quantidade
    WHERE id = NEW.produto_id;

    UPDATE vendas
    SET valor_total = (
        SELECT IFNULL(SUM(valor_total),0)
        FROM venda_itens
        WHERE venda_id = NEW.venda_id
    )
    WHERE id = NEW.venda_id;
END$$

DELIMITER ;

DELIMITER $$

CREATE TRIGGER trg_after_delete_venda_itens
AFTER DELETE ON venda_itens
FOR EACH ROW
BEGIN
    UPDATE produtos
    SET estoque_atual = estoque_atual + OLD.quantidade
    WHERE id = OLD.produto_id;

    UPDATE vendas
    SET valor_total = (
        SELECT IFNULL(SUM(valor_total),0)
        FROM venda_itens
        WHERE venda_id = OLD.venda_id
    )
    WHERE id = OLD.venda_id;
END$$

DELIMITER ;

DELIMITER $$

CREATE TRIGGER trg_after_update_frete
AFTER UPDATE ON vendas
FOR EACH ROW
BEGIN
    IF OLD.frete_valor <> NEW.frete_valor THEN
        UPDATE vendas
        SET total_final = valor_total + frete_valor
        WHERE id = NEW.id;
    END IF;
END$$

DELIMITER ;

DELIMITER $$

CREATE TRIGGER trg_before_insert_transacoes
BEFORE INSERT ON transacoes
FOR EACH ROW
BEGIN
    DECLARE estoque INT;

    SELECT estoque_atual INTO estoque
    FROM produtos
    WHERE id = NEW.produto_id;

    IF NEW.tipo = 'saida' AND estoque < NEW.quantidade THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Estoque insuficiente.';
    END IF;
END$$

DELIMITER ;

DELIMITER $$

CREATE TRIGGER trg_after_insert_transacoes
AFTER INSERT ON transacoes
FOR EACH ROW
BEGIN
    IF NEW.tipo = 'entrada' THEN
        UPDATE produtos
        SET estoque_atual = estoque_atual + NEW.quantidade
        WHERE id = NEW.produto_id;
    ELSE
        UPDATE produtos
        SET estoque_atual = estoque_atual - NEW.quantidade
        WHERE id = NEW.produto_id;
    END IF;
END$$

DELIMITER ;

DELIMITER $$

CREATE TRIGGER trg_before_insert_locacoes
BEFORE INSERT ON locacoes
FOR EACH ROW
BEGIN
    DECLARE disponivel INT;

    SELECT quantidade_disponivel INTO disponivel
    FROM produtos
    WHERE id = NEW.produto_id;

    IF disponivel < NEW.quantidade THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Produto indisponível para locação.';
    END IF;
END$$

DELIMITER ;

DELIMITER $$

CREATE TRIGGER trg_after_insert_locacoes
AFTER INSERT ON locacoes
FOR EACH ROW
BEGIN
    UPDATE produtos
    SET quantidade_disponivel = quantidade_disponivel - NEW.quantidade
    WHERE id = NEW.produto_id;
END$$

DELIMITER ;

DELIMITER $$

CREATE TRIGGER trg_after_update_locacoes
AFTER UPDATE ON locacoes
FOR EACH ROW
BEGIN
    IF OLD.status = 'ativa' AND NEW.status = 'devolvida' THEN
        UPDATE produtos
        SET quantidade_disponivel = quantidade_disponivel + NEW.quantidade
        WHERE id = NEW.produto_id;
    END IF;
END$$

DELIMITER ;

DELIMITER $$

CREATE TRIGGER trg_before_delete_vendas
BEFORE DELETE ON vendas
FOR EACH ROW
BEGIN
    IF OLD.status = 'concluida' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Venda concluída não pode ser excluída.';
    END IF;
END$$

DELIMITER ;

DELIMITER $$

CREATE TRIGGER trg_after_insert_vendas_log
AFTER INSERT ON vendas
FOR EACH ROW
BEGIN
    INSERT INTO logs_auditoria
    (usuario_id, acao, tabela_afetada, registro_id)
    VALUES
    (NEW.usuario_id, 'Nova venda criada', 'vendas', NEW.id);
END$$

DELIMITER ;

DELIMITER $$

CREATE TRIGGER trg_before_update_produtos
BEFORE UPDATE ON produtos
FOR EACH ROW
BEGIN
    IF NEW.estoque_atual < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Estoque não pode ser negativo.';
    END IF;
END$$

DELIMITER ;

DELIMITER $$

CREATE TRIGGER trg_before_insert_vendas_cliente
BEFORE INSERT ON vendas
FOR EACH ROW
BEGIN
    DECLARE cliente_ativo BOOLEAN;

    SELECT ativo INTO cliente_ativo
    FROM clientes
    WHERE id = NEW.cliente_id;

    IF cliente_ativo = FALSE THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cliente inativo.';
    END IF;
END$$

DELIMITER ;