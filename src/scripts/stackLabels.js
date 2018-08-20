const _ = require('lodash');
const { getItemDefinitions } = require('../lib/definitions');

getItemDefinitions().then(defs => {
  const grouped = _(defs)
    .values()
    .groupBy(item => (item.inventory ? item.inventory.stackUniqueLabel : null))
    .value();

  const uniqueStackUniqueLabels = Object.keys(grouped).sort();

  let lines = [];

  uniqueStackUniqueLabels.forEach(label => {
    const items = grouped[label];
    lines.push(label);
    items.forEach(item => {
      lines.push(` - ${item.displayProperties.name} [${item.hash}]`);
    });
    lines.push('');
  });

  require('fs').writeFileSync('./stackLabels.txt', lines.join('\n'));
});
