import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { AdminUser } from '../models';

const router = Router();

/**
 * Check if admin setup is needed (no admin exists)
 */
async function isSetupNeeded(): Promise<boolean> {
    const adminCount = await AdminUser.countDocuments();
    return adminCount === 0;
}

/**
 * GET /auth/login
 * Show login page
 */
router.get('/login', async (req: Request, res: Response) => {
    // If already logged in, redirect to admin
    if (req.session.adminId) {
        return res.redirect('/admin');
    }

    const setupNeeded = await isSetupNeeded();

    res.render('login', {
        title: 'Login',
        error: null,
        setupNeeded,
    });
});

/**
 * POST /auth/login
 * Handle login form submission
 */
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.render('login', {
                title: 'Login',
                error: 'Username and password are required',
                setupNeeded: await isSetupNeeded(),
            });
        }

        // Find admin user
        const admin = await AdminUser.findOne({ username });

        if (!admin) {
            return res.render('login', {
                title: 'Login',
                error: 'Invalid username or password',
                setupNeeded: await isSetupNeeded(),
            });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, admin.passwordHash);

        if (!isValid) {
            return res.render('login', {
                title: 'Login',
                error: 'Invalid username or password',
                setupNeeded: await isSetupNeeded(),
            });
        }

        // Set session
        req.session.adminId = admin._id.toString();
        req.session.adminUsername = admin.username;

        console.log(`[Auth] Admin "${admin.username}" logged in`);

        res.redirect('/admin');
    } catch (error) {
        console.error('[Auth] Login error:', error);
        res.render('login', {
            title: 'Login',
            error: 'An error occurred during login',
            setupNeeded: await isSetupNeeded(),
        });
    }
});

/**
 * POST /auth/setup
 * Create the first admin user (only works if no admin exists)
 */
router.post('/setup', async (req: Request, res: Response) => {
    try {
        // Check if setup is still needed
        const setupNeeded = await isSetupNeeded();

        if (!setupNeeded) {
            return res.render('login', {
                title: 'Login',
                error: 'Admin already exists. Setup is disabled.',
                setupNeeded: false,
            });
        }

        const { username, password, confirmPassword } = req.body;

        // Validate input
        if (!username || !password || !confirmPassword) {
            return res.render('login', {
                title: 'Login',
                error: 'All fields are required',
                setupNeeded: true,
            });
        }

        if (username.length < 3 || username.length > 50) {
            return res.render('login', {
                title: 'Login',
                error: 'Username must be between 3 and 50 characters',
                setupNeeded: true,
            });
        }

        if (password.length < 8) {
            return res.render('login', {
                title: 'Login',
                error: 'Password must be at least 8 characters',
                setupNeeded: true,
            });
        }

        if (password !== confirmPassword) {
            return res.render('login', {
                title: 'Login',
                error: 'Passwords do not match',
                setupNeeded: true,
            });
        }

        // Hash password and create admin
        const passwordHash = await bcrypt.hash(password, 12);

        const admin = new AdminUser({
            username,
            passwordHash,
        });

        await admin.save();

        console.log(`[Auth] Admin "${username}" created during setup`);

        // Auto-login after setup
        req.session.adminId = admin._id.toString();
        req.session.adminUsername = admin.username;

        res.redirect('/admin');
    } catch (error) {
        console.error('[Auth] Setup error:', error);
        res.render('login', {
            title: 'Login',
            error: 'An error occurred during setup',
            setupNeeded: true,
        });
    }
});

/**
 * GET /auth/logout
 * Log out the current admin
 */
router.get('/logout', (req: Request, res: Response) => {
    const username = req.session.adminUsername;

    req.session.destroy(err => {
        if (err) {
            console.error('[Auth] Logout error:', err);
        } else if (username) {
            console.log(`[Auth] Admin "${username}" logged out`);
        }

        res.redirect('/auth/login');
    });
});

export default router;
