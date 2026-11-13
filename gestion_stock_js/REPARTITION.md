# Répartition conjointe

## Personne 1 — interface

Dossier propriétaire : `public/`

- Construire les pages `index.html`, `products.html`, `categories.html`, `suppliers.html`, `stock.html`, `sales.html`.
- Écrire le CSS responsive dans `public/css/style.css`.
- Écrire le JavaScript navigateur dans `public/js/`.
- Utiliser exclusivement `api()` de `public/js/api.js` pour appeler le serveur.
- Ne pas écrire de SQL, ne pas accéder directement à MySQL.
- Ne pas inventer de routes ou de propriétés JSON : suivre `CONTRAT_API.md`.
- Tester chaque formulaire avec les réponses réelles de l'API.

Livrables : pages utilisables, validations visuelles, messages d'erreur, tableau de données, tests navigateur.

## Personne 2 — backend et base de données

Dossiers propriétaires : `src/` et `database/`

- Configurer Express, MySQL, dotenv et Zod.
- Implémenter routes, contrôleurs et services.
- Utiliser des requêtes SQL préparées (`?`), jamais de concaténation d'entrée utilisateur.
- Valider les POST/PUT avec Zod.
- Implémenter approvisionnements et ventes avec transactions SQL.
- Toujours libérer la connexion avec `conn.release()` dans `finally`.
- Respecter exactement le contrat API.

Livrables : API fonctionnelle, schéma SQL commun, gestion uniforme des erreurs, tests API.

## Règles communes

1. Le contrat API est la référence commune.
2. Toute modification du contrat doit être acceptée par les deux personnes avant le code.
3. Chaque endpoint est testé dans Postman avant d'être branché à l'interface.
4. Une personne ne modifie pas le dossier principal de l'autre sans prévenir.
5. Chaque membre doit pouvoir expliquer au moins un flux complet : interface → API → SQL → réponse.
6. Pas de commit direct sur `main`. Utiliser des branches :
   - `feat/frontend-pages`
   - `feat/backend-api`
7. Fusionner régulièrement après revue et test.

## Ordre d'intégration

1. Personne 2 démarre `/api/health`.
2. Personne 1 crée les pages et les états vides avec des données temporaires clairement identifiées.
3. Personne 2 livre les endpoints Produits et Catégories.
4. Personne 1 branche les pages avec `api()`.
5. Les deux testent les cas normaux et les erreurs.
6. Répéter pour Stock, Approvisionnement, Ventes et Dashboard.
