# Tests

Lancer les tests automatisés depuis `gestion_stock_js` :

```powershell
npm test
```

Les tests vérifient les limites de pagination, l'exactitude des calculs
monétaires et le rollback/retry transactionnel. Le parcours de bout en bout
sur MySQL/MariaDB et les résultats de l'audit sont détaillés dans
`RAPPORT_AUDIT_FINAL.txt`.
