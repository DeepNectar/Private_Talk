# 💕 LoveLink - Private Couple Communication App

A beautiful, production-ready private communication web application designed exclusively for couples. Features real-time chat, video calls, and voice calls with end-to-end privacy.

## 🌟 Features

- 🔐 **Secure Authentication** - Email/password login with Firebase Auth
- 💑 **Unique Couple Code** - Connect with your partner using a special code (e.g., LOVE-8X92)
- 💬 **Real-Time Chat** - WhatsApp-like messaging with instant delivery
- 📹 **Video Calls** - Peer-to-peer WebRTC video calling via PeerJS
- 📞 **Voice Calls** - Crystal-clear voice calls
- 🎨 **Beautiful UI** - Responsive design with Tailwind CSS
- 🔒 **Private** - Only the coupled pair can see each other's data

## 🛠️ Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Auth & Database**: Firebase (Auth + Firestore)
- **Video/Voice**: PeerJS (WebRTC)
- **Deployment**: Vercel

---

## 📋 Step-by-Step Setup Guide

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add Project"** and give it a name (e.g., "lovelink-app-b6156")
3. Disable Google Analytics (optional) and click **Create Project**
4. Once created, click the **Web icon** (</>) to add a web app
5. Register your app with a nickname (e.g., "LoveLink Web")
6. **Copy the Firebase config object** - you'll need these values later

**Your Firebase project is already configured!** The following credentials are hardcoded in `src/lib/firebase.ts`:
- **Project ID:** `lovelink-app-b6156`
- **Auth Domain:** `lovelink-app-b6156.firebaseapp.com`
- **Storage Bucket:** `lovelink-app-b6156.firebasestorage.app`

### Step 2: Enable Firebase Authentication

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Click **Email/Password** and enable it
3. Click **Save**

### Step 3: Set Up Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click **Create Database**
3. Choose **"Start in test mode"** (we'll add security rules later)
4. Select your preferred region and click **Enable**

### Step 4: Configure Environment Variables

Create a `.env` file in the project root with your Firebase config:

```env
VITE_FIREBASE_API_KEY=AIzaSyBCX4pcvk8uYmecyUviPh6lT96WCahIlIY
VITE_FIREBASE_AUTH_DOMAIN=lovelink-app-b6156.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=lovelink-app-b6156
VITE_FIREBASE_STORAGE_BUCKET=lovelink-app-b6156.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=100544585357
VITE_FIREBASE_APP_ID=1:100544585357:web:5603402743be4b74320cc4
```

**Note:** These credentials are already hardcoded in `src/lib/firebase.ts`, so the app will work immediately without needing a `.env` file. The env variables are only needed if you want to override them (e.g., for a different Firebase project).

### Step 5: Install Dependencies

```bash
npm install
```

### Step 6: Run Locally

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Step 7: Deploy to Vercel

#### Option A: Via GitHub (Recommended)

1. Push your code to a GitHub repository
2. Go to [Vercel](https://vercel.com/) and sign in with GitHub
3. Click **"New Project"** and import your repository
4. Vercel will auto-detect Vite - no framework preset needed
5. **No environment variables needed!** Your Firebase credentials are already hardcoded in the code
6. Click **Deploy**

**Optional:** If you want to override the Firebase config, you can add environment variables in Vercel:
- Go to **Settings** > **Environment Variables**
- Add any `VITE_FIREBASE_*` variables to override the defaults

#### Option B: Via Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

---

## 🔒 Firestore Security Rules

After deploying, update your Firestore security rules for production:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can only read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Couple codes - anyone authenticated can read, only creator can write
    match /coupleCodes/{code} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        (resource.data.createdBy == request.auth.uid || 
         resource.data.partnerId == null);
    }
    
    // Chat messages - only the coupled pair can access
    match /chats/{chatId}/messages/{messageId} {
      allow read, create: if request.auth != null && 
        (resource.data.senderId == request.auth.uid || 
         getRequest().auth.uid != null);
    }
    
    // Chat documents
    match /chats/{chatId} {
      allow read, write: if request.auth != null;
    }
    
    // Call signaling - only involved parties
    match /calls/{callId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Stricter Production Rules (Recommended):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is part of the couple
    function isCoupleMember(userId) {
      let userData = get(/databases/$(database)/documents/users/$(userId)).data;
      return userData.partnerId != null;
    }
    
    function getPartnerId(userId) {
      return get(/databases/$(database)/documents/users/$(userId)).data.partnerId;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && request.auth.uid == userId;
    }
    
    // Couple codes
    match /coupleCodes/{code} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.createdBy == request.auth.uid;
      allow update: if request.auth != null && 
        (resource.data.createdBy == request.auth.uid || 
         (resource.data.partnerId == null && request.resource.data.partnerId == request.auth.uid));
    }
    
    // Chat messages - only coupled pair
    match /chats/{chatId}/messages/{messageId} {
      allow create: if request.auth != null && 
        request.resource.data.senderId == request.auth.uid;
      allow read: if request.auth != null;
    }
    
    // Chat documents
    match /chats/{chatId} {
      allow read, write: if request.auth != null;
    }
    
    // Call signaling
    match /calls/{callId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 📁 Project Structure

```
├── index.html              # HTML entry point
├── vercel.json             # Vercel deployment config (SPA routing)
├── .env.example            # Environment variables template
├── package.json            # Dependencies
├── vite.config.js          # Vite configuration
├── tsconfig.json           # TypeScript configuration
├── src/
│   ├── main.tsx            # React entry point
│   ├── App.tsx             # Main app with routing
│   ├── index.css           # Global styles + Tailwind
│   ├── vite-env.d.ts       # Vite type declarations
│   ├── lib/
│   │   └── firebase.ts     # Firebase config + all helpers
│   ├── context/
│   │   └── AuthContext.tsx  # Auth state management
│   ├── pages/
│   │   ├── AuthPage.tsx    # Login/Register screen
│   │   └── DashboardPage.tsx # Main chat + call interface
│   └── components/
│       ├── ChatWindow.tsx  # Real-time chat UI
│       └── CallModal.tsx   # WebRTC video/voice call UI
```

---

## 🎯 How It Works

### Couple Connection Flow:
1. **User A** registers and generates a unique code (e.g., `LOVE-8X92`)
2. **User A** shares this code with their partner
3. **User B** registers and enters the code to connect
4. Once connected, both users can chat and call each other

### Chat System:
- Messages are stored in Firestore under a deterministic chat path
- Real-time updates using `onSnapshot` listeners
- Messages are ordered by timestamp and grouped by date

### Video/Voice Calls:
- Uses PeerJS (WebRTC) for peer-to-peer connections
- Firebase Firestore acts as the signaling server
- Supports mute/unmute and camera on/off
- Visual indicators for call status (ringing, connecting, connected)

---

## ⚠️ Important Notes

1. **PeerJS Cloud Server**: By default, PeerJS uses their free cloud signaling server. For production, consider hosting your own PeerJS server.
2. **HTTPS Required**: WebRTC requires HTTPS. Vercel provides this automatically.
3. **Browser Permissions**: Users must grant camera/microphone permissions for calls.
4. **Firebase Free Tier**: The free tier (Spark plan) supports up to 50K reads/day and 20K writes/day, which is sufficient for a couple's app.

---

## 🚀 Production Checklist

- [ ] Create Firebase project and configure env variables
- [ ] Enable Email/Password authentication
- [ ] Create Firestore database
- [ ] Set up proper Firestore security rules
- [ ] Add environment variables to Vercel
- [ ] Deploy to Vercel
- [ ] Test the full flow: register → generate code → partner connects → chat → call

---

## 📝 License

MIT License - Feel free to use this for your personal project!

Made with 💕 for couples who value privacy.
