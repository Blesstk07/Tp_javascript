# Contrat API commun — Gestion de stock

Version 1 — à valider et geler par les deux personnes avant l'intégration.

Base URL locale : `http://localhost:8003/api`
Format : JSON UTF-8. Champs JSON en `snake_case`. Aucune authentification dans le MVP.

## Conventions générales

### Pagination
Paramètres : `page=1`, `limit=20` (maximum 100).
Réponse de liste :

```json
{
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 0 }
}
```

### Montants et dates
- Les montants sont des chaînes décimales à deux chiffres : `"1250.00"`.
- Ne jamais calculer l'argent avec des flottants JavaScript.
- Les dates sont au format ISO 8601.
- Les paramètres inconnus ou invalides doivent produire une erreur claire.

### Format d'erreur obligatoire
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Données invalides",
    "details": []
  }
}
```

Codes attendus : `VALIDATION_ERROR`, `NOT_FOUND`, `DUPLICATE_SKU`,
`DUPLICATE_NAME`, `INSUFFICIENT_STOCK`, `CONFLICT`, `INTERNAL_ERROR`.

HTTP 400 pour validation, 404 pour ressource absente, 409 pour conflit,
500 pour erreur serveur. `DELETE` réussi : 204 sans corps.

## Les 19 endpoints

| # | Méthode | Chemin | Usage | Succès | Erreurs principales |
|---|---|---|---|---|---|
| 1 | GET | `/products` | Liste/recherche produits | 200 | 400 |
| 2 | POST | `/products` | Créer produit | 201 | 400, 404, 409 |
| 3 | GET | `/products/:id` | Détail produit | 200 | 404 |
| 4 | PUT | `/products/:id` | Modifier produit | 200 | 400, 404, 409 |
| 5 | DELETE | `/products/:id` | Supprimer produit | 204 | 404, 409 |
| 6 | GET | `/categories` | Liste catégories | 200 | 400 |
| 7 | POST | `/categories` | Créer catégorie | 201 | 400, 409 |
| 8 | PUT | `/categories/:id` | Modifier catégorie | 200 | 400, 404, 409 |
| 9 | GET | `/suppliers` | Liste fournisseurs | 200 | 400 |
| 10 | POST | `/suppliers` | Créer fournisseur | 201 | 400, 409 |
| 11 | PUT | `/suppliers/:id` | Modifier fournisseur | 200 | 400, 404, 409 |
| 12 | GET | `/stock` | État du stock | 200 | 400 |
| 13 | POST | `/stock/entries` | Enregistrer approvisionnement | 201 | 400, 404 |
| 14 | GET | `/stock/movements` | Historique mouvements | 200 | 400 |
| 15 | POST | `/sales` | Enregistrer vente | 201 | 400, 404, 409 |
| 16 | GET | `/sales` | Historique ventes | 200 | 400 |
| 17 | GET | `/sales/:id` | Détail vente avec lignes | 200 | 404 |
| 18 | GET | `/dashboard` | Statistiques générales | 200 | — |
| 19 | GET | `/health` | Santé API | 200 | — |

## Détails des entrées

### Produits

`GET /products?page=1&limit=20&search=sav&category_id=3`

`POST /products`
```json
{
  "category_id": 3,
  "name": "Savon 200 g",
  "sku": "SAV-200",
  "description": "Savon de ménage",
  "purchase_price": "850.00",
  "sale_price": "1200.00",
  "quantity": 0,
  "min_quantity": 10
}
```

`PUT /products/:id` accepte les mêmes champs que la création.
La réponse produit expose au minimum : `id`, `category_id`, `category_name`,
`name`, `sku`, `description`, `purchase_price`, `sale_price`, `quantity`,
`min_quantity`.

### Catégories

`POST /categories` et `PUT /categories/:id`
```json
{ "name": "Hygiène", "description": "Produits d'hygiène" }
```

### Fournisseurs

`POST /suppliers` et `PUT /suppliers/:id`
```json
{
  "name": "Fournisseur Central",
  "phone": "+243...",
  "email": "contact@example.com",
  "address": "Kinshasa"
}
```

### Stock

`GET /stock?page=1&limit=20&low_stock=true`

Statut calculé :
- `OUT` si `quantity = 0`
- `LOW` si `quantity <= min_quantity`
- `OK` sinon

`POST /stock/entries`
```json
{
  "supplier_id": 12,
  "items": [
    { "product_id": 1001, "quantity": 50, "unit_cost": "850.00" }
  ]
}
```

`GET /stock/movements?page=1&limit=20&product_id=1001&type=IN`
`type` vaut `IN` ou `OUT`.

### Ventes

`POST /sales`
```json
{
  "items": [
    { "product_id": 1001, "quantity": 2 },
    { "product_id": 17, "quantity": 1 }
  ]
}
```

Une vente doit être atomique : si une ligne échoue, toute la vente est annulée.
Le stock ne doit jamais devenir négatif. Retourner 409 avec `INSUFFICIENT_STOCK`
si la quantité demandée dépasse le stock disponible.

`GET /sales?page=1&limit=20`
`GET /sales/:id` retourne la vente et ses lignes.

### Dashboard et santé

`GET /dashboard` retourne les compteurs convenus par le groupe :
nombre de produits, nombre de catégories, nombre de fournisseurs,
nombre de produits en stock faible et valeur/indicateurs de vente retenus.
Les noms définitifs des compteurs doivent être confirmés ensemble avant intégration.

`GET /health`
```json
{ "status": "ok" }
```

## Règles métier non négociables

- Les approvisionnements et les ventes utilisent une transaction MySQL.
- Utiliser `SELECT ... FOR UPDATE` pour verrouiller les lignes de stock concernées.
- Prévoir jusqu'à 3 tentatives en cas de deadlock MySQL 1213 ou lock timeout 1205.
- Contrainte base : quantité de stock jamais négative.
- Utiliser des requêtes SQL préparées.
- Les quatre endpoints ajoutés au contrat initial (PUT catégories, PUT fournisseurs,
  GET détail vente, GET health) doivent être considérés comme proposés dans le document
  source et validés par le groupe avant d'être déclarés définitifs.
