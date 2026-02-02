import { Service, Check, IService } from '../models';
import { registry } from './registry';
import { incidentEngine } from './incident-engine';
import { config } from '../config';

/**
 * Scheduler
 * Runs health checks at regular intervals for all active services
 */
class Scheduler {
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private checkInProgress: boolean = false;

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.warn('[Scheduler] Already running');
      return;
    }

    console.log(`[Scheduler] Starting with interval: ${config.schedulerIntervalMs}ms`);

    this.isRunning = true;

    // Run immediately on start
    this.runChecks();

    // Then run at regular intervals
    this.intervalId = setInterval(() => {
      this.runChecks();
    }, config.schedulerIntervalMs);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('[Scheduler] Stopping');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
  }

  /**
   * Run health checks for all active services
   */
  private async runChecks(): Promise<void> {
    // Prevent overlapping runs
    if (this.checkInProgress) {
      console.log('[Scheduler] Previous check still in progress, skipping');
      return;
    }

    this.checkInProgress = true;

    try {
      // Load all active services
      const services = await Service.find({ isActive: true });

      if (services.length === 0) {
        console.log('[Scheduler] No active services to check');
        return;
      }

      console.log(`[Scheduler] Running checks for ${services.length} services`);

      // Run checks concurrently with Promise.allSettled to ensure all complete
      const checkPromises = services.map((service) => this.checkService(service));
      await Promise.allSettled(checkPromises);

      console.log('[Scheduler] Completed all checks');
    } catch (error) {
      console.error('[Scheduler] Error during check run:', error);
    } finally {
      this.checkInProgress = false;
    }
  }

  /**
   * Run a health check for a single service
   */
  private async checkService(service: IService): Promise<void> {
    try {
      // Get the appropriate monitor plugin
      const monitor = registry.getMonitor(service.monitorType);

      if (!monitor) {
        console.error(`[Scheduler] No monitor found for type: ${service.monitorType}`);
        return;
      }

      // Execute the check
      const result = await monitor.check(service.monitorConfig);

      // Save the check result
      const check = new Check({
        serviceId: service._id,
        status: result.status,
        responseTimeMs: result.responseTimeMs,
        error: result.error,
        checkedAt: new Date(),
      });

      await check.save();

      // Process through incident engine
      await incidentEngine.processCheck(service, result.status, result.error);

      console.log(
        `[Scheduler] ${service.name}: ${result.status} (${result.responseTimeMs}ms)${
          result.error ? ` - ${result.error}` : ''
        }`
      );
    } catch (error) {
      // Log error but don't crash the scheduler
      console.error(`[Scheduler] Error checking service "${service.name}":`, error);

      // Save a DOWN check on error
      try {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        const check = new Check({
          serviceId: service._id,
          status: 'DOWN',
          responseTimeMs: 0,
          error: `Monitor error: ${errorMessage}`,
          checkedAt: new Date(),
        });

        await check.save();
        await incidentEngine.processCheck(service, 'DOWN', errorMessage);
      } catch (saveError) {
        console.error(`[Scheduler] Failed to save error check for "${service.name}":`, saveError);
      }
    }
  }

  /**
   * Force an immediate check for a specific service
   */
  async checkServiceNow(serviceId: string): Promise<void> {
    const service = await Service.findById(serviceId);

    if (!service) {
      throw new Error('Service not found');
    }

    if (!service.isActive) {
      throw new Error('Service is not active');
    }

    await this.checkService(service);
  }

  /**
   * Get scheduler status
   */
  getStatus(): { isRunning: boolean; checkInProgress: boolean } {
    return {
      isRunning: this.isRunning,
      checkInProgress: this.checkInProgress,
    };
  }
}

// Export singleton instance
export const scheduler = new Scheduler();
