require('dotenv').config();
const app = require('./app');
const port = Number(process.env.PORT || 8003);

app.listen(port, () => {
  console.log(`gestion_stock_js disponible sur http://localhost:${port}`);
});
