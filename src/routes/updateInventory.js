const _ = require('lodash');
const async = require('async');
const present = require('present');
const { Op } = require('sequelize');

const { Item, Plug } = require('../lib/db');
const { getAllProfilesForUser } = require('../lib/destiny');

const DB_CONCURRENCY = 10;

const dbQueue = async.queue((job, cb) => {
  const { memberships, items } = job;

  const start = present();
  return Item.destroy({ where: { [Op.or]: memberships } })
    .then(() => {
      return Promise.all(
        items.map(item => Item.create(item, { include: [Plug] }))
      );
    })
    .then(() => cb())
    .catch(cb);
}, DB_CONCURRENCY);

function collectItems(profiles) {
  const { membershipType, membershipId } = profiles[0].profile.data.userInfo;

  const socketsLookup = profiles[0].itemComponents.sockets.data;

  function createItems(location, instancedItem) {
    let plugs = socketsLookup[instancedItem.itemInstanceId];

    const baseItem = {
      membershipType,
      membershipId,
      itemHash: instancedItem.itemHash,
      itemInstanceId: instancedItem.itemInstanceId,
      quantity: instancedItem.quantity,
      location
    };

    if (plugs) {
      baseItem.plugs = plugs.sockets.map((plug, socketIndex) => ({
        plugHash: plug.plugHash,
        socketIndex
      }));
    }

    return baseItem;
  }

  const characterInventoryItems = _.chain(profiles[0].characterInventories.data)
    .flatMap(inventory => inventory.items)
    .map(createItems.bind(null, 'characterInventory'))
    .value();

  const characterEquipmentItems = _(profiles[0].characterEquipment.data)
    .flatMap(inventory => inventory.items)
    .map(createItems.bind(null, 'characterEquipment'))
    .value();

  const profileInventoryItems = _(profiles[0].profileInventory.data.items)
    .map(createItems.bind(null, 'profileInventory'))
    .value();

  const items = _([])
    .concat(
      characterInventoryItems,
      characterEquipmentItems,
      profileInventoryItems
    )
    .groupBy('itemHash')
    .flatMap((items, itemHash) => {
      const [sampleItem] = items;

      return sampleItem.itemInstanceId
        ? items
        : {
            ...sampleItem,
            quantity: items.reduce((acc, item) => acc + item.quantity, 0)
          };
    })
    .value();

  return items;
}

function updateInventory(req, res, next) {
  console.log('Fetching profiles for user');
  getAllProfilesForUser(req.query.accessToken)
    .then(profiles => {
      console.log('Got profiles, massaging data');

      const items = collectItems(profiles.profiles);

      const memberships = profiles.profiles.map(profile =>
        _.pick(profile.profile.data.userInfo, [
          'membershipType',
          'membershipId'
        ])
      );

      dbQueue.push({ memberships, items });

      res.send({ success: `let's hope so!` });
    })
    .catch(next);
}

module.exports = updateInventory;
