import Monitor from '../models/Monitor.js';
import Heartbeat from '../models/Heartbeat.js';
import { getMonitor } from '../monitors/index.js';
import { notify } from '../notifications/index.js';

export function startScheduler() {
    setInterval(async () => {
        const monitors = await Monitor.find({ isActive: true });
        for (const m of monitors) {
            if (Date.now() - (m.lastCheckedAt || 0) < m.interval * 1000) continue;

            const plugin = getMonitor(m.type);
            const result = await plugin.check(m.target);

            await Heartbeat.create({ monitorId: m._id, ...result });

            if (m.lastStatus && m.lastStatus !== result.status) {
                await notify({
                    monitorName: m.name,
                    status: result.status,
                    previousStatus: m.lastStatus,
                    responseTime: result.responseTime,
                    timestamp: new Date(),
                    error: result.error,
                });
            }

            m.lastStatus = result.status;
            m.lastCheckedAt = new Date();
            await m.save();
        }
    }, 1000);
}
