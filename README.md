# Battleships

A fully online multiplayer Battleships game built with a modern full-stack architecture featuring real-time WebSocket communication.

> ~~**Note:** The live demo is currently unavailable. Vercel deprecated Node.js 20 support, which broke the deployment. The project itself is fully functional locally.~~ Live demo is up again at https://battleships-flax.vercel.app/

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, Vite 8, TailwindCSS 4, React Router 7, Zustand |
| **Backend** | NestJS 11, Prisma, PostgreSQL, Passport (JWT + Google OAuth) |
| **Real-time** | Socket.IO (server + client) |
| **Tooling** | PNPM Workspaces, TypeScript 5.9 |

---

## Features

- Real-time multiplayer Battleships gameplay
- Friends system
- In-game chat
- Authentication — local + Google OAuth
- Password reset flow
- Lobby & matchmaking queue
- Player info & game state panels

---

## Screenshots

| Login | Main Page | In Battle |
|-------|-----------|-----------|
| ![Login](./images/login_page.png) | ![Main](./images/main_page.png) | ![Battle](./images/in_battle_2.png) |

---

## Running Locally

### Prerequisites
- Node.js >= 22
- PNPM
- PostgreSQL instance

### Setup

```bash
# Install dependencies
pnpm install

# Start the backend
cd server
pnpm start:dev

# Start the frontend (in a new terminal)
cd client
pnpm dev
```

Configure your `.env` files in both `client/` and `server/` before running.

---

## Project Structure

```
battleships/
├── client/       # React + Vite frontend
├── server/       # NestJS backend
└── shared/       # Shared types/utilities
```

---

## License

Server: [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)
