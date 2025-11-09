# Proximity Chat

An online voice chat application where users can enter a name and join voice conversations.

## Project Structure

```
proximity-chat/
├── client/          # Vue.js frontend application
├── server/          # Node.js backend server
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. Install backend dependencies:
```bash
cd server
npm install
```

2. Install frontend dependencies:
```bash
cd client
npm install
```

### Running the Application

1. Start the backend server:
```bash
cd server
npm run dev
```

2. Start the frontend (in a new terminal):
```bash
cd client
npm run dev
```

3. Open your browser and navigate to the URL shown in the terminal (typically `http://localhost:5173`)

## Features

- Enter your name and join voice chat
- Real-time voice communication using WebRTC
- Clean, scalable architecture for future expansion

## Technology Stack

- **Frontend**: Vue.js 3 + Vite
- **Backend**: Node.js + Express
- **Real-time**: Socket.io
- **Voice**: WebRTC

## Deployment

### GitHub Pages (Frontend Only)

The frontend can be deployed to GitHub Pages. The backend server must be deployed separately (e.g., Heroku, Railway, Render, etc.).

1. **Set up GitHub Pages**:
   - Go to your repository Settings → Pages
   - Select "GitHub Actions" as the source
   - The workflow will automatically deploy on pushes to `main`

2. **Configure Backend URL** (Optional):
   - Go to repository Settings → Secrets and variables → Actions
   - Add a secret named `VITE_SOCKET_URL` with your backend server URL
   - Example: `https://your-backend.herokuapp.com` or `wss://your-backend.railway.app`

3. **Update Base Path** (if repository name is not `proximity-chat`):
   - Edit `.github/workflows/deploy.yml` and change `/proximity-chat/` to match your repository name
   - Edit `client/vite.config.js` and update the base path accordingly

**Note**: GitHub Pages only serves static files. You'll need to deploy the backend server separately to a service that supports Node.js (Heroku, Railway, Render, etc.).

