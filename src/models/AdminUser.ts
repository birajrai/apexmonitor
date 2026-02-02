import mongoose, { Schema, Document } from 'mongoose';

/**
 * AdminUser interface
 * Represents the single admin user for the system
 */
export interface IAdminUser extends Document {
  username: string;
  passwordHash: string;
  createdAt: Date;
}

const AdminUserSchema = new Schema<IAdminUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const AdminUser = mongoose.model<IAdminUser>('AdminUser', AdminUserSchema);
