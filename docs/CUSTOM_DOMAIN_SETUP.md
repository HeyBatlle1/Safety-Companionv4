# Safety-Companion.com Custom Domain Setup

## Step 1: Add Domains in Railway Dashboard

### Frontend (safety-companion.com)
1. Go to Railway → **Frontend** service → **Settings** → **Domains**
2. Click **"+ Custom Domain"**
3. Enter: `safety-companion.com`
4. Click Add
5. Repeat for: `www.safety-companion.com`

### Backend API (api.safety-companion.com)
1. Go to Railway → **Backend** service → **Settings** → **Domains**
2. Click **"+ Custom Domain"**
3. Enter: `api.safety-companion.com`
4. Click Add

Railway will show you the **required DNS records**.

---

## Step 2: DNS Configuration (at your registrar)

Add these records where you manage Safety-Companion.com DNS:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | @ | `frontend-production-4a72.up.railway.app` | 3600 |
| CNAME | www | `frontend-production-4a72.up.railway.app` | 3600 |
| CNAME | api | `backend-production-bc6d.up.railway.app` | 3600 |

**Note:** Some registrars don't allow CNAME on root (@). Use their "ALIAS" or "ANAME" record if available, or use their "flattening" feature.

---

## Step 3: Update Environment Variables

After domains are verified, update these in Railway:

### Backend Variables:
```
CORS_ORIGINS=["https://safety-companion.com","https://www.safety-companion.com","https://frontend-production-4a72.up.railway.app","http://localhost:3000"]
```

### Frontend Variables:
```
NEXT_PUBLIC_API_URL=https://api.safety-companion.com
```

---

## Step 4: Update Clerk

In Clerk Dashboard → Your App → **Domains**:
1. Add `safety-companion.com` as a production domain
2. Update redirect URLs if needed

---

## Verification

1. Wait 5-10 minutes for DNS propagation
2. Test: `curl -I https://safety-companion.com`
3. Should see 200 OK (once frontend 502 is fixed)

Railway handles SSL certificates automatically via Let's Encrypt.
