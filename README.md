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

