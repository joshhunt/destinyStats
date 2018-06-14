require('isomorphic-fetch');

const GHOST_ITEM_CATEGORY_HASH = 39;

const get = url => fetch(url).then(r => r.json());

function getItemDefinitions() {
  return get(
    'https://destiny.plumbing/en/raw/DestinyInventoryItemDefinition.json'
  );
}

const makeItemCategoryFilter = categoryHash => item =>
  (item.itemCategoryHashes || []).includes(categoryHash);

const filterItemGhosts = makeItemCategoryFilter(GHOST_ITEM_CATEGORY_HASH);

module.exports = { getItemDefinitions, filterItemGhosts };
