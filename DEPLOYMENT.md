# RAPID-100 Deployment Guide

## Quick Deploy Options

### Option 1: Google Cloud Run (Recommended)
**Best for:** Production deployment, auto-scaling, pay-per-use

```bash
# 1. Install Google Cloud CLI
# Download from: https://cloud.google.com/sdk/docs/install

# 2. Login and set project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 3. Deploy
gcloud run deploy rapid-100 \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key_here,SECRET_KEY=your_secret,ADMIN_PASSWORD=your_password

# 4. Get URL
gcloud run services describe rapid-100 --region asia-south1 --format='value(status.url)'
```

**Cost:** ~$5-10/month for 100 calls/day

---

### Option 2: Render (Easiest)
**Best for:** Quick deployment, free tier available

1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn --worker-class eventlet -w 1 app:app`
   - **Environment Variables:**
     - `GEMINI_API_KEY`
     - `SECRET_KEY`
     - `ADMIN_PASSWORD`
5. Click "Create Web Service"

**Cost:** Free tier available, $7/month for always-on

---

### Option 3: Docker (Local/VPS)
**Best for:** Self-hosting, full control

```bash
# 1. Build image
docker build -t rapid-100 .

# 2. Run container
docker run -d \
  -p 8080:8080 \
  -e GEMINI_API_KEY=your_key \
  -e SECRET_KEY=your_secret \
  -e ADMIN_PASSWORD=your_password \
  --name rapid-100 \
  rapid-100

# 3. Access
# http://localhost:8080
```

---

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GEMINI_API_KEY` | ✅ Yes | Google Gemini API key | `AIza...` |
| `SECRET_KEY` | ✅ Yes | Flask session secret | `random_string_123` |
| `ADMIN_PASSWORD` | ✅ Yes | Admin login password | `SecurePass123!` |
| `GOOGLE_MAPS_API_KEY` | ❌ No | For map features | `AIza...` |
| `GSPREAD_SERVICE_ACCOUNT` | ❌ No | Google Sheets JSON | `{"type":"service_account",...}` |

---

## Post-Deployment Checklist

### 1. Test Basic Functionality
- [ ] Can access login page
- [ ] Can login with admin credentials
- [ ] Can navigate to `/dispatch`
- [ ] Microphone permission works
- [ ] Audio recording starts
- [ ] Transcription appears

### 2. Test AI Processing
- [ ] Speak a test emergency ("Fire at my house")
- [ ] Verify transcription is accurate
- [ ] Check priority is assigned (should be P1)
- [ ] Verify incident type is detected
- [ ] Confirm dispatch recommendation appears

### 3. Performance Verification
- [ ] Response time < 3 seconds
- [ ] No console errors
- [ ] WebSocket connection stable
- [ ] Audio visualizer working

### 4. Security Check
- [ ] Admin password is strong
- [ ] SECRET_KEY is random and secure
- [ ] API keys are not exposed in client code
- [ ] HTTPS enabled (for production)

---

## Troubleshooting

### Issue: "Model not found" error
**Solution:** Update `ai_service.py` model list:
```python
model_candidates = ["gemini-2.0-flash", "gemini-1.5-flash-latest"]
```

### Issue: Slow transcription
**Causes:**
- Network latency to Gemini API
- Large audio chunks
- API quota limits

**Solutions:**
1. Reduce chunk size in `dispatch.js`: `mediaRecorder.start(3000)`
2. Check Gemini API quota in Google Cloud Console
3. Use a closer region (e.g., `asia-south1` for India)

### Issue: WebSocket disconnects
**Solutions:**
1. Check firewall settings
2. Ensure port 8080 is open
3. Verify `eventlet` worker is used: `gunicorn --worker-class eventlet`

### Issue: Google Sheets not updating
**Solutions:**
1. Verify `credentials.json` is present
2. Check service account has edit access to sheet
3. Ensure sheet name matches in code

---

## Monitoring & Logs

### View Logs (Cloud Run)
```bash
gcloud run services logs read rapid-100 --region asia-south1
```

### View Logs (Render)
- Go to Render dashboard → Your service → "Logs" tab

### View Logs (Docker)
```bash
docker logs rapid-100 -f
```

---

## Scaling Considerations

### For 100 calls/day:
- **Cloud Run:** Default settings sufficient
- **Cost:** ~$10/month

### For 1000 calls/day:
- **Cloud Run:** Increase max instances to 5
- **Cost:** ~$50/month

### For 10,000+ calls/day:
- Consider dedicated infrastructure
- Implement caching
- Use load balancer
- Estimated cost: $200-500/month

---

## Security Best Practices

1. **Use HTTPS:** Always deploy with SSL/TLS
2. **Rotate Keys:** Change API keys every 90 days
3. **Rate Limiting:** Implement to prevent abuse
4. **Audit Logs:** Enable for compliance
5. **Backup Data:** Regular Google Sheets exports

---

## Support & Maintenance

### Regular Tasks:
- **Weekly:** Check error logs
- **Monthly:** Review API usage and costs
- **Quarterly:** Update dependencies (`pip list --outdated`)
- **Annually:** Rotate secrets and API keys

### Getting Help:
- Check logs first
- Review README.md
- Open GitHub issue
- Contact: [your-email@example.com]

---

## Production Readiness Checklist

- [x] Code is clean and optimized
- [x] Error handling implemented
- [x] Environment variables configured
- [x] Documentation complete
- [ ] Load testing performed
- [ ] Security audit completed
- [ ] Backup strategy defined
- [ ] Monitoring alerts configured
- [ ] Incident response plan created

---

**Your RAPID-100 system is ready for deployment! 🚀**
