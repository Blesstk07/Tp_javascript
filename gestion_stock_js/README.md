# Gestion de stock JS — kit de démarrage

Stack : JavaScript natif (interface) + Node.js/Express (API) + MySQL 8 (base de données).
Port prévu : 8003.

## Installation

Prérequis : Node.js LTS, npm, MySQL 8.0.16+ et Git.

1. Décompresser le dossier.
2. Ouvrir un terminal dans `gestion_stock_js`.
3. Exécuter :

```powershell
npm install
Copy-Item .env.example .env
```

4. Modifier `.env` avec les identifiants MySQL locaux.
5. Importer `database/schema.sql` avec MySQL Workbench ou la commande `mysql`.
   Le script crée automatiquement la base `gestion_stock_js`, la sélectionne,
   puis crée les tables. Vérifier que `DB_NAME=gestion_stock_js` dans `.env`.
6. Pour charger les données de démonstration, importer `database/seed.sql`
   après le schéma. Ce script remplace uniquement les enregistrements marqués
   `TEST-` et peut être relancé sans dupliquer ces données.
7. Démarrer :

```powershell
npm run dev
```

8. Vérifier `http://localhost:8003/api/health` et ouvrir `http://localhost:8003/app/`.

## Répartition

- Personne 1 : `public/` (HTML, CSS, JavaScript navigateur).
- Personne 2 : `src/` et `database/` (Express, API, SQL).
- Les deux : `CONTRAT_API.md`, tests Postman, intégration et validation.

## Important

Ce kit crée le squelette et les conventions de travail. Il ne contient pas encore l'implémentation métier complète des 19 endpoints. Les routes non encore développées répondent `501 NOT_IMPLEMENTED`. Implémentez-les selon `CONTRAT_API.md` avant la démonstration.

Ne changez pas les noms de champs, chemins, codes HTTP ou formats de réponse sans accord des deux personnes.
