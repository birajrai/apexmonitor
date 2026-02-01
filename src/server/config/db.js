import mongoose from 'mongoose';

let memoryServer;

function formatMongoError(error) {
    const code = error?.code ? ` (code: ${error.code})` : '';
    const name = error?.name ? ` ${error.name}` : ' Error';
    const message = error?.message ? `: ${error.message}` : '';
    return `${name}${code}${message}`;
}

async function connectWithMemoryServer() {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    const uri = memoryServer.getUri();
    await mongoose.connect(uri);
    console.warn('[db] Using in-memory MongoDB for development. Data will not persist.');
}

export async function connectDB() {
    const mongoUri = process.env.MONGODB_URI;
    const isProd = process.env.NODE_ENV === 'production';

    if (!mongoUri) {
        if (isProd) {
            throw new Error('MONGODB_URI is required in production.');
        }
        await connectWithMemoryServer();
        return;
    }

    try {
        await mongoose.connect(mongoUri);
    } catch (error) {
        const message = error?.message || '';
        const isSrvOrNetworkError =
            message.includes('querySrv') || message.includes('ECONNREFUSED') || message.includes('ENOTFOUND');
        const shouldFallback = !isProd && isSrvOrNetworkError;

        if (shouldFallback) {
            console.warn(
                `[db] MongoDB SRV lookup failed or host unreachable. ${formatMongoError(error)} ` +
                    'Falling back to in-memory MongoDB for development.',
            );
            await connectWithMemoryServer();
            return;
        }

        if (message.includes('bad auth') || message.includes('Authentication failed')) {
            throw new Error(
                `[db] Authentication failed. Check username/password and database user permissions. ${formatMongoError(
                    error,
                )}`,
                { cause: error },
            );
        }

        if (message.includes('MongoParseError') || message.includes('URI') || message.includes('Invalid scheme')) {
            throw new Error(
                `[db] Invalid MONGODB_URI. Ensure it starts with mongodb:// or mongodb+srv:// and is properly encoded. ${formatMongoError(
                    error,
                )}`,
                { cause: error },
            );
        }

        if (isSrvOrNetworkError) {
            throw new Error(
                `[db] MongoDB host unreachable or SRV lookup failed. Verify DNS/network access and allowlist this IP in MongoDB Atlas. ${formatMongoError(
                    error,
                )}`,
                { cause: error },
            );
        }

        throw new Error(`[db] Failed to connect to MongoDB. ${formatMongoError(error)}`, { cause: error });
    }
}
