# ApexMonitor

A modern uptime monitoring system built with Node.js, Express, Vue.js, and MongoDB. Monitor HTTP endpoints and TCP ports with real-time status updates and Discord notifications.

## Features

- 🔍 **Multi-Protocol Monitoring**: HTTP/HTTPS and TCP port monitoring
- 📊 **Status Dashboard**: Public status page with real-time updates
- 🔔 **Discord Notifications**: Get notified when services go up/down
- 🔐 **Admin Panel**: Secure authentication for managing monitors
- 📈 **Heartbeat Tracking**: Historical uptime data and response times
- 🎨 **Dark Mode UI**: Clean, modern interface built with Vue 3

## Quick Start

### Prerequisites

- Node.js 18+ or Bun
- MongoDB (optional - uses in-memory DB for development)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/apexmonitor.git
cd apexmonitor
```

2. Install dependencies:

```bash
npm install
# or
bun install
```

3. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Build the frontend:

```bash
npm run build
# or
bun run build
```

5. Start the server:

```bash
npm run dev
# or
bun run dev
```

The application will be available at `http://localhost:10000`

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
# MongoDB Connection (optional in development)
MONGODB_URI=mongodb://localhost:27017/apexmonitor

# Admin Authentication
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-secure-password

# JWT Secret (required)
JWT_SECRET=your-jwt-secret-key

# Discord Webhook (optional)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Environment
NODE_ENV=development
```

## Project Structure

```
apexmonitor/
├── src/
│   ├── server/           # Backend API
│   │   ├── config/       # Configuration files
│   │   ├── models/       # MongoDB schemas
│   │   ├── routes/       # API routes
│   │   ├── middlewares/  # Express middlewares
│   │   ├── monitors/     # Monitor plugins (HTTP, TCP)
│   │   ├── notifications/# Notification handlers
│   │   └── scheduler/    # Background job scheduler
│   └── web/              # Frontend Vue.js app
│       ├── views/        # Vue components
│       └── router/       # Vue Router config
├── dist/                 # Built frontend assets
├── package.json
└── vite.config.js
```

## API Endpoints

### Public Routes

- `GET /api/public/status` - Get current status of all monitors

### Auth Routes

- `POST /api/auth/login` - Admin login

### Admin Routes (Protected)

- `GET /api/admin/monitors` - List all monitors
- `POST /api/admin/monitors` - Create a new monitor
- `GET /api/admin/categories` - List all categories
- `POST /api/admin/categories` - Create a new category

## Monitor Types

### HTTP Monitor

Monitors HTTP/HTTPS endpoints:

```json
{
    "type": "http",
    "target": {
        "url": "https://example.com",
        "timeout": 5000
    }
}
```

### TCP Monitor

Monitors TCP port availability:

```json
{
    "type": "tcp",
    "target": {
        "host": "example.com",
        "port": 3306,
        "timeout": 5000
    }
}
```

## Development

### Running in Development Mode

```bash
# Start backend only
npm run dev

# Build frontend for production
npm run build
```

### Production Deployment

```bash
# Build frontend
npm run build

# Start with production settings
NODE_ENV=production npm start
```

## Technologies Used

- **Backend**: Node.js, Express, Mongoose
- **Frontend**: Vue 3, Vue Router, Vite
- **Database**: MongoDB
- **Authentication**: JWT, bcrypt
- **Monitoring**: Custom plugins for HTTP and TCP
- **Notifications**: Discord webhooks

## License

See [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
