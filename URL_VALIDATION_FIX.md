# URL Validation Fix for Cloudflare R2 URLs

## Issue Identified
The Joi validation was using `.uri()` which has strict URI parsing that doesn't work well with Cloudflare R2 URLs like:
```
https://48f1ba52689abb3f3fcc1df22b1d6281.r2.cloudflarestorage.com/50brains-deliverables/review/cmhllie060001lgh4mndx2rkf/1762433241516-Sandeep%20master%20meme.mp4
```

## Changes Made

### 1. Fixed `submitDeliverySchema`
**Before:**
```javascript
fileUrl: Joi.string().uri().required().messages({
    'string.uri': 'Please provide a valid file URL',
    'any.required': 'File URL is required'
})
```

**After:**
```javascript
fileUrl: Joi.string().pattern(/^https?:\/\/.+/).required().messages({
    'string.pattern.base': 'File URL must be a valid HTTP/HTTPS URL',
    'any.required': 'File URL is required'
})
```

### 2. Fixed `submitWorkSchema`
**Before:**
```javascript
url: Joi.string().uri().optional(), // For published work
```

**After:**
```javascript
url: Joi.string().pattern(/^https?:\/\/.+/).optional(), // For published work - relaxed URL validation
```

### 3. Fixed `applyGigSchema`
**Before:**
```javascript
portfolio: Joi.array().items(Joi.string().uri()).default([]),
```

**After:**
```javascript
portfolio: Joi.array().items(Joi.string().pattern(/^https?:\/\/.+/)).default([]),
```

### 4. Fixed `assignGigSchema`
**Before:**
```javascript
portfolio: Joi.array().items(Joi.string().uri()).default([]),
```

**After:**
```javascript
portfolio: Joi.array().items(Joi.string().pattern(/^https?:\/\/.+/)).default([]),
```

## Why This Fixes the Issue

The new regex pattern `/^https?:\/\/.+/` is more permissive and:
- ✅ Accepts HTTP and HTTPS URLs
- ✅ Works with Cloudflare R2 URLs
- ✅ Works with other cloud storage URLs
- ✅ Still validates basic URL structure
- ✅ More flexible than Joi's strict URI parser

## Testing

The Cloudflare R2 URL that was failing:
```
https://48f1ba52689abb3f3fcc1df22b1d6281.r2.cloudflarestorage.com/50brains-deliverables/review/cmhllie060001lgh4mndx2rkf/1762433241516-Sandeep%20master%20meme.mp4
```

Will now pass validation because:
- ✅ Starts with `https://`
- ✅ Has content after the protocol
- ✅ Matches the pattern `/^https?:\/\/.+/`

## Impact

This change affects all file upload scenarios:
- ✅ Delivery file submissions (submitDelivery)
- ✅ Final work submissions (submitWork)
- ✅ Portfolio URLs in applications
- ✅ Any other URL validations in the gig workflow

The validation is now compatible with:
- Cloudflare R2 URLs
- AWS S3 URLs
- Google Cloud Storage URLs
- Any other HTTP/HTTPS file storage URLs