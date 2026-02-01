import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middlewares/error.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', apiRoutes);

const dist = path.resolve('dist');
const indexPath = path.join(dist, 'index.html');
const hasWebBuild = fs.existsSync(indexPath);

if (hasWebBuild) {
    app.use(express.static(dist));
    app.get('*', (_, res) => res.sendFile(indexPath));
} else {
    app.get('*', (req, _res, next) => {
        if (req.path.startsWith('/api')) {
            return next();
        }

        const error = new Error(
            'Web app build not found. Run the web build to generate dist/index.html before serving the UI.',
        );
        error.status = 404;
        error.code = 'DIST_NOT_FOUND';
        error.details = { path: indexPath, hint: 'Run the web build command.' };
        next(error);
    });
}

app.use(errorHandler);
export default app;
