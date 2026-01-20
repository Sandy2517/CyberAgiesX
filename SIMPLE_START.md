# 🎯 The Simplest Way to Start CyberAgiesX

## TL;DR - Just Run It!

```bash
cd backend
npm install
npm start
```

Then open: `http://localhost:3000/neuroshield_platform.html`

**That's it!** Everything works out of the box.

---

## What You Get Immediately

✅ **Fully functional platform** - All buttons and features work  
✅ **Real-time threat generation** - Auto-generates threats every 15 seconds  
✅ **Threat simulator** - Click "Generate Test Threat" button  
✅ **Settings management** - All sliders and checkboxes work  
✅ **Alert management** - Investigate, block, resolve threats  
✅ **Live monitoring** - Real-time system metrics  
✅ **Security scanner** - Analyze text and URLs  

---

## You DON'T Need to Set Up:

❌ **PostgreSQL** - Works without it (uses in-memory storage)  
❌ **MinIO/S3** - Not required for basic functionality  
❌ **Gmail OAuth** - Optional, only if you want real Gmail  
❌ **Twilio** - Optional, only if you want real calls  
❌ **API Keys** - Everything works without them  

---

## When You're Ready for Real Data Storage

### Step 1: Start Database (Docker)

```bash
# One command starts everything
docker-compose up -d postgres minio
```

### Step 2: Run Migration

```bash
# Windows (PowerShell)
Get-Content backend/migrations/001_create_events_table.sql | docker exec -i cyberagiesx_postgres psql -U postgres -d cyberagiesx

# Or manually:
docker exec -it cyberagiesx_postgres psql -U postgres -d cyberagiesx
# Then paste the SQL from backend/migrations/001_create_events_table.sql
```

### Step 3: Configure Database

Edit `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/cyberagiesx
```

### Step 4: Restart Server

```bash
npm start
```

Now events will be stored in the database!

---

## Testing Integrations (Optional)

### Test Without Real Twilio

```bash
curl -X POST http://localhost:3000/api/v1/test/twilio-event \
  -H "Content-Type: application/json" \
  -d '{"From": "+15551234567", "To": "+15559876543"}'
```

### Test Without Real Gmail

```bash
curl -X POST http://localhost:3000/api/v1/test/gmail-event \
  -H "Content-Type: application/json" \
  -d '{"from": "test@example.com", "to": "user@company.com", "subject": "Test Email"}'
```

These create test events even without database!

---

## Common Questions

### Q: Do I need Google Cloud Console?
**A:** Only if you want real Gmail integration. For testing, use the test endpoints above.

### Q: Do I need Twilio account?
**A:** Only if you want real Twilio calls. For testing, use the test endpoint above.

### Q: Do I need PostgreSQL?
**A:** No! The platform works without it. You'll just lose events when the server restarts.

### Q: Can I push to GitHub now?
**A:** Yes! Everything is ready. Just:
```bash
git init
git add .
git commit -m "Initial commit: CyberAgiesX Platform"
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main
```

### Q: What if npm install fails?
**A:** Make sure you're in the `backend` directory:
```bash
cd backend
npm install
```

---

## Recommended Workflow

1. **Day 1**: Just run `npm start` → Test everything → Explore
2. **Day 2**: Set up Docker → Add database → Events persist
3. **Later**: Add Gmail/Twilio when you need real integrations

**You can deploy to GitHub and Railway/Render right now** - it will work!

---

## Quick Test Checklist

- [ ] Server starts: `npm start`
- [ ] Platform loads: `http://localhost:3000/neuroshield_platform.html`
- [ ] Can login (select role → click login)
- [ ] Can see dashboard
- [ ] Can click "Generate Test Threat" (in Alerts section)
- [ ] Threat appears in alerts
- [ ] Can click "Investigate", "Block", etc. buttons
- [ ] Settings sliders work
- [ ] Live monitoring shows updates

If all these work, you're good to go! 🎉

