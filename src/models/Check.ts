import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database';
import { Service } from './Service';

/**
 * Check status type
 */
export type CheckStatus = 'UP' | 'DOWN';

/**
 * Check attributes interface
 */
export interface CheckAttributes {
  id: number;
  serviceId: number;
  status: CheckStatus;
  responseTimeMs: number;
  error?: string;
  checkedAt: Date;
}

/**
 * Check creation attributes (id is auto-generated)
 */
export interface CheckCreationAttributes extends Optional<CheckAttributes, 'id' | 'checkedAt' | 'error'> {}

/**
 * Check model
 * Represents a single health check result
 */
export class Check extends Model<CheckAttributes, CheckCreationAttributes> implements CheckAttributes {
  public id!: number;
  public serviceId!: number;
  public status!: CheckStatus;
  public responseTimeMs!: number;
  public error?: string;
  public checkedAt!: Date;

  // Association
  public service?: Service;
}

Check.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    serviceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'services',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    status: {
      type: DataTypes.ENUM('UP', 'DOWN'),
      allowNull: false,
    },
    responseTimeMs: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    checkedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'checks',
    timestamps: false,
    indexes: [
      {
        fields: ['serviceId'],
      },
      {
        fields: ['serviceId', 'checkedAt'],
      },
      {
        fields: ['checkedAt'],
      },
    ],
  }
);

// Define association
Check.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });
Service.hasMany(Check, { foreignKey: 'serviceId', as: 'checks' });
