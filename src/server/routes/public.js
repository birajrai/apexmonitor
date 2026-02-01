import { Router } from 'express';
import Monitor from '../models/Monitor.js';
import Heartbeat from '../models/Heartbeat.js';
import Category from '../models/Category.js';

const r = Router();

r.get('/status', async (_req, res) => {
    try {
        const categories = await Category.find({ isPublic: true });
        const monitors = await Monitor.find({ isActive: true }).select('name categoryId lastStatus');
        res.json({ categories, monitors });
    } catch (error) {
        console.warn('[public/status] Falling back to hardcoded status data:', error?.message || error);
        res.json({
            categories: [],
            monitors: [
                {
                    _id: 'hardcoded-google',
                    name: 'Google',
                    type: 'http',
                    url: 'https://www.google.com',
                    interval: 30,
                    lastStatus: 'up',
                },
            ],
            meta: { source: 'fallback' },
        });
    }
});

export default r;
