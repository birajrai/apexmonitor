import mongoose, { Schema, Document, Types } from 'mongoose';
import { config } from '../config';

/**
 * Check status type
 */
export type CheckStatus = 'UP' | 'DOWN';

/**
 * Check interface
 * Represents a single health check result
 */
export interface ICheck extends Document {
  serviceId: Types.ObjectId;
  status: CheckStatus;
  responseTimeMs: number;
  error?: string;
  checkedAt: Date;
}

const CheckSchema = new Schema<ICheck>({
  serviceId: {
    type: Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
    index: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['UP', 'DOWN'],
  },
  responseTimeMs: {
    type: Number,
    required: true,
    min: 0,
  },
  error: {
    type: String,
  },
  checkedAt: {
    type: Date,
    default: Date.now,
    // Note: index is defined below with TTL option
  },
});

// Compound index for efficient querying of recent checks per service
CheckSchema.index({ serviceId: 1, checkedAt: -1 }, { name: 'service_checkedAt_compound' });

// TTL index for automatic data cleanup (configured in days from config)
CheckSchema.index(
  { checkedAt: 1 },
  { name: 'checkedAt_ttl', expireAfterSeconds: config.checkRetentionDays * 24 * 60 * 60 }
);

export const Check = mongoose.model<ICheck>('Check', CheckSchema);
