# Fixl Frontend

React + TypeScript frontend for the Fixl collaborative project and task management platform.

## Stack

- React
- TypeScript
- Vite
- React Router
- Axios
- Tailwind CSS
- Material UI
- Socket.IO Client

## Main Features

- Authentication and protected routes
- Workspace switching
- Project management
- Task management
- Kanban board
- Calendar view
- Timeline/Gantt-style view
- Task dependencies
- Comments
- Notifications
- Search and filters
- Saved filters
- Bulk actions
- Analytics dashboard
- Offline queue and retry states
- Permission-aware UI
- Realtime synchronization

## Structure

```text
frontend/
├── src/
│   ├── api/
│   ├── components/
│   ├── context/
│   ├── pages/
│   ├── socket/
│   └── utils/
├── tests/
├── public/
├── package.json
└── .env.example
```

## Environment Variables

Create `.env` locally from `.env.example`.

Example:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Do not commit real environment files containing secrets.

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Tests

```bash
npm test
```

The frontend includes focused tests for the offline operation queue, including duplicate protection and retry-related behavior.

## Application State

The frontend separates:

- server/application data
- UI state
- authentication state
- workspace state
- realtime state
- offline queue state

API calls are centralized in the `src/api` layer and realtime communication is handled through Socket.IO context/socket utilities.

## Permissions

The frontend hides or disables actions that the current role cannot perform, but these checks are only for the user experience.

The backend remains responsible for enforcing authorization.

## Realtime

The frontend listens for task, comment and notification events and updates active views without requiring a full page refresh.

## Offline Handling

When connectivity is lost, supported task edits and comments can be queued locally.

The UI distinguishes pending/syncing/failed operations and allows retrying failed operations. Server conflicts are surfaced rather than silently treated as successful saves.

## Running With the Backend

Start the backend first:

```bash
cd backend
npm run dev
```

Then:

```bash
cd frontend
npm run dev
```

Open the Vite development URL shown in the terminal.
