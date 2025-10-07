# Domain Update Guide: Migrating to https://multielectricsupply.com/

This guide will help you update all configurations to use your new custom domain.

---

## 📋 **Checklist Overview**

- [ ] 1. Update Vercel Environment Variables
- [ ] 2. Update Google OAuth Configuration
- [ ] 3. Update S3 CORS Configuration
- [ ] 4. Update Stripe Webhook URLs
- [ ] 5. Test All Integrations

---

## 1️⃣ **Update Vercel Environment Variables**

### **Step 1: Go to Vercel Dashboard**
1. Visit https://vercel.com/dashboard
2. Select your project: **MULTIELECTRIFINAL**
3. Go to **Settings** → **Environment Variables**

### **Step 2: Update/Add These Variables**

Add or update the following environment variables:

```bash
# Application URL
APP_URL=https://multielectricsupply.com

# Google OAuth Redirect URI
GOOGLE_REDIRECT_URI=https://multielectricsupply.com/api/auth/google/callback

# Google OAuth Credentials (if not already set)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# JWT Secrets (if not already set)
JWT_SECRET=your-jwt-secret-for-employees
JWT_CUSTOMER_ACCESS_SECRET=your-customer-access-secret
JWT_CUSTOMER_REFRESH_SECRET=your-customer-refresh-secret

# Stripe (use your existing Stripe keys from Vercel)
STRIPE_SECRET_KEY=sk_test_... (your Stripe secret key)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... (your Stripe publishable key)

# Database URLs (use your existing database URLs from Vercel)
POSTGRES_URL=postgresql://... (your Neon Postgres URL)
MONGO_URI=mongodb+srv://... (your MongoDB Atlas URL)

# AWS S3 (use your existing AWS credentials from Vercel)
AWS_ACCESS_KEY_ID=AKIA... (your AWS access key)
AWS_SECRET_ACCESS_KEY=... (your AWS secret key)
AWS_REGION=us-east-1
S3_BUCKET=multi-electric-supply
S3_PUBLIC_BASE_URL=https://multi-electric-supply.s3.amazonaws.com
S3_MAX_UPLOAD_MB=10
S3_USE_ACL=false
```

### **Step 3: Redeploy**
After updating environment variables, trigger a new deployment:
- Click **Deployments** tab
- Click **Redeploy** on the latest deployment
- Or push a new commit to trigger automatic deployment

---

## 2️⃣ **Update Google OAuth Configuration**

### **Step 1: Go to Google Cloud Console**
1. Visit https://console.cloud.google.com/
2. Select your project (or create one if you haven't)
3. Go to **APIs & Services** → **Credentials**

### **Step 2: Create or Update OAuth 2.0 Client ID**

#### **If you don't have OAuth credentials yet:**

1. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
2. Application type: **Web application**
3. Name: `Multi Electric Supply - Production`

#### **Configure Authorized JavaScript origins:**
```
https://multielectricsupply.com
```

#### **Configure Authorized redirect URIs:**
```
https://multielectricsupply.com/api/auth/google/callback
```

4. Click **CREATE**
5. **Copy the Client ID and Client Secret**
6. Add them to Vercel environment variables (see Step 1 above)

#### **If you already have OAuth credentials:**

1. Find your existing OAuth 2.0 Client ID
2. Click the **Edit** (pencil) icon
3. Under **Authorized JavaScript origins**, add:
   ```
   https://multielectricsupply.com
   ```
4. Under **Authorized redirect URIs**, add:
   ```
   https://multielectricsupply.com/api/auth/google/callback
   ```
5. Click **SAVE**

### **Step 3: Verify OAuth Consent Screen**

1. Go to **OAuth consent screen** in the left sidebar
2. Make sure your app is configured:
   - **App name**: Multi Electric Supply
   - **User support email**: hzayas@multielectricpr.com
   - **Developer contact email**: hzayas@multielectricpr.com
   - **Authorized domains**: Add `multielectricsupply.com`
3. Click **SAVE AND CONTINUE**

---

## 3️⃣ **Update S3 CORS Configuration**

### **Step 1: Go to AWS S3 Console**
1. Visit https://s3.console.aws.amazon.com/
2. Select your bucket: **multi-electric-supply**
3. Go to **Permissions** tab
4. Scroll to **Cross-origin resource sharing (CORS)**
5. Click **Edit**

### **Step 2: Update CORS Configuration**

Replace the existing CORS configuration with:

```json
[
  {
    "AllowedHeaders": [
      "*"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedOrigins": [
      "https://multielectricsupply.com",
      "http://localhost:3000"
    ],
    "ExposeHeaders": [
      "ETag",
      "x-amz-server-side-encryption",
      "x-amz-request-id",
      "x-amz-id-2"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

### **Step 3: Save Changes**
Click **Save changes**

---

## 4️⃣ **Update Stripe Webhook URLs**

### **Step 1: Go to Stripe Dashboard**
1. Visit https://dashboard.stripe.com/
2. Go to **Developers** → **Webhooks**

### **Step 2: Update or Create Webhook Endpoint**

#### **If you have an existing webhook:**
1. Click on the existing webhook endpoint
2. Click **Update details**
3. Change the endpoint URL to:
   ```
   https://multielectricsupply.com/api/webhooks/stripe
   ```
4. Click **Update endpoint**

#### **If you need to create a new webhook:**
1. Click **+ Add endpoint**
2. Endpoint URL:
   ```
   https://multielectricsupply.com/api/webhooks/stripe
   ```
3. Description: `Multi Electric Supply - Production`
4. Events to send: Select these events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click **Add endpoint**
6. **Copy the Signing secret** (starts with `whsec_`)
7. Add it to Vercel environment variables as `STRIPE_WEBHOOK_SECRET`

---

## 5️⃣ **Test All Integrations**

### **Test 1: Google OAuth Login**
1. Go to https://multielectricsupply.com/login
2. Click "Continue with Google"
3. **Expected**: Should redirect to Google login
4. After login, should redirect back to https://multielectricsupply.com/cuenta
5. **Verify**: You're logged in and can see your account page

### **Test 2: Image Upload (S3)**
1. Log in to employee panel: https://multielectricsupply.com/employee/login
2. Go to Inventory: https://multielectricsupply.com/employee/inventory
3. Click **Add Product**
4. Try uploading a product image
5. **Expected**: Image uploads successfully without CORS errors

### **Test 3: Stripe Checkout**
1. Add items to cart
2. Go to checkout: https://multielectricsupply.com/checkout
3. Complete payment with test card: `4242 4242 4242 4242`
4. **Expected**: Payment succeeds and order is created
5. **Verify**: Order appears in https://multielectricsupply.com/employee/orders

### **Test 4: Stripe Webhook**
1. After completing a test payment
2. Go to Stripe Dashboard → Developers → Webhooks
3. Click on your webhook endpoint
4. **Expected**: You should see successful webhook events (200 status)
5. **Verify**: Order status updates correctly in the database

---

## 🔧 **Troubleshooting**

### **Google OAuth Error: "redirect_uri_mismatch"**
- **Cause**: The redirect URI in Google Cloud Console doesn't match the one in your app
- **Fix**: Make sure you added `https://multielectricsupply.com/api/auth/google/callback` to **Authorized redirect URIs**

### **S3 CORS Error**
- **Cause**: S3 bucket doesn't allow requests from your new domain
- **Fix**: Update S3 CORS configuration to include `https://multielectricsupply.com`

### **Stripe Webhook Not Working**
- **Cause**: Webhook URL is still pointing to old domain
- **Fix**: Update webhook endpoint URL in Stripe Dashboard

### **Environment Variables Not Applied**
- **Cause**: Vercel needs to redeploy to pick up new environment variables
- **Fix**: Go to Vercel → Deployments → Redeploy latest deployment

---

## ✅ **Verification Checklist**

After completing all steps, verify:

- [ ] Google OAuth login works on https://multielectricsupply.com/login
- [ ] Image uploads work in employee inventory page
- [ ] Stripe checkout completes successfully
- [ ] Stripe webhooks are received (check Stripe Dashboard)
- [ ] Orders are created in the database
- [ ] All pages load correctly on the new domain
- [ ] No console errors related to CORS or authentication

---

## 📝 **Summary of URLs to Update**

| Service | Old URL | New URL |
|---------|---------|---------|
| **App URL** | `https://multielectrifinal.vercel.app` | `https://multielectricsupply.com` |
| **Google OAuth Redirect** | `https://multielectrifinal.vercel.app/api/auth/google/callback` | `https://multielectricsupply.com/api/auth/google/callback` |
| **S3 CORS Origin** | `https://multielectrifinal.vercel.app` | `https://multielectricsupply.com` |
| **Stripe Webhook** | `https://multielectrifinal.vercel.app/api/webhooks/stripe` | `https://multielectricsupply.com/api/webhooks/stripe` |

---

## 🚀 **Next Steps**

1. Follow this guide step-by-step
2. Test each integration after updating
3. Monitor for any errors in Vercel logs
4. Update any documentation or links to use the new domain

**Need help?** Check the troubleshooting section or contact support.

