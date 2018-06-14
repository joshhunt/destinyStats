const Sequelize = require('sequelize');

const { DB_DATABASE, DB_USERNAME, DB_PASSWORD, DB_HOST, DB_PORT } = process.env;

console.log({ DB_DATABASE, DB_USERNAME, DB_PASSWORD, DB_HOST, DB_PORT });

const sequelize = new Sequelize(DB_DATABASE, DB_USERNAME, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

const Item = sequelize.define('item', {
  membershipId: Sequelize.STRING,
  membershipType: Sequelize.INTEGER,
  itemHash: Sequelize.BIGINT,
  itemInstanceId: Sequelize.STRING,
  quantity: Sequelize.INTEGER,
  location: Sequelize.STRING
});

const Plug = sequelize.define('plug', {
  plugHash: Sequelize.BIGINT,
  socketIndex: Sequelize.INTEGER
});

Item.hasMany(Plug, { onDelete: 'cascade' });

const ready = sequelize.sync();

module.exports = {
  Item,
  Plug,
  ready,
  db: sequelize
};

// sequelize
//   .sync()
//   .then(() =>
//     User.create({
//       username: 'janedoe',
//       birthday: new Date(1980, 6, 20)
//     })
//   )
//   .then(jane => {
//     console.log(jane.toJSON());
//   });
