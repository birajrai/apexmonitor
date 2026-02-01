import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import Monitor from '../models/Monitor.js';
import Category from '../models/Category.js';

const r = Router();
r.use(auth);

r.get('/monitors', async (_, res) => res.json(await Monitor.find()));
r.post('/monitors', async (req, res) => res.json(await Monitor.create(req.body)));

r.get('/categories', async (_, res) => res.json(await Category.find()));
r.post('/categories', async (req, res) => res.json(await Category.create(req.body)));

export default r;
