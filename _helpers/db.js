const { Sequelize } = require('sequelize');

module.exports = db = {};

initialize();

async function initialize() {
    const host = process.env.DB_HOST;
    const port = parseInt(process.env.DB_PORT || '3306', 10);
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;
    const database = process.env.DB_NAME;

    // TiDB Cloud (and most managed MySQL providers) require TLS. Toggle with DB_SSL=true.
    const useSsl = String(process.env.DB_SSL).toLowerCase() === 'true';
    const dialectOptions = useSsl
        ? {
              ssl: {
                  // TiDB serves a public cert chain; explicit minVersion avoids old TLS.
                  minVersion: 'TLSv1.2',
                  rejectUnauthorized: true,
              },
          }
        : {};

    const sequelize = new Sequelize(database, user, password, {
        host,
        port,
        dialect: 'mysql',
        dialectOptions,
        logging: false,
    });

    // init models and add them to the exported db object
    db.Account = require('../accounts/account.model')(sequelize);
    db.RefreshToken = require('../accounts/refresh-token.model')(sequelize);

    // define relationships
    db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
    db.RefreshToken.belongsTo(db.Account);

    // sync all models with database
    await sequelize.sync({ alter: true });
}
