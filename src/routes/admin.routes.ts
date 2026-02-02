import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { Op, WhereOptions } from 'sequelize';
import { Service, Check, Incident, MonitorType, MonitorConfig, IncidentAttributes, Settings, SETTING_KEYS, AdminUser } from '../models';
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
        const services = await Service.findAll({
            order: [['group', 'ASC'], ['name', 'ASC']],
        });

        // Get latest check for each service
        const servicesWithStatus = await Promise.all(
            services.map(async service => {
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

                return {
                    ...service.toJSON(),
                    _id: service.id, // For backward compatibility with templates
                    latestCheck: latestCheck ? latestCheck.toJSON() : null,
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

        const service = await Service.create({
            name,
            group: group || 'Default',
            monitorType,
            monitorConfig: monitorConfig as MonitorConfig,
            isActive: isActive === 'on',
            showOnStatusPage: showOnStatusPage === 'on',
            statusPageLabel: statusPageLabel || undefined,
            statusPageOrder: parseInt(statusPageOrder, 10) || 0,
        });

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
        const service = await Service.findByPk(req.params.id);

        if (!service) {
            return res.status(404).render('admin/error', {
                title: 'Not Found',
                error: 'Service not found',
                username: req.session.adminUsername,
            });
        }

        res.render('admin/service-form', {
            title: 'Edit Service',
            service: { ...service.toJSON(), _id: service.id },
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
        const service = await Service.findByPk(req.params.id);

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
        await service.update({
            name,
            group: group || 'Default',
            monitorType,
            monitorConfig,
            isActive: isActive === 'on',
            showOnStatusPage: showOnStatusPage === 'on',
            statusPageLabel: statusPageLabel || undefined,
            statusPageOrder: parseInt(statusPageOrder, 10) || 0,
        });

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
        const service = await Service.findByPk(req.params.id);

        if (!service) {
            return res.status(404).render('admin/error', {
                title: 'Not Found',
                error: 'Service not found',
                username: req.session.adminUsername,
            });
        }

        // Delete related checks and incidents (CASCADE should handle this, but be explicit)
        await Check.destroy({ where: { serviceId: service.id } });
        await Incident.destroy({ where: { serviceId: service.id } });

        // Clear incident engine state
        incidentEngine.clearServiceState(service.id.toString());

        // Delete the service
        await service.destroy();

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
        const service = await Service.findByPk(req.params.id);

        if (!service) {
            return res.status(404).render('admin/error', {
                title: 'Not Found',
                error: 'Service not found',
                username: req.session.adminUsername,
            });
        }

        // Get recent checks (last 100)
        const checks = await Check.findAll({
            where: { serviceId: service.id },
            order: [['checkedAt', 'DESC']],
            limit: 100,
        });

        // Get recent incidents
        const incidents = await Incident.findAll({
            where: { serviceId: service.id },
            order: [['startedAt', 'DESC']],
            limit: 20,
        });

        res.render('admin/service-history', {
            title: `${service.name} - History`,
            service: { ...service.toJSON(), _id: service.id },
            checks: checks.map(c => c.toJSON()),
            incidents: incidents.map(i => i.toJSON()),
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
        const incidents = await Incident.findAll({
            include: [{ model: Service, as: 'service' }],
            order: [['startedAt', 'DESC']],
            limit: 100,
        });

        const formattedIncidents = incidents.map(incident => ({
            ...incident.toJSON(),
            _id: incident.id,
            serviceId: incident.service ? { 
                ...incident.service.toJSON(), 
                _id: incident.service.id 
            } : null,
        }));

        res.render('admin/incidents', {
            title: 'Incidents',
            incidents: formattedIncidents,
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

// ============================================
// SETTINGS ROUTES
// ============================================

/**
 * GET /admin/settings
 * Show settings page
 */
router.get('/settings', async (req: Request, res: Response) => {
    try {
        const settings = await Settings.getMultiple([
            SETTING_KEYS.DISCORD_WEBHOOK_URL,
            SETTING_KEYS.DISCORD_ENABLED,
            SETTING_KEYS.SITE_NAME,
            SETTING_KEYS.CHECK_RETENTION_DAYS,
            SETTING_KEYS.SCHEDULER_INTERVAL_SECONDS,
            SETTING_KEYS.CONSECUTIVE_FAILURES_THRESHOLD,
            SETTING_KEYS.INCIDENT_COOLDOWN_MINUTES,
        ]);

        res.render('admin/settings', {
            title: 'Settings',
            settings,
            success: req.query.success || null,
            error: req.query.error || null,
            username: req.session.adminUsername,
        });
    } catch (error) {
        console.error('[Admin] Settings error:', error);
        res.status(500).render('admin/error', {
            title: 'Error',
            error: 'Failed to load settings',
            username: req.session.adminUsername,
        });
    }
});

/**
 * POST /admin/settings/notifications
 * Update notification settings
 */
router.post('/settings/notifications', async (req: Request, res: Response) => {
    try {
        const { discordWebhookUrl, discordEnabled } = req.body;

        await Settings.setMultiple({
            [SETTING_KEYS.DISCORD_WEBHOOK_URL]: discordWebhookUrl || '',
            [SETTING_KEYS.DISCORD_ENABLED]: discordEnabled === 'on' ? 'true' : 'false',
        });

        console.log('[Admin] Updated notification settings');

        res.redirect('/admin/settings?success=Notification settings saved successfully');
    } catch (error) {
        console.error('[Admin] Update notification settings error:', error);
        res.redirect('/admin/settings?error=Failed to save notification settings');
    }
});

/**
 * POST /admin/settings/notifications/test
 * Send a test Discord notification
 */
router.post('/settings/notifications/test', async (req: Request, res: Response) => {
    try {
        const { webhookUrl } = req.body;

        if (!webhookUrl) {
            return res.json({ success: false, error: 'Webhook URL is required' });
        }

        // Send test message to Discord
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                embeds: [{
                    title: '🧪 Test Notification',
                    description: 'This is a test notification from ApexMonitor. If you see this, your webhook is configured correctly!',
                    color: 0x667eea,
                    timestamp: new Date().toISOString(),
                    footer: { text: 'ApexMonitor' },
                }],
            }),
        });

        if (!response.ok) {
            const text = await response.text();
            return res.json({ success: false, error: `Discord returned ${response.status}: ${text}` });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('[Admin] Test notification error:', error);
        res.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
});

/**
 * POST /admin/settings/account/username
 * Update admin username
 */
router.post('/settings/account/username', async (req: Request, res: Response) => {
    try {
        const { newUsername } = req.body;

        if (!newUsername || newUsername.length < 3 || newUsername.length > 50) {
            return res.redirect('/admin/settings?error=Username must be between 3 and 50 characters#account');
        }

        const admin = await AdminUser.findByPk(req.session.adminId);
        if (!admin) {
            return res.redirect('/admin/settings?error=Admin user not found#account');
        }

        // Check if username is already taken
        const existing = await AdminUser.findOne({ where: { username: newUsername } });
        if (existing && existing.id !== admin.id) {
            return res.redirect('/admin/settings?error=Username is already taken#account');
        }

        await admin.update({ username: newUsername });
        req.session.adminUsername = newUsername;

        console.log(`[Admin] Username updated to: ${newUsername}`);

        res.redirect('/admin/settings?success=Username updated successfully#account');
    } catch (error) {
        console.error('[Admin] Update username error:', error);
        res.redirect('/admin/settings?error=Failed to update username#account');
    }
});

/**
 * POST /admin/settings/account/password
 * Update admin password
 */
router.post('/settings/account/password', async (req: Request, res: Response) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.redirect('/admin/settings?error=All password fields are required#account');
        }

        if (newPassword.length < 8) {
            return res.redirect('/admin/settings?error=New password must be at least 8 characters#account');
        }

        if (newPassword !== confirmPassword) {
            return res.redirect('/admin/settings?error=New passwords do not match#account');
        }

        const admin = await AdminUser.findByPk(req.session.adminId);
        if (!admin) {
            return res.redirect('/admin/settings?error=Admin user not found#account');
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, admin.passwordHash);
        if (!isValid) {
            return res.redirect('/admin/settings?error=Current password is incorrect#account');
        }

        // Hash and update new password
        const passwordHash = await bcrypt.hash(newPassword, 12);
        await admin.update({ passwordHash });

        console.log('[Admin] Password updated successfully');

        res.redirect('/admin/settings?success=Password updated successfully#account');
    } catch (error) {
        console.error('[Admin] Update password error:', error);
        res.redirect('/admin/settings?error=Failed to update password#account');
    }
});

/**
 * POST /admin/settings/general
 * Update general settings
 */
router.post('/settings/general', async (req: Request, res: Response) => {
    try {
        const {
            siteName,
            checkRetentionDays,
            schedulerIntervalSeconds,
            consecutiveFailuresThreshold,
            incidentCooldownMinutes,
        } = req.body;

        await Settings.setMultiple({
            [SETTING_KEYS.SITE_NAME]: siteName || 'ApexMonitor',
            [SETTING_KEYS.CHECK_RETENTION_DAYS]: String(parseInt(checkRetentionDays, 10) || 30),
            [SETTING_KEYS.SCHEDULER_INTERVAL_SECONDS]: String(parseInt(schedulerIntervalSeconds, 10) || 60),
            [SETTING_KEYS.CONSECUTIVE_FAILURES_THRESHOLD]: String(parseInt(consecutiveFailuresThreshold, 10) || 3),
            [SETTING_KEYS.INCIDENT_COOLDOWN_MINUTES]: String(parseInt(incidentCooldownMinutes, 10) || 10),
        });

        console.log('[Admin] Updated general settings');

        res.redirect('/admin/settings?success=General settings saved successfully#general');
    } catch (error) {
        console.error('[Admin] Update general settings error:', error);
        res.redirect('/admin/settings?error=Failed to save general settings#general');
    }
});

export default router;
