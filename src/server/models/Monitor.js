import mongoose from 'mongoose';

export default mongoose.model(
    'Monitor',
    new mongoose.Schema(
        {
            name: String,
            type: String,
            target: Object,
            interval: Number,
            categoryId: mongoose.Types.ObjectId,
            isActive: Boolean,
            lastStatus: String,
            lastCheckedAt: Date,
        },
        { timestamps: true },
    ),
);
