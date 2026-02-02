import { Service } from '../models';

/**
 * Incident event type
 */
export type IncidentEventType = 'incident_started' | 'incident_resolved';

/**
 * Incident event payload for notifiers
 */
export interface IncidentEvent {
  type: IncidentEventType;
  service: Service;
  incidentId: string;
  startedAt: Date;
  resolvedAt?: Date;
  error?: string;
}

/**
 * Notifier Plugin Interface
 * All notification channels must implement this interface
 */
export interface NotifierPlugin {
  type: 'discord';
  notify(event: IncidentEvent): Promise<void>;
}
