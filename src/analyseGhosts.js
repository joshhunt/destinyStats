const _ = require('lodash');
const GHOST_DATA = require('../ghosts.json');
const { getItemDefinitions, filterItemGhosts } = require('./lib/definitions');

const LOWLINES = true;

const GHOST_PERKS = 1449602859;
const WEAPON_PERKS = 610365472;

const REGEXES = [
  {
    re: /^Hellas Basin\s/,
    name: 'Hellas Basic'
  },
  {
    re: /^Io\s/,
    name: 'Io'
  },
  {
    re: /^Titan\s/,
    name: 'Titan'
  },
  {
    re: /^Nessus\s/,
    name: 'Nessus'
  },
  {
    re: /^EDZ\s/,
    name: 'EDZ'
  },
  {
    re: /^Mercury\s/,
    name: 'Mercury'
  },
  {
    re: /^Vanguard\s/,
    name: 'Strike'
  },
  {
    re: /^Strike\s/,
    name: 'Strike'
  },
  {
    re: /^Crucible\s/,
    name: 'Crucible'
  }
];

const findGhostType = (_sockets, itemDefs) => {
  const sockets = [].concat(..._sockets).filter(x => x);

  const found = REGEXES.find(({ re, name }) => {
    return sockets.find(plugHash => {
      const plugItem = itemDefs[plugHash];
      return plugItem.displayProperties.name.match(re);
    });
  });

  return (found || { name: '' }).name;
};

const countPlugs = ghosts =>
  _(ghosts)
    .flatMap('plugs')
    .groupBy('socketIndex')
    .mapValues(values =>
      _(values)
        .map(v => v.plugHash)
        .groupBy(p => p)
        .mapValues((v, plugHash) => ({ plugHash, count: v.length }))
        .value()
    )
    .value();

const lowlinesPlugs = (ghosts, itemDefs) =>
  _(ghosts)
    .flatMap('plugs')
    .groupBy('socketIndex')
    .mapValues(values =>
      _(values)
        .map(v => v.plugHash)
        .filter(plugHash => {
          const plugItem = itemDefs[plugHash];

          if (!plugItem) {
            return false;
          }

          return (
            plugItem.itemCategoryHashes.includes(GHOST_PERKS) ||
            plugItem.itemCategoryHashes.includes(WEAPON_PERKS)
          );
        })
        .groupBy(p => p)
        .map((v, plugHash) => parseInt(plugHash))
        .value()
    )
    .reduce((acc, plugs, socketIndex) => {
      acc[parseInt(socketIndex)] = plugs;
      return acc;
    }, [])
    .filter(list => list.length > 0);

getItemDefinitions()
  .then(itemDefs => {
    const ghosts = _(GHOST_DATA)
      .map(g => ({
        itemHash: g.itemHash,
        plugs: g.plugs.map(p => ({
          plugHash: p.plugHash,
          socketIndex: p.socketIndex
        }))
      }))
      .groupBy('itemHash')
      .mapValues((ghosts, itemHash) => {
        const sockets = LOWLINES
          ? lowlinesPlugs(ghosts, itemDefs)
          : countPlugs(ghosts, itemDefs);

        return {
          hash: parseInt(itemHash),
          type: findGhostType(sockets, itemDefs),
          sockets
        };
      })
      .value();

    const allGhostHashes = _(itemDefs)
      .values()
      .filter(filterItemGhosts)
      .map(item => item.hash)
      .value();

    console.log('Found', allGhostHashes.length, 'ghosts in definitions');
    console.log('\nMissing ghost data for ghosts:');

    allGhostHashes.forEach(ghostHash => {
      if (!ghosts[ghostHash]) {
        const ghost = itemDefs[ghostHash];
        console.log(` - [${ghost.hash}] ${ghost.displayProperties.name}`);
      }
    });

    require('fs').writeFileSync(
      LOWLINES ? './ghostInsightsLowlines.json' : './ghostInsights.json',
      JSON.stringify(ghosts, null, 2)
    );

    console.log('\nWrote ghosts insights to file');
  })
  .catch(err => console.error(err));
