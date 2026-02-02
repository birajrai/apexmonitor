import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database';

/**
 * AdminUser attributes interface
 */
export interface AdminUserAttributes {
  id: number;
  username: string;
  passwordHash: string;
  createdAt: Date;
}

/**
 * AdminUser creation attributes (id is auto-generated)
 */
export interface AdminUserCreationAttributes extends Optional<AdminUserAttributes, 'id' | 'createdAt'> {}

/**
 * AdminUser model
 * Represents the admin user for authentication
 */
export class AdminUser extends Model<AdminUserAttributes, AdminUserCreationAttributes> implements AdminUserAttributes {
  public id!: number;
  public username!: string;
  public passwordHash!: string;
  public createdAt!: Date;
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
  }
);
