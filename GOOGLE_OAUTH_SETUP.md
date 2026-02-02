# Google OAuth Setup Guide

This guide will walk you through setting up Google OAuth authentication for your UFFP mobile app.

## Prerequisites
- A Google account
- Access to your Vercel project settings

## Step 1: Create a Google Cloud Project

1. Go to **[Google Cloud Console](https://console.cloud.google.com/)**
2. Click the project dropdown at the top (it might say "Select a project")
3. Click **"NEW PROJECT"** in the top right
4. Enter project details:
   - **Project name**: "UFFP Mobile" (or whatever you prefer)
   - **Organization**: Leave as default (No organization)
5. Click **"CREATE"**
6. Wait a few seconds for the project to be created
7. Make sure the new project is selected (check the project dropdown at the top)

## Step 2: Enable Google+ API

1. In the left sidebar, click **"APIs & Services"** → **"Library"**
   - Or use this direct link: https://console.cloud.google.com/apis/library
2. In the search box, type **"Google+ API"**
3. Click on **"Google+ API"** from the results
4. Click the blue **"ENABLE"** button
5. Wait for it to enable (should take just a few seconds)

## Step 3: Configure OAuth Consent Screen

1. In the left sidebar, click **"OAuth consent screen"**
   - Or use: https://console.cloud.google.com/apis/credentials/consent
2. Choose **"External"** (unless you have a Google Workspace account)
3. Click **"CREATE"**
4. Fill in the required fields:
   - **App name**: "UFFP Mobile"
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click **"SAVE AND CONTINUE"**
6. On the "Scopes" page, just click **"SAVE AND CONTINUE"** (we don't need special scopes)
7. On the "Test users" page:
   - Click **"ADD USERS"**
   - Add your email address (and any other testers)
   - Click **"ADD"**
8. Click **"SAVE AND CONTINUE"**
9. Review the summary and click **"BACK TO DASHBOARD"**

## Step 4: Create OAuth Credentials

1. In the left sidebar, click **"Credentials"**
   - Or use: https://console.cloud.google.com/apis/credentials
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"**
4. Choose **"Web application"** as the application type
5. Fill in the details:
   - **Name**: "UFFP Backend"
   - **Authorized JavaScript origins**: Leave empty for now
   - **Authorized redirect URIs**: Click **"+ ADD URI"** and enter:
     ```
     https://uffp-backend.vercel.app/api/auth/oauth
     ```
     (Make sure there are no spaces or trailing slashes!)
6. Click **"CREATE"**
7. A popup will appear with your credentials - **DON'T CLOSE THIS YET!**

## Step 5: Copy Your Credentials

From the popup that appeared:
1. Copy the **"Client ID"** (looks like: `123456789-abcdefg.apps.googleusercontent.com`)
2. Copy the **"Client secret"** (looks like: `GOCSPX-abcd1234...`)
3. Keep these somewhere safe temporarily - we'll add them to Vercel next

You can also find these later by:
- Going to Credentials page
- Clicking on "UFFP Backend" in the OAuth 2.0 Client IDs section
- The credentials will be shown on the right

## Step 6: Add Credentials to Vercel

1. Go to **[Vercel Dashboard](https://vercel.com/dashboard)**
2. Find and click on your **"uffp-backend"** project
3. Click on **"Settings"** tab at the top
4. In the left sidebar, click **"Environment Variables"**
5. Add the first variable:
   - **Key**: `GOOGLE_CLIENT_ID`
   - **Value**: Paste the Client ID you copied
   - **Environment**: Check all three (Production, Preview, Development)
   - Click **"Save"**
6. Add the second variable:
   - **Key**: `GOOGLE_CLIENT_SECRET`
   - **Value**: Paste the Client secret you copied
   - **Environment**: Check all three
   - Click **"Save"**

## Step 7: Redeploy Your Backend

After adding environment variables, you need to redeploy:

1. Go to the **"Deployments"** tab in your Vercel project
2. Find the most recent deployment
3. Click the three dots (⋮) on the right
4. Click **"Redeploy"**
5. Wait for the deployment to complete (usually 30-60 seconds)

## Step 8: Test OAuth

1. Open your UFFP mobile app: **https://your-app-url.vercel.app**
2. Click **"Continue with Google"**
3. A popup should open showing Google's login page
4. Sign in with your Google account (use the test user you added earlier)
5. Grant permissions when asked
6. The popup should close and you should be logged in!

## Troubleshooting

### "OAuth not configured" error
- Make sure you saved both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Vercel
- Make sure you redeployed after adding the environment variables

### "redirect_uri_mismatch" error
- Go back to Google Cloud Console → Credentials
- Click on your OAuth client
- Check that the redirect URI exactly matches: `https://uffp-backend.vercel.app/api/auth/oauth`
- No trailing slashes, no typos!

### "Access blocked: This app's request is invalid"
- Make sure you added your email as a test user in the OAuth consent screen
- The app is in testing mode, so only test users can sign in

### Still having issues?
- Check the Vercel function logs: Dashboard → uffp-backend → Functions → oauth
- The error message should tell you exactly what's wrong

## Moving to Production

When you're ready to allow anyone to sign in:

1. Go to Google Cloud Console → OAuth consent screen
2. Click **"PUBLISH APP"**
3. Go through the verification process (required for public apps)

For now, keeping it in testing mode is fine - you can add up to 100 test users!
