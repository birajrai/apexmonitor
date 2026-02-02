// Type declaration for ping module
declare module 'ping' {
  export interface PingConfig {
    timeout?: number;
    deadline?: number;
    numeric?: boolean;
    min_reply?: number;
    extra?: string[];
  }

  export interface PingResponse {
    inputHost: string;
    host: string;
    alive: boolean;
    output: string;
    time: number | 'unknown';
    times: number[];
    min: string;
    max: string;
    avg: string;
    stddev: string;
    packetLoss: string;
  }

  export const promise: {
    probe(host: string, config?: PingConfig): Promise<PingResponse>;
  };
}
