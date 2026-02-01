function isProduction() {
    return process.env.NODE_ENV === 'production';
}

function normalizeError(err) {
    const normalized = {
        status: err?.statusCode || err?.status || 500,
        message: err?.message || 'Internal Server Error',
        code: err?.code,
        name: err?.name,
        details: undefined,
    };

    if (err?.type === 'entity.parse.failed') {
        normalized.status = 400;
        normalized.message = 'Invalid JSON payload.';
    }

    if (err?.name === 'ValidationError' && err?.errors) {
        normalized.status = 400;
        normalized.message = 'Validation failed.';
        normalized.details = Object.values(err.errors).map(item => item.message);
    }

    if (err?.name === 'CastError') {
        normalized.status = 400;
        normalized.message = `Invalid value for ${err.path}.`;
        normalized.details = err?.value === undefined ? undefined : { value: err.value };
    }

    if (err?.code === 11000) {
        normalized.status = 409;
        const fields = err?.keyValue ? Object.keys(err.keyValue) : [];
        const fieldList = fields.length ? fields.join(', ') : 'unique field';
        normalized.message = `Duplicate value for ${fieldList}.`;
        normalized.details = err?.keyValue;
    }

    if (err?.name === 'JsonWebTokenError') {
        normalized.status = 401;
        normalized.message = 'Invalid authentication token.';
    }

    if (err?.name === 'TokenExpiredError') {
        normalized.status = 401;
        normalized.message = 'Authentication token has expired.';
    }

    if (normalized.status < 400 || normalized.status > 599) {
        normalized.status = 500;
    }

    if (isProduction() && normalized.status === 500) {
        normalized.message = 'Internal Server Error';
    }

    return normalized;
}

export function errorHandler(err, req, res, _next) {
    const normalized = normalizeError(err);

    console.error('[error]', {
        method: req?.method,
        path: req?.originalUrl,
        status: normalized.status,
        name: normalized.name,
        code: normalized.code,
        message: err?.message,
    });

    const payload = {
        error: {
            message: normalized.message,
            status: normalized.status,
        },
    };

    if (!isProduction()) {
        payload.error.details = normalized.details;
        payload.error.name = normalized.name;
        payload.error.code = normalized.code;
        payload.error.stack = err?.stack;
    }

    res.status(normalized.status).json(payload);
}
