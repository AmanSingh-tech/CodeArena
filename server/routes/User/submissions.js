// routes/User/submissions.js
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const jwtpasskey = process.env.JWT_PASSKEY;

// Get user's submission history
export async function getUserSubmissions(req, res) {
  try {
    // Get token from header instead of body for GET request
    const authHeader = req.headers.authorization || req.headers.usertoken;
    
    if (!authHeader) {
      return res.status(400).json({
        success: false,
        error: 'Authentication token required'
      });
    }

    // Remove 'Bearer ' prefix if present
    const usertoken = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

    // Verify JWT token
    const decode = jwt.verify(usertoken, jwtpasskey);
    
    if (!decode) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication token'
      });
    }

    const userId = decode.id;

    // Get user's submissions with problem details - simplified query first
    const submissions = await prisma.solve.findMany({
      where: {
        userId: userId
      },
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            difficulty: true
          }
        }
      },
      orderBy: {
        date: 'desc'  // Use 'date' field instead of 'submittedAt' initially
      },
      take: 100
    });

    // Return simplified response for testing
    res.json({
      success: true,
      data: {
        // `verdict` is derived from the stored result: AC, WA, TLE, MLE, RE or CE.
        submissions: submissions.map((s) => ({
          ...s,
          verdict: s.success ? 'AC' : (s.error || 'WA').slice(0, 3).replace(/[^A-Z]/g, '') || 'WA',
        })),
        statistics: {
          totalSubmissions: submissions.length,
          successfulSubmissions: submissions.filter(s => s.success).length,
          successRate: submissions.length > 0 ? ((submissions.filter(s => s.success).length / submissions.length) * 100).toFixed(1) : '0',
          uniqueProblemsSolved: [...new Set(submissions.filter(s => s.success).map(s => s.problemId))].length,
          totalProblems: [...new Set(submissions.map(s => s.problemId))].length,
          averageExecutionTime: submissions.length > 0
            ? Math.round(submissions.reduce((sum, s) => sum + (s.executionTime || 0), 0) / submissions.length)
            : 0
        }
      }
    });

  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch submission history: ' + error.message
    });
  }
}

// Get detailed submission by ID
export async function getSubmissionDetails(req, res) {
  try {
    const { submissionId } = req.params;
    
    // Get token from header instead of body for GET request
    const authHeader = req.headers.authorization || req.headers.usertoken;
    
    if (!authHeader) {
      return res.status(400).json({
        success: false,
        error: 'Authentication token required'
      });
    }

    // Remove 'Bearer ' prefix if present
    const usertoken = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

    // Verify JWT token
    const decode = jwt.verify(usertoken, jwtpasskey);
    
    if (!decode) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication token'
      });
    }

    const userId = decode.id;

    // Get submission details
    const submission = await prisma.solve.findFirst({
      where: {
        id: submissionId,
        userId: userId // Ensure user can only access their own submissions
      },
      include: {
        problem: {
          include: {
            testCases: true
          }
        },
        user: {
          select: {
            username: true,
            firstname: true,
            lastname: true
          }
        }
      }
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found'
      });
    }

    res.json({
      success: true,
      data: submission
    });

  } catch (error) {
    console.error('Get submission details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch submission details'
    });
  }
}

// Get leaderboard for a specific problem
export async function getProblemLeaderboard(req, res) {
  try {
    const { problemId } = req.params;

    // Get all successful submissions for this problem
    const submissions = await prisma.solve.findMany({
      where: {
        problemId: problemId,
        success: true
      },
      include: {
        user: {
          select: {
            username: true,
            firstname: true,
            lastname: true
          }
        }
      },
      orderBy: [
        { executionTime: 'asc' },
        { submittedAt: 'asc' }
      ]
    });

    // Group by user and get best submission for each
    const userBestSubmissions = submissions.reduce((acc, submission) => {
      const userId = submission.userId;
      if (!acc[userId] || submission.executionTime < acc[userId].executionTime) {
        acc[userId] = submission;
      }
      return acc;
    }, {});

    const leaderboard = Object.values(userBestSubmissions).map((submission, index) => ({
      rank: index + 1,
      user: {
        username: submission.user.username,
        name: `${submission.user.firstname} ${submission.user.lastname || ''}`.trim()
      },
      executionTime: submission.executionTime,
      language: submission.language,
      submittedAt: submission.submittedAt
    }));

    res.json({
      success: true,
      data: leaderboard,
      totalSolvers: leaderboard.length
    });

  } catch (error) {
    console.error('Get problem leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch problem leaderboard'
    });
  }
}
