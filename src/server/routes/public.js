import { Router } from 'express';
import Monitor from '../models/Monitor.js';
import Heartbeat from '../models/Heartbeat.js';
import Category from '../models/Category.js';

const r = Router();

r.get('/status', async (_req, res) => {
    try {
        const categories = await Category.find({ isPublic: true });
        const monitors = await Monitor.find({ isActive: true }).select(
            'name type target interval categoryId lastStatus',
        );
        res.json({ categories, monitors });
    } catch (error) {
        console.error('[public/status] Error fetching monitors:', error?.message || error);
        res.status(500).json({ error: 'Failed to fetch monitors' });
    }
});

export default r;
