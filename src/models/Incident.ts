import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database';
import { Service } from './Service';

/**
 * Incident attributes interface
 */
export interface IncidentAttributes {
  id: number;
  serviceId: number;
  startedAt: Date;
  resolvedAt?: Date;
}

/**
 * Incident creation attributes (id and timestamps are auto-generated)
 */
export interface IncidentCreationAttributes extends Optional<IncidentAttributes, 'id' | 'startedAt' | 'resolvedAt'> {}

/**
 * Incident model
 * Represents a service outage incident
 */
export class Incident extends Model<IncidentAttributes, IncidentCreationAttributes> implements IncidentAttributes {
  public id!: number;
  public serviceId!: number;
  public startedAt!: Date;
  public resolvedAt?: Date;

  // Association
  public service?: Service;
}

Incident.init(
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
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'incidents',
    timestamps: false,
    indexes: [
      {
        fields: ['serviceId'],
      },
      {
        fields: ['serviceId', 'resolvedAt'],
      },
      {
        fields: ['startedAt'],
      },
    ],
  }
);

// Define association
Incident.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });
Service.hasMany(Incident, { foreignKey: 'serviceId', as: 'incidents' });
