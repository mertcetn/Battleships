# Battleships

A fully online multiplayer Battleships game built with React and NestJS. Two players connect in real-time, place their fleets, and take turns firing shots at each other's hidden boards — all coordinated through a WebSocket server that owns the authoritative game state.

**Stack:** React 19 · NestJS 11 · Socket.IO · Prisma · PostgreSQL · JWT · Google OAuth

---

## Architecture Overview

All game logic runs server-side. The client handles rendering, input, and UI state — it never resolves shot hits, sunk ships, or turn changes. Every outcome is computed against the server's in-memory game state and then broadcast to both players.

WebSocket communication is split across three Socket.IO namespaces: `lobby` for matchmaking and friend activity, `game` for in-game events, and `chat` for in-game messaging. Each namespace has its own NestJS gateway class that extends a shared `BaseGateway`, which handles the common connection lifecycle — JWT validation on handshake, user lookup, and the `onlineUsers` map that tracks live lobby connections.

The game state itself is a plain in-memory `Map<gameId, Game>`. There is no distributed state, no session store. A `Game` instance owns two boards and two shot histories and is the only place where turn enforcement and hit detection happen.

---

## Authentication

Authentication uses httpOnly JWT cookies, set at login and read by the WebSocket handshake. The server extracts the cookie from the handshake headers, verifies it, fetches the user from the database, and attaches the decoded payload to `client.data` before emitting a custom `ready` event.

Two providers are supported: local (email + bcrypt password) and Google OAuth via Passport. Both produce the same JWT and go through the same cookie flow.

---

## Connection Lifecycle

The connection handshake is asynchronous — token verification and a database call happen before the client is considered ready. This created a subtle race condition: Socket.IO emits `connect` to the client immediately, before the async setup finishes. If the client emits any message right away, guards that check `client.data.ready` reject it silently.

The fix is a custom `ready` event. `handleConnection` sets `client.data.ready = false` at the start, performs its async work, sets it to `true`, then emits `ready`. The client waits for this event before sending any messages. A `WsReadyGuard` blocks any message that arrives before `ready` is set, which prevents the race entirely.

`onlineUsers` (a `Map<userId, Socket>`) is only populated from the lobby namespace. The game and chat namespaces are not used for presence tracking; they only exist for the duration of an active game session.

---

## Matchmaking

The matchmaking queue is a simple server-side data structure keyed on `userId`. When a player joins the queue, the server checks for an existing opponent, and if found, creates a game and notifies both clients with a `match_found` event containing the opponent's details and the assigned game ID.

Several edge cases surfaced during development:

**Stale queue entries on disconnect.** The original `handleQueueLeave` call passed `client.id` (the socket ID) to a removal function that keyed on `userId`. Disconnecting players were never removed. Fix: use `client.data.sub`.

**Duplicate socket from a new tab.** Opening a second tab overwrites the `onlineUsers` entry for that user but leaves the old socket's queue entry intact. A subsequent `join_queue` from the new tab finds `has(userId) = true` and returns silently. Fix: on duplicate join, remove the old entry first and re-insert the new socket.

**Undefined opponent payload.** After refactoring how user data is attached to the socket, the `match_found` emit was still reading from a removed field. Fix: emit hand-selected fields from `client.data` rather than forwarding the whole object.

---

## Game Phases

A `Game` instance moves through three phases: `placement`, `active`, and `finished`.

**Placement.** When both players have joined the game room, the server generates random ship layouts for each — five ships of sizes 5, 4, 3, 3, and 2 — using a retry loop that ensures no two ships overlap. Ship coordinates are sent only to the owning player; the opponent never sees them. Once both boards are placed, the phase transitions to `active` and the move timer starts.

**Active.** Players alternate firing shots. The `fire` method on the `Game` class validates turn ownership, bounds, and duplicate shots. On a hit, it checks whether the struck ship is fully sunk. On all ships sunk, the game transitions to `finished` and ELO is updated.

**Turn timer.** Each turn has a 60-second server-side timeout. If a player does not fire within the window, the server fires a random shot on their behalf at an unvisited cell, then resets the timer for the next player. The timer is cleared and restarted on every valid shot.

---

## Disconnection Handling

The game namespace overrides the default disconnect handler. When a player disconnects mid-game, the server starts a 30-second reconnection window and emits `opponent_disconnected` to the remaining player. If the disconnected player reconnects within the window, the timeout is cleared and the game resumes — the server sends a full state snapshot (`rejoin_game`) so the client can reconstruct the board without any stored client-side state. If the window expires, the disconnected player forfeits and the opponent is declared the winner.

---

## ELO System

ELO changes are calculated server-side at game end using the standard formula with a K-factor of 32. The winner and loser records are updated atomically in the database, and both players receive their delta in the `game_result` event. The ELO is attached to `client.data` at connection time, so it is available to the matchmaking queue without an additional database call.

---

## Friend System & Activity Notifications

Friend relationships are persisted in the database. The friends panel shows each friend's nickname and current ELO rank. When a friend's status changes, the server uses a shared `globalEventEmitter` — a Node.js `EventEmitter` singleton — to decouple the notification from the triggering system. The lobby gateway subscribes to `friend_activity` events and forwards them to the relevant socket without any direct coupling between the game logic and the friends module.

---

## Systems

### WebSocket Guards

Two guards protect all WebSocket message handlers. `WsReadyGuard` rejects messages that arrive before the async connection setup completes. `WsThrottlerGuard` enforces rate limits — the default is a conservative global limit, with a tighter per-handler override on `fire_shot` (20 messages per second) to prevent shot-spam exploits.

---

### Game State & Persistence

Active games live entirely in memory as `Game` instances. Game records are written to the database at two points only: on creation (with status `placement`) and on conclusion (with status `finished`, winner ID, and end timestamp). The server does not write intermediate move state — board positions are reconstructed from the in-memory instance on reconnect.

---

### Namespaced Gateway Design

Each namespace gateway extends `BaseGateway`, which wires the shared connection and disconnection lifecycle. Namespace-specific behavior is delegated to a dedicated service class — `LobbyGatewayService`, `GameService` — keeping the gateway layer thin. The gateway handles only event routing and Socket.IO room management; all business logic lives in the service.
