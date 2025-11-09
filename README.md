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

### Running Backend Locally with GitHub Pages Frontend

If you want to run the backend locally and have the GitHub Pages frontend connect to it:

1. **Start your local backend**:
   ```bash
   cd server
   npm run dev
   ```

2. **Expose your local backend** using one of these methods:

   **Option A: Using localtunnel** (Easiest - No installation needed)
   ```bash
   npx localtunnel --port 3001
   # Copy the HTTPS URL provided (e.g., https://abc123.loca.lt)
   # IMPORTANT: Visit the URL in your browser first to accept the connection
   # You'll see a page asking to "Continue to localhost" - click it
   # This is required before the frontend can connect (otherwise you'll get 511 errors)
   ```

   **Option B: Using ngrok** (Requires installation)
   ```bash
   # Download and install ngrok from: https://ngrok.com/download
   # For Windows: Download the .zip, extract, and add to PATH
   # Or use Chocolatey: choco install ngrok
   ngrok http 3001
   # Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
   ```

   **Option C: Using Cloudflare Tunnel** (Free, no account needed for basic use)
   ```bash
   # Install: npm install -g cloudflared
   cloudflared tunnel --url http://localhost:3001
   # Copy the HTTPS URL provided
   ```

3. **Update GitHub Secrets**:
   - Go to your repository → Settings → Secrets and variables → Actions
   - Add/update `VITE_SOCKET_URL` with your exposed backend URL 
   - Examples:
     - localtunnel: `https://abc123.loca.lt`
     - ngrok: `https://abc123.ngrok.io`
     - cloudflared: `https://abc123.trycloudflare.com`
   - Push a new commit to trigger a rebuild

4. **Update backend CORS** (if needed):
   - The backend is already configured to accept connections from `https://peltos.github.io`
   - If your tunnel URL is different, you may need to add it to `CLIENT_URL` in `server/.env`:
     ```
     CLIENT_URL=http://localhost:5173,https://peltos.github.io,https://your-tunnel-url.com
     ```
   - Or set it as an environment variable when starting the server:
     ```bash
     CLIENT_URL=http://localhost:5173,https://peltos.github.io,https://your-tunnel-url.com npm run dev
     ```

**Note**: For production, it's recommended to deploy the backend to a service like Heroku, Railway, or Render instead of using ngrok.

