# CyberAgiesX Deployment Guide

This guide will help you deploy CyberAgiesX to various platforms.

## Prerequisites

- Node.js 14.0.0 or higher
- npm or yarn
- Git

## Quick Start

1. Clone the repository:
```bash
git clone <your-repo-url>
cd NeuroShield-Platform
```

2. Install dependencies:
```bash
cd backend
npm install
```

3. Set up environment variables:
```bash
cp env.example .env
# Edit .env and add your API keys
```

4. Start the server:
```bash
npm start
```

The platform will be available at `http://localhost:3000`

## Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
PORT=3000
WS_PORT=3001
NODE_ENV=production

# OpenAI API (optional but recommended)
OPENAI_API_KEY=your_openai_api_key

# Threat Intelligence APIs (optional but recommended)
VIRUSTOTAL_API_KEY=your_virustotal_key
GOOGLE_SAFE_BROWSING_API_KEY=your_google_safe_browsing_key
URLSCAN_API_KEY=your_urlscan_key
ABUSEIPDB_API_KEY=your_abuseipdb_key
```

## Deployment Platforms

### Heroku

1. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli

2. Login to Heroku:
```bash
heroku login
```

3. Create a new Heroku app:
```bash
cd backend
heroku create your-app-name
```

4. Set environment variables:
```bash
heroku config:set NODE_ENV=production
heroku config:set OPENAI_API_KEY=your_key
# Add other API keys as needed
```

5. Deploy:
```bash
git push heroku main
```

6. Open your app:
```bash
heroku open
```

**Note**: Heroku automatically sets the `PORT` environment variable. The WebSocket will run on the same port.

### Railway

1. Go to https://railway.app and sign up/login

2. Click "New Project" → "Deploy from GitHub repo"

3. Select your repository

4. Add environment variables in the Railway dashboard:
   - `NODE_ENV=production`
   - `OPENAI_API_KEY=your_key`
   - Add other API keys as needed

5. Railway will automatically detect Node.js and deploy

6. Your app will be available at `https://your-app.railway.app`

### Render

1. Go to https://render.com and sign up/login

2. Click "New" → "Web Service"

3. Connect your GitHub repository

4. Configure:
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Environment**: `Node`

5. Add environment variables:
   - `NODE_ENV=production`
   - `PORT` (automatically set by Render)
   - `OPENAI_API_KEY=your_key`
   - Add other API keys as needed

6. Click "Create Web Service"

### Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
cd backend
vercel
```

3. For production:
```bash
vercel --prod
```

**Note**: Vercel is primarily for serverless functions. For WebSocket support, consider Railway, Render, or Heroku.

### DigitalOcean App Platform

1. Go to https://cloud.digitalocean.com/apps

2. Click "Create App" → "GitHub"

3. Select your repository

4. Configure:
   - **Type**: Web Service
   - **Build Command**: `cd backend && npm install`
   - **Run Command**: `cd backend && npm start`
   - **HTTP Port**: `3000`

5. Add environment variables in the dashboard

6. Deploy

### Self-Hosted (VPS/Dedicated Server)

1. SSH into your server

2. Install Node.js:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. Clone your repository:
```bash
git clone <your-repo-url>
cd NeuroShield-Platform/backend
npm install
```

4. Install PM2 (process manager):
```bash
sudo npm install -g pm2
```

5. Create a `.env` file with your configuration

6. Start with PM2:
```bash
pm2 start server.js --name cyberagiesx
pm2 save
pm2 startup
```

7. Configure Nginx as reverse proxy (optional but recommended):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

8. Set up SSL with Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## WebSocket Configuration

In production, WebSocket runs on the same port as the HTTP server. The frontend automatically detects the correct WebSocket URL based on the current host.

- **Development**: `ws://localhost:3001`
- **Production**: `wss://your-domain.com` (HTTPS) or `ws://your-domain.com` (HTTP)

## Troubleshooting

### Port Already in Use
If port 3000 is already in use:
```bash
PORT=3001 npm start
```

### WebSocket Connection Failed
- Ensure your hosting provider supports WebSocket connections
- Check that your firewall allows WebSocket traffic
- Verify the WebSocket URL in the browser console

### Environment Variables Not Loading
- Ensure `.env` file is in the `backend` directory
- Restart the server after changing environment variables
- Check that `dotenv` is installed: `npm install dotenv`

### API Keys Not Working
- Verify your API keys are correct
- Check API key quotas/limits
- Review backend logs for specific error messages

## GitHub Repository Setup

1. Initialize git (if not already):
```bash
git init
```

2. Add all files:
```bash
git add .
```

3. Commit:
```bash
git commit -m "Initial commit: CyberAgiesX Platform"
```

4. Create a new repository on GitHub

5. Add remote and push:
```bash
git remote add origin https://github.com/yourusername/your-repo.git
git branch -M main
git push -u origin main
```

**Important**: Never commit `.env` files. They are already in `.gitignore`.

## Support

For issues or questions:
- Check the logs: `pm2 logs` (if using PM2)
- Review server console output
- Check browser console for frontend errors

## License

MIT License - See LICENSE file for details

