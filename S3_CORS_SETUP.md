# S3 Bucket CORS Configuration

## Problem
Browser uploads to S3 fail with:
```
Access to fetch at 'https://multi-electric-supply.s3.us-east-1.amazonaws.com/' from origin 'https://multielectrifinal.vercel.app' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Solution
Add CORS rules to your S3 bucket to allow browser uploads from your domain.

### Steps

1. **Go to AWS S3 Console**
   - Navigate to: https://s3.console.aws.amazon.com/s3/buckets
   - Click on your bucket: `multi-electric-supply`

2. **Open Permissions Tab**
   - Click the **Permissions** tab
   - Scroll down to **Cross-origin resource sharing (CORS)**
   - Click **Edit**

3. **Paste this CORS configuration:**

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

4. **Click Save changes**

### Notes
- `https://multielectricsupply.com` is your production domain
- Keep `http://localhost:3000` for local development
- If you have multiple domains (staging, preview), add them to `AllowedOrigins`

### Verify
After saving, test image upload in the Inventory page:
1. Log in to `/employee/login`
2. Go to `/employee/inventory`
3. Click **Add Product**
4. Try uploading an image
5. Should succeed without CORS errors

---

## Optional: Bucket Policy for Public Read Access

If you want uploaded images to be publicly readable (recommended for product images), add this bucket policy:

1. In the **Permissions** tab, scroll to **Bucket policy**
2. Click **Edit**
3. Paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::multi-electric-supply/*"
    }
  ]
}
```

4. Click **Save changes**

**Important:** Only do this if your bucket is dedicated to public assets like product images. Do NOT apply this to buckets containing sensitive data.

---

## Alternative: Use ACLs (if Object Ownership allows)

If your bucket has **Object Ownership** set to "Object writer" (not recommended for new buckets):

1. Set `S3_USE_ACL=true` in your environment variables
2. Ensure the IAM user has `s3:PutObjectAcl` permission
3. The presigned POST will include `acl: "public-read"`

**Recommended:** Use the bucket policy approach above instead of ACLs.

