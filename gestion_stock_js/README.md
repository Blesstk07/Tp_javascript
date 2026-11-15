# Gestion de stock JS

Application de gestion de stock : interface HTML/CSS/JavaScript, API Node.js/Express et base MariaDB/MySQL.

## Prérequis

- Node.js 18 ou ultérieur et npm
- MySQL 8.0.16+ ou MariaDB 10.4+
- La base locale doit correspondre aux valeurs de `DB_*` dans `.env`

## Installation et démarrage (PowerShell)

Depuis le dossier `gestion_stock_js` :

```powershell
Copy-Item .env.example .env
npm install
```

Renseignez les identifiants dans `.env`, puis importez `database/schema.sql` dans MySQL/MariaDB. Pour charger les données de démonstration facultatives, importez ensuite `database/seed.sql`.

```powershell
npm start
```

Ouvrez `http://localhost:8003/` (la même interface reste disponible sous `http://localhost:8003/app/`). Le point `http://localhost:8003/api/health` vérifie maintenant la connexion MySQL et retourne `503 DB_UNAVAILABLE` si elle échoue.

En développement, `npm run dev` redémarre le serveur à chaque modification.

## Fonctionnement

- Les catégories, fournisseurs, produits, stocks, mouvements, ventes et statistiques utilisent l’API et la base réelle.
- Un nouveau produit commence avec un stock nul. Les entrées s’enregistrent dans la page Stock, afin que chaque variation soit historisée.
- Les ventes et les approvisionnements sont atomiques. Le serveur verrouille les produits concernés, empêche un stock négatif et recalcule les montants à partir des prix en base.
- Les montants sont traités sans calcul en virgule flottante.

## Tests

```powershell
npm test
```

Les tests automatisés couvrent la validation de la pagination, l’arithmétique monétaire et les transactions. Les vérifications MySQL et parcours complets sont décrits dans `RAPPORT_AUDIT_FINAL.txt`.
