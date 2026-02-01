import net from 'net';

export default {
    type: 'tcp',
    check({ host, port, timeout = 5000 }) {
        return new Promise(resolve => {
            const start = Date.now();
            const socket = net.createConnection(port, host);
            socket.setTimeout(timeout);

            socket.on('connect', () => {
                socket.destroy();
                resolve({ status: 'up', responseTime: Date.now() - start });
            });

            socket.on('error', e => resolve({ status: 'down', responseTime: 0, error: e.message }));

            socket.on('timeout', () => resolve({ status: 'down', responseTime: 0, error: 'timeout' }));
        });
    },
};
