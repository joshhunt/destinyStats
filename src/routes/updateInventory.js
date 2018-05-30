const _ = require('lodash');
const async = require('async');
const present = require('present');
const { Op } = require('sequelize');

const { db, Item, Plug } = require('../lib/db');
const { getAllProfilesForUser } = require('../lib/destiny');

const DB_CONCURRENCY = 10;

const dbQueue = async.queue((job, cb) => {
  const { memberships, items } = job;

  db.transaction(transaction => {
    return Item.destroy({ where: { [Op.or]: memberships }, transaction })
      .then(() =>
        Promise.all(
          items.map(item => Item.create(item, { include: [Plug], transaction }))
        )
      )
      .then(() => {
        console.log(`Saved ${items.length} items and their plugs`);
        return cb();
      })
      .catch(err => {
        console.log('Error saving items');
        console.log(err);
        cb(err);
        throw err;
      });
  });
}, DB_CONCURRENCY);

function collectItems(profiles) {
  return _.flatMap(profiles, profile => {
    const { membershipType, membershipId } = profile.profile.data.userInfo;

    const socketsLookup = profile.itemComponents.sockets.data;

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

    const characterInventoryItems = _.chain(profile.characterInventories.data)
      .flatMap(inventory => inventory.items)
      .map(createItems.bind(null, 'characterInventory'))
      .value();

    const characterEquipmentItems = _(profile.characterEquipment.data)
      .flatMap(inventory => inventory.items)
      .map(createItems.bind(null, 'characterEquipment'))
      .value();

    const profileInventoryItems = _(profile.profileInventory.data.items)
      .map(createItems.bind(null, 'profileInventory'))
      .value();

    return _([])
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
  });
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

function updateInventoryQueueStatus(req, res) {
  res.json({
    length: dbQueue.length(),
    started: dbQueue.started,
    running: dbQueue.running(),
    idle: dbQueue.idle()
  });
}

module.exports = { updateInventory, updateInventoryQueueStatus };
