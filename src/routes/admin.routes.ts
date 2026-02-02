import { Router, Request, Response, NextFunction } from 'express';
import { Service, Check, Incident, MonitorType, MonitorConfig } from '../models';
import { scheduler, incidentEngine } from '../core';

const router = Router();

/**
 * Authentication middleware for admin routes
 */
function requireAuth(req: Request, res: Response, next: NextFunction): void {
    if (!req.session.adminId) {
        res.redirect('/auth/login');
        return;
    }
    next();
}

// Apply auth middleware to all routes
router.use(requireAuth);

/**
 * GET /admin
 * Admin dashboard - list all services
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const services = await Service.find().sort({ group: 1, name: 1 });

        // Get latest check for each service
        const servicesWithStatus = await Promise.all(
            services.map(async service => {
                const latestCheck = await Check.findOne({ serviceId: service._id }).sort({ checkedAt: -1 }).limit(1);

                const activeIncident = await Incident.findOne({
                    serviceId: service._id,
                    resolvedAt: { $exists: false },
                });

                return {
                    ...service.toObject(),
                    latestCheck,
                    hasActiveIncident: !!activeIncident,
                };
            }),
        );

        const schedulerStatus = scheduler.getStatus();

        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            services: servicesWithStatus,
            schedulerStatus,
            username: req.session.adminUsername,
        });
    } catch (error) {
        console.error('[Admin] Dashboard error:', error);
        res.status(500).render('admin/error', {
            title: 'Error',
            error: 'Failed to load dashboard',
            username: req.session.adminUsername,
        });
    }
});

/**
 * GET /admin/services/new
 * Show form to create a new service
 */
router.get('/services/new', (req: Request, res: Response) => {
    res.render('admin/service-form', {
        title: 'Add Service',
        service: null,
        monitorTypes: ['http', 'ping', 'dns'],
        error: null,
        username: req.session.adminUsername,
    });
});

/**
 * POST /admin/services
 * Create a new service
 */
router.post('/services', async (req: Request, res: Response) => {
    try {
        const {
            name,
            group,
            monitorType,
            isActive,
            showOnStatusPage,
            statusPageLabel,
            statusPageOrder,
            // HTTP specific
            httpUrl,
            httpMethod,
            httpExpectedStatus,
            httpTimeout,
            // Ping specific
            pingHost,
            pingTimeout,
            // DNS specific
            dnsHostname,
            dnsRecordType,
            dnsExpectedValue,
        } = req.body;

        // Build monitor config based on type
        let monitorConfig: object;

        switch (monitorType as MonitorType) {
            case 'http':
                monitorConfig = {
                    url: httpUrl,
                    method: httpMethod || 'GET',
                    expectedStatusCode: parseInt(httpExpectedStatus, 10) || 200,
                    timeoutMs: parseInt(httpTimeout, 10) || 30000,
                };
                break;
            case 'ping':
                monitorConfig = {
                    host: pingHost,
                    timeoutMs: parseInt(pingTimeout, 10) || 5000,
                };
                break;
            case 'dns':
                monitorConfig = {
                    hostname: dnsHostname,
                    recordType: dnsRecordType || 'A',
                    expectedValue: dnsExpectedValue || undefined,
                };
                break;
            default:
                throw new Error(`Invalid monitor type: ${monitorType}`);
        }

        const service = new Service({
            name,
            group: group || 'Default',
            monitorType,
            monitorConfig,
            isActive: isActive === 'on',
            showOnStatusPage: showOnStatusPage === 'on',
            statusPageLabel: statusPageLabel || undefined,
            statusPageOrder: parseInt(statusPageOrder, 10) || 0,
        });

        await service.save();

        console.log(`[Admin] Created service: ${service.name}`);

        res.redirect('/admin');
    } catch (error) {
        console.error('[Admin] Create service error:', error);
        res.render('admin/service-form', {
            title: 'Add Service',
            service: req.body,
            monitorTypes: ['http', 'ping', 'dns'],
            error: error instanceof Error ? error.message : 'Failed to create service',
            username: req.session.adminUsername,
        });
    }
});

/**
 * GET /admin/services/:id/edit
 * Show form to edit a service
 */
router.get('/services/:id/edit', async (req: Request, res: Response) => {
    try {
        const service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).render('admin/error', {
                title: 'Not Found',
                error: 'Service not found',
                username: req.session.adminUsername,
            });
        }

        res.render('admin/service-form', {
            title: 'Edit Service',
            service,
            monitorTypes: ['http', 'ping', 'dns'],
            error: null,
            username: req.session.adminUsername,
        });
    } catch (error) {
        console.error('[Admin] Edit service form error:', error);
        res.status(500).render('admin/error', {
            title: 'Error',
            error: 'Failed to load service',
            username: req.session.adminUsername,
        });
    }
});

/**
 * POST /admin/services/:id
 * Update a service
 */
router.post('/services/:id', async (req: Request, res: Response) => {
    try {
        const service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).render('admin/error', {
                title: 'Not Found',
                error: 'Service not found',
                username: req.session.adminUsername,
            });
        }

        const {
            name,
            group,
            monitorType,
            isActive,
            showOnStatusPage,
            statusPageLabel,
            statusPageOrder,
            httpUrl,
            httpMethod,
            httpExpectedStatus,
            httpTimeout,
            pingHost,
            pingTimeout,
            dnsHostname,
            dnsRecordType,
            dnsExpectedValue,
        } = req.body;

        // Build monitor config based on type
        let monitorConfig: MonitorConfig;

        switch (monitorType as MonitorType) {
            case 'http':
                monitorConfig = {
                    url: httpUrl,
                    method: httpMethod || 'GET',
                    expectedStatusCode: parseInt(httpExpectedStatus, 10) || 200,
                    timeoutMs: parseInt(httpTimeout, 10) || 30000,
                };
                break;
            case 'ping':
                monitorConfig = {
                    host: pingHost,
                    timeoutMs: parseInt(pingTimeout, 10) || 5000,
                };
                break;
            case 'dns':
                monitorConfig = {
                    hostname: dnsHostname,
                    recordType: dnsRecordType || 'A',
                    expectedValue: dnsExpectedValue || undefined,
                };
                break;
            default:
                throw new Error(`Invalid monitor type: ${monitorType}`);
        }

        // Update service
        service.name = name;
        service.group = group || 'Default';
        service.monitorType = monitorType;
        service.monitorConfig = monitorConfig;
        service.isActive = isActive === 'on';
        service.showOnStatusPage = showOnStatusPage === 'on';
        service.statusPageLabel = statusPageLabel || undefined;
        service.statusPageOrder = parseInt(statusPageOrder, 10) || 0;

        await service.save();

        console.log(`[Admin] Updated service: ${service.name}`);

        res.redirect('/admin');
    } catch (error) {
        console.error('[Admin] Update service error:', error);
        res.render('admin/service-form', {
            title: 'Edit Service',
            service: { ...req.body, _id: req.params.id },
            monitorTypes: ['http', 'ping', 'dns'],
            error: error instanceof Error ? error.message : 'Failed to update service',
            username: req.session.adminUsername,
        });
    }
});

/**
 * POST /admin/services/:id/delete
 * Delete a service
 */
router.post('/services/:id/delete', async (req: Request, res: Response) => {
    try {
        const service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).render('admin/error', {
                title: 'Not Found',
                error: 'Service not found',
                username: req.session.adminUsername,
            });
        }

        // Delete related checks and incidents
        await Check.deleteMany({ serviceId: service._id });
        await Incident.deleteMany({ serviceId: service._id });

        // Clear incident engine state
        incidentEngine.clearServiceState(service._id.toString());

        // Delete the service
        await service.deleteOne();

        console.log(`[Admin] Deleted service: ${service.name}`);

        res.redirect('/admin');
    } catch (error) {
        console.error('[Admin] Delete service error:', error);
        res.status(500).render('admin/error', {
            title: 'Error',
            error: 'Failed to delete service',
            username: req.session.adminUsername,
        });
    }
});

/**
 * POST /admin/services/:id/check
 * Manually trigger a check for a service
 */
router.post('/services/:id/check', async (req: Request, res: Response) => {
    try {
        await scheduler.checkServiceNow(req.params.id);
        res.redirect('/admin');
    } catch (error) {
        console.error('[Admin] Manual check error:', error);
        res.status(500).render('admin/error', {
            title: 'Error',
            error: error instanceof Error ? error.message : 'Failed to run check',
            username: req.session.adminUsername,
        });
    }
});

/**
 * GET /admin/services/:id/history
 * View check history for a service
 */
router.get('/services/:id/history', async (req: Request, res: Response) => {
    try {
        const service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).render('admin/error', {
                title: 'Not Found',
                error: 'Service not found',
                username: req.session.adminUsername,
            });
        }

        // Get recent checks (last 100)
        const checks = await Check.find({ serviceId: service._id }).sort({ checkedAt: -1 }).limit(100);

        // Get recent incidents
        const incidents = await Incident.find({ serviceId: service._id }).sort({ startedAt: -1 }).limit(20);

        res.render('admin/service-history', {
            title: `${service.name} - History`,
            service,
            checks,
            incidents,
            username: req.session.adminUsername,
        });
    } catch (error) {
        console.error('[Admin] Service history error:', error);
        res.status(500).render('admin/error', {
            title: 'Error',
            error: 'Failed to load service history',
            username: req.session.adminUsername,
        });
    }
});

/**
 * GET /admin/incidents
 * View all incidents
 */
router.get('/incidents', async (req: Request, res: Response) => {
    try {
        const incidents = await Incident.find().populate('serviceId').sort({ startedAt: -1 }).limit(100);

        res.render('admin/incidents', {
            title: 'Incidents',
            incidents,
            username: req.session.adminUsername,
        });
    } catch (error) {
        console.error('[Admin] Incidents error:', error);
        res.status(500).render('admin/error', {
            title: 'Error',
            error: 'Failed to load incidents',
            username: req.session.adminUsername,
        });
    }
});

export default router;
