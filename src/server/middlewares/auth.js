import jwt from 'jsonwebtoken';

export function auth(req, _res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            const error = new Error('Authorization header is required.');
            error.status = 401;
            throw error;
        }

        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        const error = err instanceof Error ? err : new Error('Unauthorized.');
        error.status = error.status || 401;
        next(error);
    }
}
