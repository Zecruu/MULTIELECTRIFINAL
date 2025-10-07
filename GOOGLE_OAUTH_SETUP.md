# Google OAuth Setup Guide

Complete guide to configure Google OAuth for customer login on Multi Electric Supply.

---

## 🎯 **Quick Reference**

**Production Domain:** `https://multielectricsupply.com`  
**OAuth Callback URL:** `https://multielectricsupply.com/api/auth/google/callback`  
**Login Page:** `https://multielectricsupply.com/login`

---

## 📋 **Step-by-Step Setup**

### **Step 1: Create Google Cloud Project**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **NEW PROJECT**
3. Project name: `Multi Electric Supply`
4. Click **CREATE**

---

### **Step 2: Enable Google+ API**

1. In the left sidebar, go to **APIs & Services** → **Library**
2. Search for "Google+ API"
3. Click on **Google+ API**
4. Click **ENABLE**

---

### **Step 3: Configure OAuth Consent Screen**

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (for public users)
3. Click **CREATE**

#### **Fill in the form:**

**App information:**
- **App name:** `Multi Electric Supply`
- **User support email:** `hzayas@multielectricpr.com`
- **App logo:** (Optional) Upload your company logo

**App domain:**
- **Application home page:** `https://multielectricsupply.com`
- **Application privacy policy link:** `https://multielectricsupply.com/privacy` (create this page)
- **Application terms of service link:** `https://multielectricsupply.com/terms` (create this page)

**Authorized domains:**
- Add: `multielectricsupply.com`

**Developer contact information:**
- **Email addresses:** `hzayas@multielectricpr.com`

4. Click **SAVE AND CONTINUE**

#### **Scopes:**
1. Click **ADD OR REMOVE SCOPES**
2. Select these scopes:
   - `openid`
   - `email`
   - `profile`
3. Click **UPDATE**
4. Click **SAVE AND CONTINUE**

#### **Test users (Optional):**
- You can add test users if your app is in testing mode
- Click **SAVE AND CONTINUE**

5. Review and click **BACK TO DASHBOARD**

---

### **Step 4: Create OAuth 2.0 Credentials**

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**

#### **Configure the OAuth client:**

**Application type:** `Web application`

**Name:** `Multi Electric Supply - Production`

**Authorized JavaScript origins:**
```
https://multielectricsupply.com
```

**Authorized redirect URIs:**
```
https://multielectricsupply.com/api/auth/google/callback
```

3. Click **CREATE**

#### **Save your credentials:**
You'll see a popup with:
- **Client ID** (starts with something like `123456789-abc...apps.googleusercontent.com`)
- **Client Secret** (starts with `GOCSPX-...`)

**⚠️ IMPORTANT:** Copy both values immediately!

---

### **Step 5: Add Credentials to Vercel**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **MULTIELECTRIFINAL**
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

```bash
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=https://multielectricsupply.com/api/auth/google/callback
APP_URL=https://multielectricsupply.com
```

5. Click **Save**
6. **Redeploy** your application to apply the changes

---

### **Step 6: Test OAuth Login**

1. Go to `https://multielectricsupply.com/login`
2. Click **"Continue with Google"** button
3. You should be redirected to Google's login page
4. Select your Google account
5. Grant permissions
6. You should be redirected back to `https://multielectricsupply.com/cuenta`
7. Verify you're logged in

---

## 🔧 **Troubleshooting**

### **Error: "redirect_uri_mismatch"**

**Problem:** The redirect URI doesn't match what's configured in Google Cloud Console.

**Solution:**
1. Go to Google Cloud Console → Credentials
2. Click on your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, make sure you have:
   ```
   https://multielectricsupply.com/api/auth/google/callback
   ```
4. Make sure there are no trailing slashes or typos
5. Click **SAVE**
6. Wait 5 minutes for changes to propagate
7. Try again

---

### **Error: "OAuth not configured: missing GOOGLE_CLIENT_ID"**

**Problem:** Environment variables are not set in Vercel.

**Solution:**
1. Go to Vercel → Settings → Environment Variables
2. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
3. Redeploy the application

---

### **Error: "Access blocked: This app's request is invalid"**

**Problem:** OAuth consent screen is not properly configured.

**Solution:**
1. Go to Google Cloud Console → OAuth consent screen
2. Make sure **Publishing status** is not "Testing" (or add yourself as a test user)
3. Verify all required fields are filled in
4. Add `multielectricsupply.com` to **Authorized domains**

---

### **Error: "Invalid OAuth state"**

**Problem:** The state parameter doesn't match (possible CSRF attack or cookie issue).

**Solution:**
1. Clear your browser cookies for `multielectricsupply.com`
2. Try logging in again
3. Make sure your browser allows cookies
4. Check that `APP_URL` environment variable is set correctly in Vercel

---

## 🔐 **Security Best Practices**

1. **Never commit credentials to Git**
   - Client ID and Secret should only be in Vercel environment variables
   - Never in `.env.local` or any committed files

2. **Use HTTPS only**
   - Google OAuth requires HTTPS in production
   - `https://multielectricsupply.com` ✅
   - `http://multielectricsupply.com` ❌

3. **Verify redirect URIs**
   - Only add trusted redirect URIs
   - Never use wildcards in production

4. **Monitor OAuth usage**
   - Check Google Cloud Console → APIs & Services → Dashboard
   - Monitor for unusual activity

---

## 📊 **OAuth Flow Diagram**

```
User clicks "Continue with Google"
         ↓
Redirects to /api/auth/google/start
         ↓
Generates state token (CSRF protection)
         ↓
Redirects to Google OAuth page
         ↓
User logs in with Google
         ↓
Google redirects to /api/auth/google/callback
         ↓
Verifies state token
         ↓
Exchanges code for access token
         ↓
Fetches user info (email, name)
         ↓
Creates/updates customer in MongoDB
         ↓
Creates/updates customer in Postgres
         ↓
Issues JWT tokens (cust_access, cust_refresh)
         ↓
Redirects to /cuenta (customer account page)
```

---

## 🧪 **Testing Checklist**

- [ ] OAuth consent screen is configured
- [ ] Client ID and Secret are created
- [ ] Authorized redirect URI is added: `https://multielectricsupply.com/api/auth/google/callback`
- [ ] Environment variables are set in Vercel
- [ ] Application is redeployed
- [ ] Login button redirects to Google
- [ ] After login, redirects back to the site
- [ ] User is logged in and can access /cuenta
- [ ] User data is saved in MongoDB
- [ ] User data is synced to Postgres

---

## 📝 **Environment Variables Reference**

```bash
# Required for Google OAuth
GOOGLE_CLIENT_ID=123456789-abc...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=https://multielectricsupply.com/api/auth/google/callback
APP_URL=https://multielectricsupply.com

# Required for JWT tokens
JWT_CUSTOMER_ACCESS_SECRET=your-secret-here
JWT_CUSTOMER_REFRESH_SECRET=your-secret-here

# Required for database
MONGO_URI=mongodb+srv://...
POSTGRES_URL=postgresql://...
```

---

## 🔗 **Useful Links**

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

## ✅ **Success Criteria**

Your Google OAuth is working correctly when:

1. ✅ Clicking "Continue with Google" redirects to Google login
2. ✅ After logging in with Google, you're redirected back to your site
3. ✅ You're automatically logged in (can access /cuenta)
4. ✅ Your email and name are displayed correctly
5. ✅ You can log out and log back in
6. ✅ No errors in browser console or Vercel logs

---

**Need help?** Check the troubleshooting section or contact support at hzayas@multielectricpr.com

