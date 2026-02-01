import mongoose from 'mongoose';

export default mongoose.model(
    'Heartbeat',
    new mongoose.Schema({
        monitorId: mongoose.Types.ObjectId,
        status: String,
        responseTime: Number,
        error: String,
        timestamp: { type: Date, default: Date.now },
    }),
);
