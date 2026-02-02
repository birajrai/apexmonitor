import { Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import { Service, Check, Incident } from '../models';

const router = Router();

/**
 * GET /
 * Public status page
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Get only services that should be shown on status page
    const services = await Service.findAll({
      where: { showOnStatusPage: true },
      order: [
        ['statusPageOrder', 'ASC'],
        ['group', 'ASC'],
        ['name', 'ASC'],
      ],
    });

    // Get latest check and incident status for each service
    const servicesWithStatus = await Promise.all(
      services.map(async (service) => {
        const latestCheck = await Check.findOne({
          where: { serviceId: service.id },
          order: [['checkedAt', 'DESC']],
        });

        const activeIncident = await Incident.findOne({
          where: {
            serviceId: service.id,
            resolvedAt: { [Op.eq]: null as any },
          },
        });

        // Get last 90 checks for uptime display (last ~90 minutes with 1-min intervals)
        const recentChecks = await Check.findAll({
          where: { serviceId: service.id },
          order: [['checkedAt', 'DESC']],
          limit: 90,
        });

        // Calculate uptime percentage from recent checks
        const totalChecks = recentChecks.length;
        const upChecks = recentChecks.filter((c) => c.status === 'UP').length;
        const uptimePercent = totalChecks > 0 ? ((upChecks / totalChecks) * 100).toFixed(2) : '100.00';

        // Determine overall status
        let status: 'operational' | 'degraded' | 'down' | 'unknown' = 'unknown';
        if (activeIncident) {
          status = 'down';
        } else if (latestCheck) {
          status = latestCheck.status === 'UP' ? 'operational' : 'degraded';
        }

        return {
          id: service.id,
          name: service.statusPageLabel || service.name,
          group: service.group,
          status,
          responseTime: latestCheck?.responseTimeMs || null,
          lastChecked: latestCheck?.checkedAt || null,
          uptimePercent,
          // Reverse to show oldest first for timeline
          recentChecks: recentChecks.reverse().map((c) => ({
            status: c.status,
            responseTimeMs: c.responseTimeMs,
            checkedAt: c.checkedAt,
          })),
        };
      })
    );

    // Group services by group
    const groupedServices: Record<string, typeof servicesWithStatus> = {};
    for (const service of servicesWithStatus) {
      if (!groupedServices[service.group]) {
        groupedServices[service.group] = [];
      }
      groupedServices[service.group].push(service);
    }

    // Calculate overall status
    let overallStatus: 'operational' | 'degraded' | 'outage' = 'operational';
    const hasDown = servicesWithStatus.some((s) => s.status === 'down');
    const hasDegraded = servicesWithStatus.some((s) => s.status === 'degraded');

    if (hasDown) {
      overallStatus = 'outage';
    } else if (hasDegraded) {
      overallStatus = 'degraded';
    }

    // Get recent incidents for display (last 10)
    const serviceIds = services.map((s) => s.id);
    const recentIncidents = await Incident.findAll({
      where: {
        serviceId: { [Op.in]: serviceIds },
      },
      include: [{ model: Service, as: 'service' }],
      order: [['startedAt', 'DESC']],
      limit: 10,
    });

    const formattedIncidents = recentIncidents.map((incident) => {
      const service = incident.service;
      return {
        id: incident.id,
        serviceName: service?.statusPageLabel || service?.name || 'Unknown',
        startedAt: incident.startedAt,
        resolvedAt: incident.resolvedAt,
        isActive: !incident.resolvedAt,
      };
    });

    res.render('status', {
      title: 'System Status',
      overallStatus,
      groupedServices,
      recentIncidents: formattedIncidents,
      lastUpdated: new Date(),
    });
  } catch (error) {
    console.error('[Status] Error loading status page:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load status page',
    });
  }
});

/**
 * GET /api/status
 * JSON API for status data
 */
router.get('/api/status', async (req: Request, res: Response) => {
  try {
    const services = await Service.findAll({
      where: { showOnStatusPage: true },
      order: [
        ['statusPageOrder', 'ASC'],
        ['group', 'ASC'],
        ['name', 'ASC'],
      ],
    });

    const servicesWithStatus = await Promise.all(
      services.map(async (service) => {
        const latestCheck = await Check.findOne({
          where: { serviceId: service.id },
          order: [['checkedAt', 'DESC']],
        });

        const activeIncident = await Incident.findOne({
          where: {
            serviceId: service.id,
            resolvedAt: { [Op.eq]: null as any },
          },
        });

        let status: 'operational' | 'degraded' | 'down' | 'unknown' = 'unknown';
        if (activeIncident) {
          status = 'down';
        } else if (latestCheck) {
          status = latestCheck.status === 'UP' ? 'operational' : 'degraded';
        }

        return {
          id: service.id,
          name: service.statusPageLabel || service.name,
          group: service.group,
          status,
          responseTime: latestCheck?.responseTimeMs || null,
          lastChecked: latestCheck?.checkedAt || null,
        };
      })
    );

    // Calculate overall status
    let overallStatus: 'operational' | 'degraded' | 'outage' = 'operational';
    const hasDown = servicesWithStatus.some((s) => s.status === 'down');
    const hasDegraded = servicesWithStatus.some((s) => s.status === 'degraded');

    if (hasDown) {
      overallStatus = 'outage';
    } else if (hasDegraded) {
      overallStatus = 'degraded';
    }

    res.json({
      status: overallStatus,
      services: servicesWithStatus,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Status API] Error:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

export default router;
