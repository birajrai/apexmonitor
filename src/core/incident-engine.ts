import { Types } from 'mongoose';
import { IService, Incident, IIncident, Check } from '../models';
import { registry } from './registry';
import { IncidentEvent } from '../notifiers';
import { config } from '../config';

/**
 * In-memory state tracking for consecutive failures per service
 */
interface ServiceState {
  consecutiveFailures: number;
  lastNotificationAt?: Date;
}

/**
 * Incident Engine
 * Manages incident lifecycle: detection, tracking, and resolution
 */
class IncidentEngine {
  // Track consecutive failures per service (in-memory)
  private serviceStates: Map<string, ServiceState> = new Map();

  /**
   * Get or create state for a service
   */
  private getState(serviceId: string): ServiceState {
    if (!this.serviceStates.has(serviceId)) {
      this.serviceStates.set(serviceId, { consecutiveFailures: 0 });
    }
    return this.serviceStates.get(serviceId)!;
  }

  /**
   * Process a check result and determine if incident state should change
   * @param service The service being checked
   * @param status The check result status ('UP' or 'DOWN')
   * @param error Optional error message if the check failed
   */
  async processCheck(
    service: IService,
    status: 'UP' | 'DOWN',
    error?: string
  ): Promise<void> {
    const serviceId = service._id.toString();
    const state = this.getState(serviceId);

    if (status === 'DOWN') {
      await this.handleFailure(service, state, error);
    } else {
      await this.handleSuccess(service, state);
    }
  }

  /**
   * Handle a failed check
   */
  private async handleFailure(
    service: IService,
    state: ServiceState,
    error?: string
  ): Promise<void> {
    state.consecutiveFailures++;
    const serviceId = service._id.toString();

    console.log(
      `[Incident Engine] Service "${service.name}" failure ${state.consecutiveFailures}/${config.consecutiveFailuresThreshold}`
    );

    // Check if we've reached the threshold for creating an incident
    if (state.consecutiveFailures === config.consecutiveFailuresThreshold) {
      // Check if there's already an active incident
      const existingIncident = await this.getActiveIncident(serviceId);

      if (!existingIncident) {
        // Create new incident
        const incident = await this.createIncident(service, error);
        console.log(
          `[Incident Engine] Created incident for "${service.name}": ${incident._id}`
        );
      }
    }
  }

  /**
   * Handle a successful check
   */
  private async handleSuccess(service: IService, state: ServiceState): Promise<void> {
    const serviceId = service._id.toString();

    // Reset consecutive failures on any success
    if (state.consecutiveFailures > 0) {
      console.log(`[Incident Engine] Service "${service.name}" recovered after ${state.consecutiveFailures} failures`);
      state.consecutiveFailures = 0;
    }

    // Check if there's an active incident to resolve
    const activeIncident = await this.getActiveIncident(serviceId);

    if (activeIncident) {
      await this.resolveIncident(service, activeIncident);
      console.log(`[Incident Engine] Resolved incident for "${service.name}": ${activeIncident._id}`);
    }
  }

  /**
   * Get active (unresolved) incident for a service
   */
  private async getActiveIncident(serviceId: string): Promise<IIncident | null> {
    return Incident.findOne({
      serviceId: new Types.ObjectId(serviceId),
      resolvedAt: { $exists: false },
    });
  }

  /**
   * Create a new incident and send notification
   */
  private async createIncident(service: IService, error?: string): Promise<IIncident> {
    const incident = new Incident({
      serviceId: service._id,
      startedAt: new Date(),
    });

    await incident.save();

    // Send notification
    await this.sendNotification({
      type: 'incident_started',
      service,
      incidentId: incident._id.toString(),
      startedAt: incident.startedAt,
      error,
    });

    // Update last notification time
    const state = this.getState(service._id.toString());
    state.lastNotificationAt = new Date();

    return incident;
  }

  /**
   * Resolve an incident and send notification
   */
  private async resolveIncident(service: IService, incident: IIncident): Promise<void> {
    const state = this.getState(service._id.toString());
    const now = new Date();

    // Check cooldown window - only send notification if enough time has passed
    const shouldNotify = this.shouldSendNotification(state, incident.startedAt);

    // Update incident
    incident.resolvedAt = now;
    await incident.save();

    // Send notification if not in cooldown
    if (shouldNotify) {
      await this.sendNotification({
        type: 'incident_resolved',
        service,
        incidentId: incident._id.toString(),
        startedAt: incident.startedAt,
        resolvedAt: now,
      });

      state.lastNotificationAt = now;
    }
  }

  /**
   * Check if we should send a notification based on cooldown
   */
  private shouldSendNotification(state: ServiceState, incidentStartedAt: Date): boolean {
    // Always notify if this is the first notification or incident just started
    if (!state.lastNotificationAt) {
      return true;
    }

    const cooldownMs = config.incidentCooldownMinutes * 60 * 1000;
    const timeSinceLastNotification = Date.now() - state.lastNotificationAt.getTime();

    return timeSinceLastNotification >= cooldownMs;
  }

  /**
   * Send notification to all configured notifiers
   */
  private async sendNotification(event: IncidentEvent): Promise<void> {
    const notifiers = registry.getAllNotifiers();

    for (const notifier of notifiers) {
      try {
        await notifier.notify(event);
      } catch (error) {
        console.error(`[Incident Engine] Failed to send ${notifier.type} notification:`, error);
        // Continue with other notifiers even if one fails
      }
    }
  }

  /**
   * Get current status for a service based on recent checks
   * Returns 'UP', 'DOWN', or 'UNKNOWN'
   */
  async getServiceStatus(serviceId: string): Promise<'UP' | 'DOWN' | 'UNKNOWN'> {
    const recentCheck = await Check.findOne({ serviceId: new Types.ObjectId(serviceId) })
      .sort({ checkedAt: -1 })
      .limit(1);

    if (!recentCheck) {
      return 'UNKNOWN';
    }

    // Check if there's an active incident
    const activeIncident = await this.getActiveIncident(serviceId);
    if (activeIncident) {
      return 'DOWN';
    }

    return recentCheck.status;
  }

  /**
   * Clear state for a service (useful when service is deleted)
   */
  clearServiceState(serviceId: string): void {
    this.serviceStates.delete(serviceId);
  }
}

// Export singleton instance
export const incidentEngine = new IncidentEngine();
