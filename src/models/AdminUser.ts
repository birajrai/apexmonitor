import { DataTypes, Model, Optional } from 'sequelize';
import crypto from 'crypto';
import { sequelize } from '../database';

/**
 * AdminUser attributes interface
 */
export interface AdminUserAttributes {
    id: number;
    username: string;
    email: string | null;
    passwordHash: string;
    createdAt: Date;
}

/**
 * AdminUser creation attributes (id is auto-generated)
 */
export interface AdminUserCreationAttributes extends Optional<AdminUserAttributes, 'id' | 'createdAt' | 'email'> {}

/**
 * AdminUser model
 * Represents the admin user for authentication
 */
export class AdminUser extends Model<AdminUserAttributes, AdminUserCreationAttributes> implements AdminUserAttributes {
    public id!: number;
    public username!: string;
    public email!: string | null;
    public passwordHash!: string;
    public createdAt!: Date;

    /**
     * Get Gravatar hash for the user's email
     * Returns null if no email is set
     */
    public getGravatarHash(): string | null {
        if (!this.email) {
            return null;
        }
        return crypto.createHash('md5').update(this.email.trim().toLowerCase()).digest('hex');
    }
}

AdminUser.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        username: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            validate: {
                len: [3, 50],
            },
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: true,
            validate: {
                isEmail: true,
            },
        },
        passwordHash: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: 'admin_users',
        timestamps: false,
        indexes: [
            {
                unique: true,
                fields: ['username'],
            },
        ],
    },
);
