import fetch from 'node-fetch';

export default {
    type: 'http',
    async check({ url, timeout = 5000 }) {
        const start = Date.now();
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            return {
                status: res.ok ? 'up' : 'down',
                responseTime: Date.now() - start,
                error: res.ok ? null : `HTTP ${res.status}`,
            };
        } catch (e) {
            return { status: 'down', responseTime: Date.now() - start, error: e.message };
        }
    },
};
