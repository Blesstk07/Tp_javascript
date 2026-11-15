const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const app = require('./app');
const port = Number(process.env.PORT || 8003);

app.listen(port, () => {
  console.log(`gestion_stock_js disponible sur http://localhost:${port}`);
});
