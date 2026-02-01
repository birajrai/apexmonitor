import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import Monitor from '../models/Monitor.js';
import Category from '../models/Category.js';

const r = Router();
r.use(auth);

r.get('/monitors', async (_, res, next) => {
    try {
        res.json(await Monitor.find());
    } catch (error) {
        next(error);
    }
});

r.post('/monitors', async (req, res, next) => {
    try {
        res.json(await Monitor.create(req.body));
    } catch (error) {
        next(error);
    }
});

r.get('/categories', async (_, res, next) => {
    try {
        res.json(await Category.find());
    } catch (error) {
        next(error);
    }
});

r.post('/categories', async (req, res, next) => {
    try {
        res.json(await Category.create(req.body));
    } catch (error) {
        next(error);
    }
});

export default r;
