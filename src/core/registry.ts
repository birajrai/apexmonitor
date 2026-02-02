import { MonitorPlugin, httpMonitor, pingMonitor, dnsMonitor } from '../monitors';
import { NotifierPlugin, discordNotifier } from '../notifiers';
import { MonitorType } from '../models';

/**
 * Registry for monitor and notifier plugins
 * Provides a central lookup for all available plugins
 */
class PluginRegistry {
  private monitors: Map<MonitorType, MonitorPlugin> = new Map();
  private notifiers: Map<string, NotifierPlugin> = new Map();

  constructor() {
    // Register built-in monitors
    this.registerMonitor(httpMonitor);
    this.registerMonitor(pingMonitor);
    this.registerMonitor(dnsMonitor);

    // Register built-in notifiers
    this.registerNotifier(discordNotifier);
  }

  /**
   * Register a monitor plugin
   */
  registerMonitor(monitor: MonitorPlugin): void {
    this.monitors.set(monitor.type, monitor);
    console.log(`[Registry] Registered monitor: ${monitor.type}`);
  }

  /**
   * Register a notifier plugin
   */
  registerNotifier(notifier: NotifierPlugin): void {
    this.notifiers.set(notifier.type, notifier);
    console.log(`[Registry] Registered notifier: ${notifier.type}`);
  }

  /**
   * Get a monitor plugin by type
   */
  getMonitor(type: MonitorType): MonitorPlugin | undefined {
    return this.monitors.get(type);
  }

  /**
   * Get a notifier plugin by type
   */
  getNotifier(type: string): NotifierPlugin | undefined {
    return this.notifiers.get(type);
  }

  /**
   * Get all registered monitors
   */
  getAllMonitors(): MonitorPlugin[] {
    return Array.from(this.monitors.values());
  }

  /**
   * Get all registered notifiers
   */
  getAllNotifiers(): NotifierPlugin[] {
    return Array.from(this.notifiers.values());
  }
}

// Export singleton instance
export const registry = new PluginRegistry();
