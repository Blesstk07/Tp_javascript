-- Jeu de donnees de test pour database/schema.sql.
-- Les lignes marquees TEST- sont remplacees a chaque execution.
-- Les autres donnees de la base ne sont pas supprimees.

USE gestion_stock_js;
SET NAMES utf8mb4;

START TRANSACTION;

-- Nettoyer uniquement les mouvements et transactions de ce jeu de test.
DELETE sm
FROM stock_movements sm
INNER JOIN supply_items si ON si.id = sm.supply_item_id
INNER JOIN supplies s ON s.id = si.supply_id
WHERE s.supply_number LIKE 'TEST-SUP-%';

DELETE sm
FROM stock_movements sm
INNER JOIN sale_items si ON si.id = sm.sale_item_id
INNER JOIN sales s ON s.id = si.sale_id
WHERE s.sale_number LIKE 'TEST-SALE-%';

DELETE si
FROM supply_items si
INNER JOIN supplies s ON s.id = si.supply_id
WHERE s.supply_number LIKE 'TEST-SUP-%';

DELETE si
FROM sale_items si
INNER JOIN sales s ON s.id = si.sale_id
WHERE s.sale_number LIKE 'TEST-SALE-%';

DELETE FROM supplies WHERE supply_number LIKE 'TEST-SUP-%';
DELETE FROM sales WHERE sale_number LIKE 'TEST-SALE-%';
DELETE FROM products WHERE sku LIKE 'TEST-%';
DELETE FROM categories WHERE name LIKE 'TEST - %';
DELETE FROM suppliers WHERE name LIKE 'TEST - %';

INSERT INTO categories (name, description, is_active) VALUES
    ('TEST - Alimentation', 'Categorie de test pour produits alimentaires', 1),
    ('TEST - Hygiene', 'Categorie de test pour produits d hygiene', 1),
    ('TEST - Boissons', 'Categorie de test pour boissons', 1);

INSERT INTO suppliers (name, contact_name, email, phone, address, is_active) VALUES
    ('TEST - Fournisseur Central', 'Alex Test', 'central@example.test', '+243000000001', 'Kinshasa', 1),
    ('TEST - Grossiste Marche', 'Sam Test', 'marche@example.test', '+243000000002', 'Gombe', 1);

SET @category_food = (SELECT id FROM categories WHERE name = 'TEST - Alimentation');
SET @category_hygiene = (SELECT id FROM categories WHERE name = 'TEST - Hygiene');
SET @category_drinks = (SELECT id FROM categories WHERE name = 'TEST - Boissons');
SET @supplier_central = (SELECT id FROM suppliers WHERE name = 'TEST - Fournisseur Central');
SET @supplier_market = (SELECT id FROM suppliers WHERE name = 'TEST - Grossiste Marche');

INSERT INTO products
    (category_id, sku, name, description, unit, purchase_price, selling_price, stock_quantity, alert_threshold, is_active)
VALUES
    (@category_food, 'TEST-RICE-001', 'Riz 1 kg', 'Sac de riz de test', 'sac', 1.20, 2.00, 0, 10, 1),
    (@category_food, 'TEST-MILK-001', 'Lait 1 L', 'Brique de lait de test', 'piece', 0.80, 1.50, 0, 10, 1),
    (@category_hygiene, 'TEST-SOAP-001', 'Savon', 'Savon de test', 'piece', 2.50, 4.00, 0, 20, 1),
    (@category_drinks, 'TEST-COFFEE-001', 'Cafe 250 g', 'Paquet de cafe de test', 'paquet', 5.00, 8.00, 0, 5, 1),
    (@category_food, 'TEST-FLOUR-001', 'Farine 1 kg', 'Sac de farine de test', 'sac', 1.50, 2.50, 0, 5, 1),
    (@category_drinks, 'TEST-TEA-001', 'The', 'Produit volontairement epuise', 'boite', 2.00, 3.00, 0, 5, 1);

SET @product_rice = (SELECT id FROM products WHERE sku = 'TEST-RICE-001');
SET @product_milk = (SELECT id FROM products WHERE sku = 'TEST-MILK-001');
SET @product_soap = (SELECT id FROM products WHERE sku = 'TEST-SOAP-001');
SET @product_coffee = (SELECT id FROM products WHERE sku = 'TEST-COFFEE-001');
SET @product_flour = (SELECT id FROM products WHERE sku = 'TEST-FLOUR-001');

-- Approvisionnement 1 : 50 riz, 40 laits et 20 savons; total 142.00.
INSERT INTO supplies (supplier_id, supply_number, total_amount, notes)
VALUES (@supplier_central, 'TEST-SUP-001', 142.00, 'Approvisionnement de test numero 1');
SET @supply_one = LAST_INSERT_ID();

INSERT INTO supply_items (supply_id, product_id, quantity, unit_cost, line_total)
VALUES (@supply_one, @product_rice, 50, 1.20, 60.00);
SET @supply_item = LAST_INSERT_ID();
INSERT INTO stock_movements (product_id, movement_type, quantity, supply_item_id, notes)
VALUES (@product_rice, 'IN', 50, @supply_item, 'Entree test TEST-SUP-001');
UPDATE products SET stock_quantity = stock_quantity + 50 WHERE id = @product_rice;

INSERT INTO supply_items (supply_id, product_id, quantity, unit_cost, line_total)
VALUES (@supply_one, @product_milk, 40, 0.80, 32.00);
SET @supply_item = LAST_INSERT_ID();
INSERT INTO stock_movements (product_id, movement_type, quantity, supply_item_id, notes)
VALUES (@product_milk, 'IN', 40, @supply_item, 'Entree test TEST-SUP-001');
UPDATE products SET stock_quantity = stock_quantity + 40 WHERE id = @product_milk;

INSERT INTO supply_items (supply_id, product_id, quantity, unit_cost, line_total)
VALUES (@supply_one, @product_soap, 20, 2.50, 50.00);
SET @supply_item = LAST_INSERT_ID();
INSERT INTO stock_movements (product_id, movement_type, quantity, supply_item_id, notes)
VALUES (@product_soap, 'IN', 20, @supply_item, 'Entree test TEST-SUP-001');
UPDATE products SET stock_quantity = stock_quantity + 20 WHERE id = @product_soap;

-- Approvisionnement 2 : 30 cafes et 60 farines; total 240.00.
INSERT INTO supplies (supplier_id, supply_number, total_amount, notes)
VALUES (@supplier_market, 'TEST-SUP-002', 240.00, 'Approvisionnement de test numero 2');
SET @supply_two = LAST_INSERT_ID();

INSERT INTO supply_items (supply_id, product_id, quantity, unit_cost, line_total)
VALUES (@supply_two, @product_coffee, 30, 5.00, 150.00);
SET @supply_item = LAST_INSERT_ID();
INSERT INTO stock_movements (product_id, movement_type, quantity, supply_item_id, notes)
VALUES (@product_coffee, 'IN', 30, @supply_item, 'Entree test TEST-SUP-002');
UPDATE products SET stock_quantity = stock_quantity + 30 WHERE id = @product_coffee;

INSERT INTO supply_items (supply_id, product_id, quantity, unit_cost, line_total)
VALUES (@supply_two, @product_flour, 60, 1.50, 90.00);
SET @supply_item = LAST_INSERT_ID();
INSERT INTO stock_movements (product_id, movement_type, quantity, supply_item_id, notes)
VALUES (@product_flour, 'IN', 60, @supply_item, 'Entree test TEST-SUP-002');
UPDATE products SET stock_quantity = stock_quantity + 60 WHERE id = @product_flour;

-- Vente 1 : 5 riz et 3 laits; total 14.50.
INSERT INTO sales (sale_number, total_amount, notes)
VALUES ('TEST-SALE-001', 14.50, 'Vente de test numero 1');
SET @sale_one = LAST_INSERT_ID();

INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, line_total)
VALUES (@sale_one, @product_rice, 5, 2.00, 10.00);
SET @sale_item = LAST_INSERT_ID();
INSERT INTO stock_movements (product_id, movement_type, quantity, sale_item_id, notes)
VALUES (@product_rice, 'OUT', 5, @sale_item, 'Sortie test TEST-SALE-001');
UPDATE products SET stock_quantity = stock_quantity - 5 WHERE id = @product_rice;

INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, line_total)
VALUES (@sale_one, @product_milk, 3, 1.50, 4.50);
SET @sale_item = LAST_INSERT_ID();
INSERT INTO stock_movements (product_id, movement_type, quantity, sale_item_id, notes)
VALUES (@product_milk, 'OUT', 3, @sale_item, 'Sortie test TEST-SALE-001');
UPDATE products SET stock_quantity = stock_quantity - 3 WHERE id = @product_milk;

-- Vente 2 : 2 savons et 2 cafes; total 24.00.
INSERT INTO sales (sale_number, total_amount, notes)
VALUES ('TEST-SALE-002', 24.00, 'Vente de test numero 2');
SET @sale_two = LAST_INSERT_ID();

INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, line_total)
VALUES (@sale_two, @product_soap, 2, 4.00, 8.00);
SET @sale_item = LAST_INSERT_ID();
INSERT INTO stock_movements (product_id, movement_type, quantity, sale_item_id, notes)
VALUES (@product_soap, 'OUT', 2, @sale_item, 'Sortie test TEST-SALE-002');
UPDATE products SET stock_quantity = stock_quantity - 2 WHERE id = @product_soap;

INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, line_total)
VALUES (@sale_two, @product_coffee, 2, 8.00, 16.00);
SET @sale_item = LAST_INSERT_ID();
INSERT INTO stock_movements (product_id, movement_type, quantity, sale_item_id, notes)
VALUES (@product_coffee, 'OUT', 2, @sale_item, 'Sortie test TEST-SALE-002');
UPDATE products SET stock_quantity = stock_quantity - 2 WHERE id = @product_coffee;

-- Vente 3 : 7 riz, 1 lait et 4 farines; total 25.50.
INSERT INTO sales (sale_number, total_amount, notes)
VALUES ('TEST-SALE-003', 25.50, 'Vente de test numero 3');
SET @sale_three = LAST_INSERT_ID();

INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, line_total)
VALUES (@sale_three, @product_rice, 7, 2.00, 14.00);
SET @sale_item = LAST_INSERT_ID();
INSERT INTO stock_movements (product_id, movement_type, quantity, sale_item_id, notes)
VALUES (@product_rice, 'OUT', 7, @sale_item, 'Sortie test TEST-SALE-003');
UPDATE products SET stock_quantity = stock_quantity - 7 WHERE id = @product_rice;

INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, line_total)
VALUES (@sale_three, @product_milk, 1, 1.50, 1.50);
SET @sale_item = LAST_INSERT_ID();
INSERT INTO stock_movements (product_id, movement_type, quantity, sale_item_id, notes)
VALUES (@product_milk, 'OUT', 1, @sale_item, 'Sortie test TEST-SALE-003');
UPDATE products SET stock_quantity = stock_quantity - 1 WHERE id = @product_milk;

INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, line_total)
VALUES (@sale_three, @product_flour, 4, 2.50, 10.00);
SET @sale_item = LAST_INSERT_ID();
INSERT INTO stock_movements (product_id, movement_type, quantity, sale_item_id, notes)
VALUES (@product_flour, 'OUT', 4, @sale_item, 'Sortie test TEST-SALE-003');
UPDATE products SET stock_quantity = stock_quantity - 4 WHERE id = @product_flour;

COMMIT;

-- Resultats attendus : 3 categories, 2 fournisseurs, 6 produits,
-- 2 approvisionnements, 3 ventes et les mouvements correspondants.
SELECT sku, name, stock_quantity AS quantity, alert_threshold AS min_quantity
FROM products
WHERE sku LIKE 'TEST-%'
ORDER BY sku;

SELECT sale_number, total_amount
FROM sales
WHERE sale_number LIKE 'TEST-SALE-%'
ORDER BY sale_number;
