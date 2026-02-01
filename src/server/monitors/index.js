import http from './http.js';
import tcp from './tcp.js';

export const monitors = [http, tcp];
export const getMonitor = type => monitors.find(m => m.type === type);
