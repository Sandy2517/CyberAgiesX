# 🚀 CyberAgiesX - Deployment Quick Start

## Ready to Deploy!

This project is **fully deployable** to any platform. It automatically detects the environment and configures URLs accordingly.

## ✨ Key Features for Deployment

- ✅ **Auto-detecting URLs**: Frontend automatically detects API and WebSocket URLs
- ✅ **Environment-aware**: Works in both development and production
- ✅ **Single-port WebSocket**: In production, WebSocket runs on the same port as HTTP
- ✅ **Platform-ready**: Pre-configured for Heroku, Railway, Render, and more

## 📦 Quick Deploy Options

### Option 1: Railway (Recommended - Easiest)

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub"
3. Select your repository
4. Add environment variables:
   - `OPENAI_API_KEY` (optional but recommended)
5. Deploy! 🎉

### Option 2: Render

1. Go to [render.com](https://render.com)
2. Click "New" → "Web Service"
3. Connect GitHub repo
4. Settings:
   - Build: `cd backend && npm install`
   - Start: `cd backend && npm start`
5. Deploy! 🎉

### Option 3: Heroku

```bash
cd backend
heroku create your-app-name
git push heroku main
heroku open
```

## 🔧 Environment Variables

Create `.env` in `backend/` directory:

```env
PORT=3000
NODE_ENV=production
OPENAI_API_KEY=your_key_here
```

**Note**: On platforms like Heroku/Railway, `PORT` is automatically set.

## 📝 Full Documentation

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions for all platforms.

## 🌐 GitHub Repository Setup

1. Create a new repository on GitHub
2. Push your code:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main
```

## ⚠️ Important Notes

- Never commit `.env` files (already in `.gitignore`)
- Add your API keys as environment variables in your hosting platform
- The platform works without API keys but with limited functionality

## 🆘 Need Help?

Check the [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed troubleshooting and platform-specific instructions.

