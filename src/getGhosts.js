require('dotenv').config();
const { Op } = require('sequelize');
const { Item, Plug, ready } = require('./lib/db');
const { getItemDefinitions, filterItemGhosts } = require('./lib/definitions');

ready
  .then(getItemDefinitions)
  .then(itemDefs => {
    const ghostHashes = Object.values(itemDefs)
      .filter(filterItemGhosts)
      .map(item => item.hash);

    console.log('Querying DB for', ghostHashes.length, 'ghosts');

    return Item.findAll({
      include: [Plug],
      where: {
        itemHash: {
          [Op.in]: ghostHashes
        }
      },
      order: [[Plug, 'socketIndex']]
    });
  })
  .then(ghosts => {
    require('fs').writeFileSync(
      './ghosts.json',
      JSON.stringify(ghosts, null, 2)
    );
    ghosts.forEach(g => {
      console.log(g.itemHash);
      g.plugs.forEach(p => {
        console.log(` - ${p.socketIndex}: ${p.plugHash}`);
      });
    });
  })
  .catch(err => {
    console.error(err);
  });
