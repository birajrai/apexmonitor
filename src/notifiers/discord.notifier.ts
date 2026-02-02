import { NotifierPlugin, IncidentEvent } from './types';
import { Settings, SETTING_KEYS } from '../models';
import { config } from '../config';

/**
 * Discord Notifier Plugin
 * Sends notifications to a Discord webhook
 */
export const discordNotifier: NotifierPlugin = {
  type: 'discord',

  async notify(event: IncidentEvent): Promise<void> {
    // Check if Discord notifications are enabled (from database)
    const [enabled, webhookUrl] = await Promise.all([
      Settings.getValue(SETTING_KEYS.DISCORD_ENABLED, 'false'),
      Settings.getValue(SETTING_KEYS.DISCORD_WEBHOOK_URL, ''),
    ]);

    // Fall back to config if database setting is empty
    const finalWebhookUrl = webhookUrl || config.discordWebhookUrl;

    if (enabled !== 'true' && !config.discordWebhookUrl) {
      console.log('[Discord Notifier] Notifications disabled, skipping');
      return;
    }

    if (!finalWebhookUrl) {
      console.warn('[Discord Notifier] No webhook URL configured, skipping notification');
      return;
    }

    // Build the Discord embed based on event type
    const embed = buildEmbed(event);

    try {
      const response = await fetch(finalWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [embed],
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Discord API returned ${response.status}: ${text}`);
      }

      console.log(`[Discord Notifier] Notification sent for ${event.type}: ${event.service.name}`);
    } catch (error) {
      console.error('[Discord Notifier] Failed to send notification:', error);
      throw error;
    }
  },
};

/**
 * Build a Discord embed object for the given incident event
 */
function buildEmbed(event: IncidentEvent): object {
  const { type, service, incidentId, startedAt, resolvedAt, error } = event;
  const serviceName = service.statusPageLabel || service.name;

  if (type === 'incident_started') {
    return {
      title: '🔴 Service Down',
      description: `**${serviceName}** is experiencing issues.`,
      color: 0xff0000, // Red
      fields: [
        {
          name: 'Service',
          value: serviceName,
          inline: true,
        },
        {
          name: 'Group',
          value: service.group,
          inline: true,
        },
        {
          name: 'Monitor Type',
          value: service.monitorType.toUpperCase(),
          inline: true,
        },
        ...(error
          ? [
              {
                name: 'Error',
                value: error.substring(0, 1000), // Discord field limit
                inline: false,
              },
            ]
          : []),
      ],
      footer: {
        text: `Incident ID: ${incidentId}`,
      },
      timestamp: startedAt.toISOString(),
    };
  } else {
    // incident_resolved
    const duration = resolvedAt
      ? formatDuration(resolvedAt.getTime() - startedAt.getTime())
      : 'Unknown';

    return {
      title: '🟢 Service Recovered',
      description: `**${serviceName}** is back online.`,
      color: 0x00ff00, // Green
      fields: [
        {
          name: 'Service',
          value: serviceName,
          inline: true,
        },
        {
          name: 'Group',
          value: service.group,
          inline: true,
        },
        {
          name: 'Downtime Duration',
          value: duration,
          inline: true,
        },
      ],
      footer: {
        text: `Incident ID: ${incidentId}`,
      },
      timestamp: resolvedAt?.toISOString() || new Date().toISOString(),
    };
  }
}

/**
 * Format a duration in milliseconds to a human-readable string
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
