# Deployment Environment Variables

Copy and paste these variables into your respective deployment platforms.

## Backend (Render)

**Build Command:** `pip install -r requirements.txt`
**Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Environment Variables for Render:

```properties
# Database (Neon)
DATABASE_URL=YOUR_NEON_DATABASE_URL

# Security & CORS
# IMPORTANT: Add your Netlify URL here once deployed (e.g., https://safety-companion.netlify.app)
CORS_ORIGINS=["http://localhost:3000","https://<YOUR-NETLIFY-APP-NAME>.netlify.app"]

# Clerk Authentication
CLERK_SECRET_KEY=YOUR_CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=YOUR_CLERK_PUBLISHABLE_KEY

# AI Services (Google Gemini)
GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY
GEMINI_API_KEY=YOUR_GOOGLE_API_KEY

# Optional APIs (Leave empty if not using yet)
OPENROUTER_API_KEY=
ANTHROPIC_API_KEY=
OPENWEATHER_API_KEY=YOUR_OPENWEATHER_KEY
GOOGLE_MAPS_API_KEY=
DEBUG=False
```

---

## Frontend (Netlify)

**Build Command:** `npm run build`
**Publish Directory:** `.next` (Netlify usually auto-detects Next.js)

### Environment Variables for Netlify:

```properties
# Backend API URL
# IMPORTANT: Update this with your Render URL after backend deploy (e.g., https://safety-companion-api.onrender.com)
NEXT_PUBLIC_API_URL=https://<YOUR-RENDER-SERVICE-NAME>.onrender.com

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=YOUR_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY=YOUR_CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Other APIs
NEXT_PUBLIC_OPENWEATHER_API_KEY=YOUR_OPENWEATHER_KEY
```

### Deployment Steps:

1.  **Deploy Backend (Render)** first.
    *   Create a "Web Service".
    *   Connect repo, select `backend` root directory.
    *   Add the Env Vars above (replace placeholders with real values).
    *   Deploy.
    *   **Copy the Render URL**.
2.  **Deploy Frontend (Netlify)**.
    *   Import from Git.
    *   Base directory: `frontend`.
    *   Add the Env Vars above (Update `NEXT_PUBLIC_API_URL` with Render URL, replace placeholders).
    *   Deploy.
    *   **Copy the Netlify URL**.
3.  **Finalize Backend**.
    *   Go back to Render → Environment Variables.
    *   Update `CORS_ORIGINS` to include your specific Netlify URL.

---

## ⚠️ IMPORTANT: Get Real Values

Replace these placeholders with your actual keys:

- `YOUR_NEON_DATABASE_URL` - From Neon Dashboard
- `YOUR_CLERK_SECRET_KEY` - From Clerk Dashboard → API Keys
- `YOUR_CLERK_PUBLISHABLE_KEY` - From Clerk Dashboard → API Keys
- `YOUR_GOOGLE_API_KEY` - From Google Cloud Console
- `YOUR_OPENWEATHER_KEY` - From OpenWeather Dashboard
