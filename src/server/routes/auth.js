import { Router } from 'express';
import jwt from 'jsonwebtoken';

const r = Router();

r.post('/login', (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            const error = new Error('Email and password are required.');
            error.status = 400;
            throw error;
        }

        if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || !process.env.JWT_SECRET) {
            const error = new Error('Server authentication not configured.');
            error.status = 500;
            throw error;
        }

        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            res.json({ token: jwt.sign({ email }, process.env.JWT_SECRET) });
        } else {
            const error = new Error('Invalid credentials.');
            error.status = 401;
            throw error;
        }
    } catch (error) {
        next(error);
    }
});

export default r;
