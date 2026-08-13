# Photo Upload Setup Guide

## Issue: "Invalid api_key Roo" and Photos Not Visible

This guide helps you fix photo upload issues and ensure photos are visible throughout the website.

## Problem Analysis

The error "Invalid api_key Roo" indicates that Cloudinary credentials are either:
- Not configured properly
- Set to placeholder values
- Missing entirely

## Solution: Automatic Fallback to Local Storage

The system now automatically falls back to local disk storage when Cloudinary is not properly configured. This means photos will work even without Cloudinary setup.

## Environment Configuration

### Server Configuration (`server/.env`)

**Option 1: Use Cloudinary (Recommended for Production)**
```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
CLOUDINARY_API_KEY=your_actual_api_key
CLOUDINARY_API_SECRET=your_actual_api_secret

# OR use Cloudinary URL format:
# CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

**Option 2: Use Local Storage (Default for Development)**
```env
# Leave Cloudinary variables unset or set to placeholders
# The system will automatically use local storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Client Configuration (`client/.env.local`)

```env
# Backend URL - MUST match your server URL
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## How It Works

### Server-Side
1. **Cloudinary Check**: The system checks if valid Cloudinary credentials are configured
2. **Automatic Fallback**: If Cloudinary is not configured, it automatically uses local disk storage
3. **Static File Serving**: Uploaded files are served via `/uploads` endpoint with proper CORS headers

### Client-Side
1. **Image URL Resolution**: Client automatically resolves image URLs to work with both Cloudinary and local storage
2. **Debug Logging**: In development mode, image URL resolution is logged to console for troubleshooting

## Testing Photo Upload

### 1. Start the Server
```bash
cd server
npm start
```

You should see logs indicating which storage method is being used:
- `☁️ Using Cloudinary storage` - if Cloudinary is configured
- `💾 Using local disk storage for uploads` - if using local storage

### 2. Start the Client
```bash
cd client
npm run dev
```

### 3. Test Photo Upload
1. Navigate to player registration page
2. Select a photo file
3. Submit the form
4. Check browser console for image URL resolution logs

### 4. Verify Photo Display
1. Check that photos appear in:
   - Player cards
   - Organizer dashboard
   - Auction view
2. If photos don't appear, check browser console for errors

## Troubleshooting

### Photos Not Uploading
**Check server logs for:**
- `📸 Upload request received`
- `📸 Upload file received`
- `📸 Generated image URL`

**Common issues:**
- File size exceeds 5MB limit
- Invalid file type (only jpg, jpeg, png, gif, webp allowed)
- Server not running

### Photos Uploading But Not Displaying
**Check browser console for:**
- Image URL resolution logs
- 404 errors for image URLs
- CORS errors

**Common issues:**
- Wrong `NEXT_PUBLIC_API_URL` in client `.env.local`
- Server not serving static files correctly
- Firewall blocking image requests

### "Invalid api_key Roo" Error
This error occurs when Cloudinary credentials are invalid. The system will now:
1. Log a warning: `⚠️ Cloudinary env vars are set to placeholder values`
2. Automatically fall back to local storage
3. Continue working without Cloudinary

## File Locations

### Server-Side
- **Upload Directory**: `server/uploads/`
- **Cloudinary Config**: `server/utils/cloudinary.js`
- **Upload Route**: `server/routes/payment.js` (POST `/api/payment/upload-image`)
- **Static File Serving**: `server/server.js` (express.static for `/uploads`)

### Client-Side
- **Image Helper**: `client/lib/imageHelper.ts`
- **Player Card**: `client/components/PlayerCard.tsx`
- **Upload Page**: `client/app/auctions/[id]/register-player/page.tsx`

## Production Deployment

For production, you should:
1. Set up proper Cloudinary account
2. Configure real Cloudinary credentials in environment variables
3. Ensure your hosting platform supports persistent storage for local fallback
4. Set proper CORS origins for your domain

## Security Notes

- Never commit actual API keys to git
- Use environment variables for all sensitive configuration
- Local storage is fine for development but Cloudinary is recommended for production
- The system automatically handles both storage methods transparently

## Getting Help

If you still have issues:
1. Check server logs for detailed error messages
2. Check browser console for client-side errors
3. Verify environment variables are set correctly
4. Ensure both server and client are running
5. Test with a simple image file (under 1MB)

## Summary

The photo upload system now:
- ✅ Automatically falls back to local storage when Cloudinary is not configured
- ✅ Handles invalid API keys gracefully
- ✅ Provides detailed logging for troubleshooting
- ✅ Works seamlessly with both Cloudinary and local storage
- ✅ Properly serves static files with CORS headers
- ✅ Resolves image URLs correctly on client side

Your photos should now work even without Cloudinary configuration!
