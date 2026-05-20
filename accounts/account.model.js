const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        email: { type: DataTypes.STRING, allowNull: false },
        passwordHash: { type: DataTypes.STRING, allowNull: false },
        title: { type: DataTypes.STRING, allowNull: false },
        firstName: { type: DataTypes.STRING, allowNull: false },
        lastName: { type: DataTypes.STRING, allowNull: false },
        acceptTerms: { type: DataTypes.BOOLEAN },
        role: { type: DataTypes.STRING, allowNull: false },
        verificationToken: { type: DataTypes.STRING },
        verified: { type: DataTypes.DATE },
        resetToken: { type: DataTypes.STRING },
        resetTokenExpires: { type: DataTypes.DATE },
        passwordReset: { type: DataTypes.DATE },
        created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated: { type: DataTypes.DATE },

        // virtual attribute (not stored) — true if either verified or passwordReset is set
        isVerified: {
            type: DataTypes.VIRTUAL,
            get() { return !!(this.verified || this.passwordReset); },
        },
    };

    const options = {
        // disable Sequelize's default timestamp columns (we manage created/updated manually)
        timestamps: false,
        defaultScope: {
            // hide passwordHash by default
            attributes: { exclude: ['passwordHash'] },
        },
        scopes: {
            // include passwordHash with the .scope('withHash') variant
            withHash: { attributes: {} },
        },
    };

    return sequelize.define('account', attributes, options);
}
