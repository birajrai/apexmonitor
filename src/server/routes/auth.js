import { Router } from 'express';
import jwt from 'jsonwebtoken';

const r = Router();

r.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
        res.json({ token: jwt.sign({ email }, process.env.JWT_SECRET) });
    } else res.sendStatus(401);
});

export default r;
