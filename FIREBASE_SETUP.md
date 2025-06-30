# Firebase Environment Configuration

This project uses environment variables for all Firebase configuration, making it easy to switch between development and production environments.

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Firebase Client Configuration (Frontend)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Firebase Admin SDK Configuration (Backend)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project_id.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your_project_id.iam.gserviceaccount.com
```

### 2. Getting the Values

#### For Client Configuration:

1. Go to your Firebase Console
2. Project Settings → General → Your apps
3. Copy the config values

#### For Admin SDK Configuration:

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Copy values from the JSON to your environment variables

### 3. Development vs Production

Simply change the environment variable values to point to your development or production Firebase project. No code changes needed!

## Security Best Practices

1. **Never commit** `.env.local`, `.env.development`, or `.env.production` files
2. **Use different Firebase projects** for development and production
3. **Set environment variables** in your hosting platform (Vercel, Netlify, etc.)
4. **Keep private keys secure** and never expose them in client-side code

## Adding to .gitignore

Add these lines to your `.gitignore`:

```
# Environment files
.env.local
.env.development
.env.production
.env

# Firebase Admin SDK files (no longer needed)
src/lib/*firebase-adminsdk*.json
```

## Environment Variables Reference

### Client-side (NEXT*PUBLIC*\*)

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

### Server-side (Firebase Admin SDK)

- `FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY_ID`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_CLIENT_ID`
- `FIREBASE_AUTH_URI`
- `FIREBASE_TOKEN_URI`
- `FIREBASE_AUTH_PROVIDER_X509_CERT_URL`
- `FIREBASE_CLIENT_X509_CERT_URL`

## Example .env.local Template

```env
# Development Firebase Project
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCdaKVvRUKZZ09jROcmiZBYMGh-8TyoPFg
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=go-development-4926b.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=go-development-4926b
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=go-development-4926b.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=109688973924
NEXT_PUBLIC_FIREBASE_APP_ID=1:109688973924:web:5e5d18dc7c9f97d73b4d71

# Admin SDK for Development
FIREBASE_PROJECT_ID=go-development-4926b
FIREBASE_PRIVATE_KEY_ID=your_dev_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_dev_private_key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@go-development-4926b.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_dev_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40go-development-4926b.iam.gserviceaccount.com
```
