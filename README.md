# CodeArena - Full Stack Application

A full-stack coding platform with React (Next.js) frontend and Node.js/Express backend.

## Project Structure

```
/
├── client/          # Next.js frontend
├── server/          # Express.js backend
├── Compiler/        # Code execution service
└── package.json     # Root package with scripts
```

## Prerequisites

- Node.js (v18 or higher)
- For the judge outside Docker: `g++`, `gcc`, `python3` and a JDK on the PATH
- npm or yarn
- PostgreSQL database (for production)

## Quick Start

### 1. Install Dependencies

```bash
# Install all dependencies for root, client, and server
npm run install:all
```

### 2. Environment Setup

#### Backend (.env in /server/)
```env
DATABASE_URL="your_database_url"
JWT_PASSKEY="your_jwt_secret"
SALT_ROUNDS=10
PORT=8000
COMPILER_SERVICE_URL=http://localhost:3002
GOOGLE_GEMINI_API_KEY="your_gemini_key"
```

#### Frontend (.env.local in /client/)
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

`NEXT_PUBLIC_NEXTJS_URL` is also read, for deployments that already set it.

### 3. Start Development

```bash
# Run both frontend and backend simultaneously
npm run dev

# Or run individually:
npm run dev:server  # Backend only (port 8000)
npm run dev:client  # Frontend only (port 3000)
```

### 4. Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000

## Features

- **Problems:** filterable list with solved status; statement, samples and constraints per problem
- **Solve workspace:** Monaco editor, five languages, custom stdin, per-test verdicts with runtime and memory
- **Playground:** scratch editor that runs any snippet under the judge's limits
- **Submissions and leaderboard:** history with verdicts; ratings from distinct problems solved
- **AI assistance:** hints and failing-code review (Gemini), plus the internship toolkit
- **Contest calendar:** upcoming Codeforces rounds

## How judging works

The compiler service (`Compiler/`) is the judge. For each submission it:

1. writes the source into its own temporary directory,
2. compiles it once (C, C++, Java) with a 15 s compile timeout,
3. runs it against every test case with a time limit (3 s default), a memory
   limit (256 MB default) and a 1 MB output cap,
4. compares output to the expected answer, ignoring trailing whitespace,
5. deletes the directory.

Verdicts: `AC` accepted, `WA` wrong answer, `TLE` time limit exceeded, `MLE`
memory limit exceeded, `RE` runtime error, `CE` compilation error.

Supported languages: C, C++17, Java 17 (class must be `Main`), Python 3, JavaScript (Node).

Submissions go through a bounded in-process queue: `MAX_CONCURRENT_JOBS`
(default: CPU cores) run at once, up to `MAX_QUEUED_JOBS` (default 200) wait,
and anything beyond that gets an immediate `503` instead of piling up.

The judge runs untrusted code. In Docker it runs as a non-root user with all
capabilities dropped and a process limit, and `docker-compose.prod.yml` only
binds its port to localhost. It is not a full sandbox: submissions still share
the container's network and filesystem view. Do not expose port 3002 publicly.

## API Endpoints

### Authentication
- `POST /new/user/register` - Register
- `POST /new/user/signin` - Log in, returns `jwt_token`

Authenticated routes accept `Authorization: Bearer <token>` (or the older `usertoken` header).

### Problems
- `GET /new/problems/problems` - List problems with tags
- `GET /new/problems/problem/:id` - One problem with its two sample test cases
- `POST /new/problems/createProblem` - Create a problem with tags and test cases (auth)
- `POST /new/problems/testcases/:pid` - Add test cases

### Judge
- `POST /new/evaluation/run` - Run code against custom stdin
- `POST /new/evaluation/run/:pid` - Run against a problem's tests, stop at the first failure
- `POST /new/evaluation/submit/:pid` - Judge on every test and record the submission (auth)

### User
- `GET /user/profile` - Profile (auth)
- `GET /user/submission/:pid` - Your submissions for one problem (auth)
- `GET /new/user/submissions` - Your recent submissions with statistics (auth)
- `GET /new/user/leaderboard`, `GET /new/user/leaderboard-stats` - Rankings

### AI (Google Gemini)
- `POST /ai/gethint`, `POST /ai/find_error` - Hints and code review for a problem
- `POST /internship-ai/*` - Recommendations, resume analysis, cover letter, interview prep, application insights, salary advice

Rate limits per IP per minute: 30 on judge routes, 15 on AI routes, 20 on sign-in and
register (`RATE_LIMIT_EVALUATION`, `RATE_LIMIT_AI`, `RATE_LIMIT_AUTH`). Set
`TRUST_PROXY=1` when the server sits behind nginx or a load balancer.

## Tests and load testing

```bash
cd Compiler && npm test          # judge tests: every language and every verdict

# Throughput and latency of a running judge (compile + 3 tests per submission)
node scripts/loadtest.mjs --url http://localhost:3002 --requests 300 --concurrency 30 --language cpp
```

CI (`.github/workflows/ci.yml`) runs the judge tests, validates the Prisma schema and builds the frontend.

## Development Notes

- Frontend uses Next.js 15 with App Router
- Backend uses Express.js with ES modules
- Authentication via JWT tokens
- CORS enabled for cross-origin requests
- All API calls centralized in `/client/lib/api.ts`

## Production Deployment

1. Build the frontend: `cd client && npm run build`
2. Start the backend: `cd server && npm start`
3. Configure environment variables for production
4. Set up database migrations with Prisma

## Troubleshooting

### Connection Issues
- Ensure backend is running on port 8000
- Check environment variables are set correctly
- Verify CORS configuration

### Database Issues
- Run `npx prisma generate` in server directory
- Run `npx prisma migrate dev` for development migrations

### Build Issues
- Clear node_modules and reinstall dependencies
- Check Node.js version compatibility
