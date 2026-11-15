import express from 'express';
import dotenv from 'dotenv';
import userauthroute from './routes/User/auth.js';
import problemsroute from './routes/Problems/problem.js';
import userProfileroute from './routes/User/profile.js';
import problemsolveroute from './routes/Run and Submit/run_and_submit.js'
import AiResponseroute from './routes/AI/ai_response.js'
import InternshipAiroute from './routes/AI/internship_ai.js'
import { getLeaderboard, getLeaderboardStats } from './routes/User/leaderboard.js';
import { getUserSubmissions, getSubmissionDetails, getProblemLeaderboard } from './routes/User/submissions.js';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001; 

// Behind a reverse proxy (nginx / a load balancer) set TRUST_PROXY=1 so rate
// limits are applied per client IP rather than per proxy.
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
}

app.use(cors());
app.use(express.json({ limit: '1mb' })); // parse incoming JSON requests

// Per-IP rate limits for the expensive routes: code execution, Gemini calls and
// credential checks. Limits are per minute and can be tuned through env vars.
const limiter = (max, message) => rateLimit({
  windowMs: 60 * 1000,
  limit: max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { success: false, msg: message, error: message, err: message },
});

const evaluationLimiter = limiter(Number(process.env.RATE_LIMIT_EVALUATION) || 30, 'Too many runs, slow down for a moment');
const aiLimiter = limiter(Number(process.env.RATE_LIMIT_AI) || 15, 'Too many AI requests, try again in a minute');
const authLimiter = limiter(Number(process.env.RATE_LIMIT_AUTH) || 20, 'Too many attempts, try again in a minute');


app.get('/',(req,res)=>{  

  res.send("<h1>HELLO FROM CODEARENA SERVER</h1>")
})
app.use('/new/user/signin', authLimiter);
app.use('/new/user/register', authLimiter);
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/new/user', userauthroute);
app.use('/user',userProfileroute)
app.use('/new/problems',problemsroute);
app.use('/new/evaluation', evaluationLimiter, problemsolveroute);
app.use('/ai', aiLimiter, AiResponseroute);
app.use('/internship-ai', aiLimiter, InternshipAiroute);

// Leaderboard routes
app.get('/new/user/leaderboard', getLeaderboard);
app.get('/new/user/leaderboard-stats', getLeaderboardStats);

// Submission routes
app.get('/new/user/submissions', getUserSubmissions);
app.get('/new/user/submission/:submissionId', getSubmissionDetails);
app.get('/new/user/leaderboard/problem/:problemId', getProblemLeaderboard);

// Test endpoint
app.get('/test-submissions', async (req, res) => {
  try {
    console.log('Testing submissions endpoint...');
    res.json({ success: true, message: 'Submissions endpoint test successful' });
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
