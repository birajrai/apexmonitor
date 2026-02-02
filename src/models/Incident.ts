import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Incident interface
 * Represents a service outage incident
 */
export interface IIncident extends Document {
  serviceId: Types.ObjectId;
  startedAt: Date;
  resolvedAt?: Date;
}

const IncidentSchema = new Schema<IIncident>({
  serviceId: {
    type: Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
    index: true,
  },
  startedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  resolvedAt: {
    type: Date,
  },
});

// Index for finding active incidents (unresolved)
IncidentSchema.index({ serviceId: 1, resolvedAt: 1 });

// Index for querying incidents by time
IncidentSchema.index({ startedAt: -1 });

export const Incident = mongoose.model<IIncident>('Incident', IncidentSchema);
