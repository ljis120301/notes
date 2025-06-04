# PocketBase Setup Guide

## 1. Start PocketBase

### ⚠️ IMPORTANT: Network Access Required
Your app is configured to connect to `http://10.1.9.143:8090`. You MUST start PocketBase bound to your network interface, not localhost.

### Start PocketBase with Network Access:
```bash
./start-pocketbase-network.sh
```

Or manually:
```bash
cd pocketbase && ./pocketbase serve --http="0.0.0.0:8090"
```

### ❌ DO NOT use localhost only:
```bash
./pocketbase serve  # This will NOT work for network access
```

## 2. Access Admin UI
- **Admin UI**: Go to `http://10.1.9.143:8090/_/`
- **API**: Available at `http://10.1.9.143:8090/api/`

## 3. Create Admin Account
If this is your first time, create an admin account.

## 4. Create Users Collection (IMPORTANT)
**You MUST create a users collection for authentication to work:**

1. Go to "Collections" in the admin panel
2. Click "New Collection"
3. Set the following:
   - **Name**: `users`
   - **Type**: `Auth` (This is important - select Auth, not Base!)

The Auth collection type automatically creates the required fields for authentication.

## 5. Create Notes Collection
1. Go to "Collections" in the admin panel
2. Click "New Collection"
3. Set the following:
   - **Name**: `notes`
   - **Type**: `Base`

## 6. Add Fields to Notes Collection
Add the following fields to the `notes` collection:

### Field 1: title
- **Type**: Text
- **Name**: `title`
- **Required**: Yes
- **Max length**: 255

### Field 2: content
- **Type**: Text
- **Name**: `content`
- **Required**: No
- **Max length**: Leave empty (unlimited)

### Field 3: user (NEW - REQUIRED)
- **Type**: Relation
- **Name**: `user`
- **Collection**: `users`
- **Required**: Yes
- **Display fields**: `email`
- **Cascade delete**: No

## 7. Configure API Rules for Notes Collection

**Set the following API rules for the `notes` collection:**
- **List/Search rule**: `@request.auth.id != "" && user = @request.auth.id`
- **View rule**: `@request.auth.id != "" && user = @request.auth.id`
- **Create rule**: `@request.auth.id != "" && @request.data.user = @request.auth.id`
- **Update rule**: `@request.auth.id != "" && user = @request.auth.id`
- **Delete rule**: `@request.auth.id != "" && user = @request.auth.id`

**For the `users` collection, keep the default Auth rules (they should be automatically configured).**

## 8. IMPORTANT: Update Existing Notes (If Any)
If you already have notes in your collection without the user field, you'll need to:

1. **Option A**: Delete all existing notes and let users create new ones
2. **Option B**: Manually assign existing notes to a user in the PocketBase admin panel

## 9. Test the Setup

1. **Start your Next.js app**: `npm run dev`
2. **Visit**: `http://localhost:3000`
3. **You'll be redirected to**: `http://localhost:3000/auth`
4. **Choose an option**:
   - **Test Login**: Use the pre-configured test account
   - **Create Account**: Make your own account with email/password

## 10. Troubleshooting

### Error: "Failed to create record" 
- **Cause**: Missing users collection or wrong collection type
- **Solution**: Make sure you created a `users` collection with type `Auth` (not `Base`)

### Error: "Authentication failed"
- **Cause**: PocketBase not running or wrong URL
- **Solution**: Ensure PocketBase is running on `http://localhost:8090`

### Error: "Auto-cancelled request"
- **Cause**: Race condition during authentication or missing user field
- **Solution**: Make sure the user field is added to notes collection and API rules are updated

### Notes don't appear after login
- **Cause**: Missing user field or incorrect API rules
- **Solution**: 
  1. Add the user field to notes collection (see step 6)
  2. Update API rules to include user filtering (see step 7)

### Can't create an account
- **Cause**: Users collection missing or misconfigured
- **Solution**: Delete the users collection and recreate it as type `Auth`

## 11. App Features
Once set up correctly, your app will:
- **Show user-specific notes only** (each user sees only their own notes)
- **Redirect to auth page** when not logged in
- **Check authentication** on every page load
- **Auto-refresh** notes after saving/creating
- **Keep you logged in** across browser sessions
- **Allow account creation** and login
- **Handle authentication errors gracefully** with retry logic 