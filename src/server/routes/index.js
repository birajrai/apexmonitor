import { Router } from 'express';
import authRoutes from './auth.js';
import adminRoutes from './admin.js';
import publicRoutes from './public.js';

const r = Router();
r.use('/auth', authRoutes);
r.use('/admin', adminRoutes);
r.use('/public', publicRoutes);
export default r;
