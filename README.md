# TaskForge

TaskForge is a learning-focused project and issue-management application inspired by Jira and Linear.

## Stack

- React
- Node.js
- Express
- MongoDB
- Docker Compose

The main application flow is:

```text
React
  ↓
Express / Node.js
  ↓
MongoDB
```

## Local development

### Requirements

- Node.js 22+
- npm
- MongoDB 4.4

MongoDB 4.4 is required for this development machine because newer MongoDB versions require CPU AVX support.

### Backend

Create `server/.env` locally:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/taskforge
JWT_SECRET=use-a-long-random-local-secret
```

Then run:

```bash
cd server
npm install
npm start
```

The API is available at `http://localhost:5000/api`.

### Frontend

```bash
cd client
npm install
npm run dev
```

The frontend is available at `http://localhost:5173`.

## Docker Compose

Set a JWT secret in the shell without committing it:

```bash
export JWT_SECRET="use-a-long-random-local-secret"
docker compose up --build
```

Services:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- MongoDB: `127.0.0.1:27017`

The Compose configuration intentionally uses `mongo:4.4`. Do not upgrade it to MongoDB 5.0 or newer on this machine.

## Tests

Backend integration tests:

```bash
cd server
npm test
```

Frontend API tests:

```bash
cd client
npm test
```

Frontend production build:

```bash
cd client
npm run build
```

## Security

- Do not commit `server/.env`.
- Do not expose `JWT_SECRET`.
- Passwords are hashed before storage.
- Authorization is enforced by the backend.
