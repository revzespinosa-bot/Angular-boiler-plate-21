const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        token: { type: DataTypes.STRING },
        expires: { type: DataTypes.DATE },
        created: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        createdByIp: { type: DataTypes.STRING },
        revoked: { type: DataTypes.DATE },
        revokedByIp: { type: DataTypes.STRING },
        replacedByToken: { type: DataTypes.STRING },
    };

    const options = {
        timestamps: false,
    };

    const RefreshToken = sequelize.define('refreshToken', attributes, options);

    // virtual helpers
    RefreshToken.prototype.isExpired = function () {
        return Date.now() >= this.expires;
    };
    RefreshToken.prototype.isActive = function () {
        return !this.revoked && !this.isExpired();
    };

    return RefreshToken;
}
