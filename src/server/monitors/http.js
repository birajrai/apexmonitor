import fetch from 'node-fetch';

export default {
    type: 'http',
    async check({ url, timeout = 5000 }) {
        const start = Date.now();
        try {
            const res = await fetch(url, { timeout });
            return {
                status: res.ok ? 'up' : 'down',
                responseTime: Date.now() - start,
                error: res.ok ? null : `HTTP ${res.status}`,
            };
        } catch (e) {
            return { status: 'down', responseTime: 0, error: e.message };
        }
    },
};
