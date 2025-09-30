# Product Image Troubleshooting Guide

## 🔍 Issue: Product Images Not Displaying

Product images are showing "No image" placeholder instead of the actual uploaded images in:
- Cart page (`/cart`)
- Products catalog page (`/products`)
- Featured products section (homepage)

---

## 🛠️ Troubleshooting Steps

### **Step 1: Check if Images Are Uploaded to S3**

1. **Go to AWS S3 Console**: https://s3.console.aws.amazon.com/
2. **Select your bucket**: `multi-electric-supply`
3. **Check if product images exist** in the bucket
4. **Verify image URLs** are accessible

**Expected URL format:**
```
https://multi-electric-supply.s3.us-east-1.amazonaws.com/products/[filename].jpg
```

---

### **Step 2: Check Product Data in Database**

The images should be stored in the `products` table in the `images` column as a JSON array:

**Expected format:**
```json
[
  {
    "url": "https://multi-electric-supply.s3.us-east-1.amazonaws.com/products/image1.jpg",
    "alt": "Product name",
    "primary": true
  }
]
```

**To check:**
1. Go to your Neon database dashboard
2. Run this SQL query:
```sql
SELECT id, name_en, images FROM products WHERE status = 'active' LIMIT 5;
```

3. **Verify the `images` column contains valid URLs**

---

### **Step 3: Verify S3 CORS Configuration**

S3 bucket must allow cross-origin requests from your website.

**Check CORS settings:**
1. Go to S3 bucket → Permissions → CORS configuration
2. Should look like this:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-vercel-domain.vercel.app",
      "https://your-custom-domain.com"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

**Replace with your actual domains!**

---

### **Step 4: Check S3 Bucket Public Access**

Images must be publicly readable.

**Bucket Policy should include:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::multi-electric-supply/products/*"
    }
  ]
}
```

---

### **Step 5: Test Image Upload Process**

1. **Go to** `/employee/inventory`
2. **Click "Add Product"**
3. **Fill in product details:**
   - Name (EN): Test Product
   - Nombre (ES): Producto de Prueba
   - Category: Test
   - Price: 10
   - Stock: 5
4. **Upload an image** (JPG, PNG, or WebP)
5. **Check "Featured", "Hot", "Visible"**
6. **Click "Publish"**

**Then verify:**
- Open browser DevTools (F12)
- Go to Network tab
- Look for the image upload request
- Check if it returns a valid S3 URL
- Copy the URL and paste it in a new browser tab
- **The image should load**

---

### **Step 6: Check Browser Console for Errors**

1. **Open browser DevTools** (F12)
2. **Go to Console tab**
3. **Look for errors** related to:
   - CORS errors
   - 403 Forbidden errors
   - 404 Not Found errors
   - Mixed content warnings (HTTP vs HTTPS)

**Common errors:**

**CORS Error:**
```
Access to image at 'https://...' from origin 'https://...' has been blocked by CORS policy
```
**Fix:** Update S3 CORS configuration (Step 3)

**403 Forbidden:**
```
Failed to load resource: the server responded with a status of 403
```
**Fix:** Update S3 bucket policy (Step 4)

**404 Not Found:**
```
Failed to load resource: the server responded with a status of 404
```
**Fix:** Image doesn't exist in S3, re-upload the product

---

### **Step 7: Verify Environment Variables**

Make sure these are set in Vercel:

```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET=multi-electric-supply
```

**To check in Vercel:**
1. Go to your project dashboard
2. Settings → Environment Variables
3. Verify all AWS variables are set
4. **Redeploy** if you just added them

---

## 🔧 Quick Fixes

### **Fix 1: Re-upload Product Images**

If images were uploaded before S3 CORS was configured:

1. Go to `/employee/inventory`
2. Click on the product
3. Delete the old image
4. Upload a new image
5. Save

### **Fix 2: Make S3 Bucket Public**

If images are uploaded but not accessible:

1. Go to S3 bucket
2. Permissions → Block public access
3. **Uncheck** "Block all public access"
4. Save
5. Add bucket policy (see Step 4)

### **Fix 3: Update Image URLs in Database**

If images exist in S3 but URLs are wrong in database:

```sql
-- Check current URLs
SELECT id, name_en, images FROM products;

-- If URLs are missing the domain, you may need to update them
-- (This is a manual fix - contact developer if needed)
```

---

## 📊 Expected Behavior

### **When Working Correctly:**

1. **Upload image** in inventory page
2. **Image appears** in the product form preview
3. **Product card shows image** in products page
4. **Featured section shows image** on homepage
5. **Cart shows image** when product is added
6. **Image is clickable** and opens product detail modal

### **Image Display Logic:**

```javascript
// Code finds the primary image or falls back to first image
const primaryImage = product.images.find(img => img.primary) || product.images[0];

// If image exists, display it
{primaryImage ? (
  <img src={primaryImage.url} alt={primaryImage.alt || name} />
) : (
  <div>No image</div>
)}
```

---

## 🐛 Debug Mode

To see what's happening with images, check the browser console:

1. **Open DevTools** (F12)
2. **Go to Console tab**
3. **Look for product data** when page loads
4. **Check the `images` array** in the product object

**Example console output:**
```javascript
{
  id: "abc-123",
  name_en: "Keyboard",
  images: [
    {
      url: "https://multi-electric-supply.s3.us-east-1.amazonaws.com/products/keyboard.jpg",
      alt: "Keyboard",
      primary: true
    }
  ]
}
```

If `images` is empty `[]`, the problem is in the upload process or database.

---

## 📝 Next Steps

1. **Follow troubleshooting steps above**
2. **Check S3 bucket** for uploaded images
3. **Verify CORS configuration**
4. **Test image upload** with a new product
5. **Check browser console** for errors
6. **Share error messages** if issue persists

---

## 🆘 Still Not Working?

If images still don't load after following all steps:

1. **Take a screenshot** of:
   - Browser console errors
   - Network tab showing failed image requests
   - S3 bucket contents
   - Product data from database

2. **Share the following info:**
   - Product ID that should have an image
   - Expected image URL
   - Actual error message
   - Browser being used

3. **Check if:**
   - Images work in `/employee/inventory` but not in `/products`
   - Images work locally but not in production
   - Some images work but others don't

---

**This will help identify the exact issue!** 🔍

