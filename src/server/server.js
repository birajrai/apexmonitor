import dotenv from 'dotenv';
dotenv.config();
import app from './app.js';
import { connectDB } from './config/db.js';
import { startScheduler } from './scheduler/index.js';

await connectDB();
startScheduler();

app.listen(10000, () => {});
