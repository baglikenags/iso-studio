# ISO Studio

High quality remote podcast/video recording studio.

## Features
- Producer creates a room, shares invite link with guests
- Guest joins with just a link — no account needed
- HD video (720p/30fps) + high quality stereo audio
- Screen sharing
- Cloud recording (requires Daily.co paid plan)
- Spotlight any participant

## Setup

### 1. Clone the repo
```bash
git clone https://github.com/baglikenags/iso-studio.git
cd iso-studio
npm install
```

### 2. Add your Daily.co API key
Create a file called `.env.local` in the root folder:
```
REACT_APP_DAILY_API_KEY=your_api_key_here
```

### 3. Run locally
```bash
npm start
```

### 4. Deploy to Vercel
- Go to vercel.com
- Import this GitHub repo
- Add environment variable: `REACT_APP_DAILY_API_KEY` = your key
- Deploy

## How to use
1. Open the app, select **Producer**, enter your name, click Create Room
2. Copy the invite link from the sidebar or header
3. Send the link to your guests — they just click it and join as Guest
4. Click participant tiles to spotlight them in the main view
