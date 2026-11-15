import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import getTestCases from '../Functions/get_testcases.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();


const route = Router();
const prisma = new PrismaClient();

// Get all problems
route.get('/problems', async (req, res) => {
    try {
        const problems = await prisma.problem.findMany({
            include: {
              tags: {
                include: {
                  tag: true, // this includes tagName
                },
              },
            },
          });

        res.json({
            success: true,
            problems: problems
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get a single problem by ID
route.get('/problem/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const problem = await prisma.problem.findUnique({
            where: { id: id },
            include: {
                testCases: {
                  orderBy:{
                    id:'asc'
                  },
                  take:2  // Only first 2 for problem preview
                },
                comments: true,
                tags:{
                  include:{
                    tag:true
                  }
                }
            }
        });

        if (!problem) {
            return res.status(404).json({
                success: false,
                message: 'Problem not found'
            });
        }

        res.json({
            success: true,
            problem: problem
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get a single problem with all test cases (for solving)
route.get('/problem/:id/full', async (req, res) => {
    const { id } = req.params;

    try {
        const problem = await prisma.problem.findUnique({
            where: { id: id },
            include: {
                testCases: {
                  orderBy:{
                    id:'asc'
                  }
                  // No limit - get all test cases
                },
                comments: true,
                tags:{
                  include:{
                    tag:true
                  }
                }
            }
        });

        if (!problem) {
            return res.status(404).json({
                success: false,
                message: 'Problem not found'
            });
        }

        res.json({
            success: true,
            problem: problem
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// Create a problem (only for admins)
route.post('/problems', async (req, res) => {
  const { title, description , difficulty , constraint="" , inputtype="" } = req.body;

  if (!title || !description || !difficulty ) {
    return res.json({
      success: false,
      message: "Send both Title and Description"
    });
  }

  try {
    const createdProblem = await prisma.problem.create({
      data: {
        title: title,
        description: description,
        difficulty:difficulty,
        constraints:constraint,
        inputtype:inputtype
      }
    });

    res.json({
      success: true,
      message: "Problem created successfully",
      problem: createdProblem
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating problem",
      error: error.message
    });
  }
});

// Create a problem with test cases and tags (used by the "New problem" dialog)
route.post('/createProblem', async (req, res) => {
  const { title, description, difficulty, tags = [], testCases = [] } = req.body;
  const rawToken = req.headers.authorization || req.headers.usertoken;

  if (!title || !description || !difficulty) {
    return res.status(400).json({
      success: false,
      message: "Title, description, and difficulty are required"
    });
  }

  if (!rawToken || !rawToken.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: "Authentication token required"
    });
  }

  try {
    jwt.verify(rawToken.slice(7), process.env.JWT_PASSKEY);
  } catch {
    return res.status(401).json({
      success: false,
      message: "Please log in again"
    });
  }

  // Stored as Easy / Medium / Hard, the form the rest of the app compares against.
  const level = String(difficulty).trim().toLowerCase();
  const normalizedDifficulty = level === 'hard' ? 'Hard' : level === 'medium' ? 'Medium' : 'Easy';

  const validTestCases = (Array.isArray(testCases) ? testCases : [])
    .filter((tc) => tc && typeof tc.output === 'string' && tc.output.trim() !== '')
    .map((tc) => ({ input: String(tc.input ?? ''), output: tc.output }));

  const tagNames = [...new Set(
    (Array.isArray(tags) ? tags : [])
      .map((t) => String(t).trim().toLowerCase())
      .filter(Boolean)
  )];

  try {
    const createdProblem = await prisma.$transaction(async (tx) => {
      const problem = await tx.problem.create({
        data: {
          title: title.trim(),
          description: description.trim(),
          difficulty: normalizedDifficulty,
          constraints: "",
          inputtype: ""
        }
      });

      if (validTestCases.length > 0) {
        await tx.testCase.createMany({
          data: validTestCases.map((tc) => ({ ...tc, problemId: problem.id }))
        });
      }

      for (const tagName of tagNames) {
        let tag = await tx.problem_Tags.findFirst({ where: { tagName } });
        if (!tag) {
          tag = await tx.problem_Tags.create({ data: { tagName } });
        }
        await tx.problemToTags.create({ data: { pid: problem.id, tid: tag.id } });
      }

      return problem;
    });

    const completeNewProblem = await prisma.problem.findUnique({
      where: { id: createdProblem.id },
      include: {
        testCases: { orderBy: { id: 'asc' } },
        tags: { include: { tag: true } }
      }
    });

    res.status(201).json({
      success: true,
      message: "Problem created successfully with test cases and tags",
      problem: completeNewProblem
    });

  } catch (error) {
    console.error('Create problem error:', error);
    res.status(500).json({
      success: false,
      message: "Error creating problem",
      error: error.message
    });
  }
});




// Comments

// Create Comment
route.post('/comments', async (req, res) => {
  const { title, body, problemId, userId } = req.body;

  if (!title || !body || !problemId || !userId) {
    return res.status(400).json({
      success: false,
      message: "Please provide title, body, problemId, and userId"
    });
  }

  try {
    const comment = await prisma.comment.create({
      data: {
        title,
        body,
        problemId,
        userId
      }
    });

    res.json({
      success: true,
      message: "Comment created successfully",
      comment
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating comment",
      error: error.message
    });
  }
});


// get comments
route.get('/comments/problem/:problemId', async (req, res) => {
  const { problemId } = req.params;

  try {
    const comments = await prisma.comment.findMany({
      where: { problemId },
      include: { user: true }
    });

    res.json({
      success: true,
      comments
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// create Test Cases
route.post('/testcases/:pid', async (req, res) => {
  const { pid } = req.params;
  const { testcases } = req.body;

  // Validate inputs
  if (!pid || !Array.isArray(testcases) || testcases.length === 0) {
    return res.json({
      success: false,
      msg: "Send a valid pid and an array of testcases"
    });
  }

  // Check each testcase has input and output
  const invalidCase = testcases.find(tc => !tc.input || !tc.output);
  if (invalidCase) {
    return res.json({
      success: false,
      msg: "Each testcase must have 'input' and 'output'"
    });
  }

  try {
    // Check if pid exists
    const check_pid = await prisma.problem.findFirst({
      where: { id: pid }
    });

    if (!check_pid) {
      return res.json({
        success: false,
        msg: "P_id does not exist or is invalid"
      });
    }

    // Map testcases to include problemId
    const dataToInsert = testcases.map(tc => ({
      input: tc.input,
      output: tc.output,
      problemId: pid
    }));

    // Insert testcases in bulk
    const created = await prisma.testCase.createMany({
      data: dataToInsert
    });

    return res.json({
      success: true,
      msg: "Test cases added successfully",
      count: created.count
    });

  } catch (error) {
    // console.error(error);
    return res.json({
      success: false,
      msg: "Error creating test cases",
      error:error.message
    });
  }
});

route.get('/testcases/:pid',async (req,res)=>{

  const { pid }=req.params

    if(!pid){
      return res.json({
        success:false,
        msg:"Send Problem Id"
      })
    }

    try {
      const result=await getTestCases(pid);      
      return res.json(result);
    } catch (error) {
      return res.json({
        success:false,
        msg:"Error Creating Test Cases"
      })
    }


})


export default route;
