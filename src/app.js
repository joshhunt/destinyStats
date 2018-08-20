require('dotenv').config({ path: path.join(__dirname, '.env') });
require('isomorphic-fetch');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { Item, Perk } = require('./lib/db');
const { getAllProfilesForUser } = require('./lib/destiny');

const {
  updateInventory,
  updateInventoryQueueStatus
} = require('./routes/updateInventory');

const app = express();
const PORT = process.env.PORT;

app.use(
  cors({
    origin: ['https://destinysets.com', 'https://localhost:4000']
  })
);

app.use(morgan('tiny'));

app.get('/', (req, res) => {
  res.json({ hello: 'world' });
});

app.get('/test', (req, res, next) => {
  Item.create(
    {
      membershipId: 12345,
      membershipType: 1,
      instanceId: Date.now(),
      hash: 2345,
      perks: [{ hash: 456, perkIndex: 1 }, { hash: 789, perkIndex: 2 }]
    },
    {
      include: [Perk]
    }
  )
    .then(item => {
      res.json(item.toJSON());
    })
    .catch(next);
});

app.post('/update-inventory', updateInventory);
app.get('/update-inventory/queue', updateInventoryQueueStatus);

app.listen(PORT, () => {
  console.log('CORS-enabled web server listening on port', PORT);
});
