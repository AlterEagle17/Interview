import os
import json
from concurrent.futures import ThreadPoolExecutor

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq


# =========================================================
# ENVIRONMENT
# =========================================================

load_dotenv()

groq_api_key = os.getenv("GROQ_API_KEY")

if not groq_api_key:
    raise RuntimeError("GROQ_API_KEY is missing")

groq_client = Groq(api_key=groq_api_key)


# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(
    title="InterviewAI Backend",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# BASIC ROUTES
# =========================================================

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "InterviewAI Backend"
    }


@app.get("/api/health")
def health():
    return {
        "status": "healthy"
    }


# =========================================================
# TEST GROQ
# =========================================================

@app.get("/api/test-ai")
def test_ai():

    response = groq_client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "user",
                "content": "Say hello to InterviewAI in one short sentence."
            }
        ]
    )

    return {
        "success": True,
        "response": response.choices[0].message.content
    }


# =========================================================
# START INTERVIEW
# =========================================================

class InterviewStartRequest(BaseModel):
    company: str
    role: str
    resume: str


@app.post("/api/start-interview")
def start_interview(data: InterviewStartRequest):

    prompt = f"""
You are an AI interviewer.

Company: {data.company}
Role: {data.role}

Candidate Resume:
{data.resume}

Generate the first interview question for this candidate.

Rules:
- Ask only ONE question.
- Make it relevant to the candidate's role and resume.
- Start with a professional but friendly question.
- Do not provide the answer.
- Return only the interview question.
"""

    response = groq_client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.7
    )

    return {
        "success": True,
        "question": response.choices[0].message.content
    }


# =========================================================
# MULTI-AGENT ANSWER EVALUATION
# =========================================================

class AnswerEvaluationRequest(BaseModel):
    company: str
    role: str
    resume: str
    question: str
    answer: str


agents = {

    "Sarah": (
        "You are Sarah, an HR Lead. "
        "Evaluate communication, confidence, behavioral quality "
        "and professionalism."
    ),

    "Alex": (
        "You are Alex, a Systems Architect. "
        "Evaluate system design, architecture, scalability "
        "and problem solving."
    ),

    "Marcus": (
        "You are Marcus, a Tech Lead. "
        "Evaluate technical accuracy, coding knowledge "
        "and practical engineering skills."
    )
}


def evaluate_with_agent(agent_name, instruction, data):

    prompt = f"""
{instruction}

Candidate information:

Company: {data.company}
Role: {data.role}

Resume:
{data.resume}

Interview Question:
{data.question}

Candidate Answer:
{data.answer}

Evaluate the candidate.

Return ONLY valid JSON in exactly this format:

{{
    "agent": "{agent_name}",
    "score": 0,
    "feedback": "short constructive feedback"
}}

Score must be between 0 and 100.
"""

    response = groq_client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.3
    )

    return response.choices[0].message.content


@app.post("/api/evaluate-answer")
def evaluate_answer(data: AnswerEvaluationRequest):

    with ThreadPoolExecutor(max_workers=3) as executor:

        futures = [
            executor.submit(
                evaluate_with_agent,
                agent_name,
                instruction,
                data
            )
            for agent_name, instruction in agents.items()
        ]

        raw_evaluations = [
            future.result()
            for future in futures
        ]

    evaluations = []

    for result in raw_evaluations:

        try:

            parsed_result = json.loads(result)

            evaluations.append(parsed_result)

        except json.JSONDecodeError:

            evaluations.append({
                "agent": "Unknown",
                "score": 0,
                "feedback": result
            })

    if evaluations:

        average_score = round(
            sum(
                item["score"]
                for item in evaluations
            ) / len(evaluations),
            1
        )

    else:

        average_score = 0

    return {
        "success": True,
        "evaluations": evaluations,
        "average_score": average_score
    }


# =========================================================
# NEXT QUESTION
# =========================================================

class NextQuestionRequest(BaseModel):
    company: str
    role: str
    resume: str
    previous_question: str
    previous_answer: str
    average_score: float


@app.post("/api/next-question")
def next_question(data: NextQuestionRequest):

    if data.average_score < 50:

        difficulty = "easier and focused on fundamentals"

    elif data.average_score < 75:

        difficulty = "moderate difficulty"

    else:

        difficulty = "more challenging and advanced"

    prompt = f"""
You are an autonomous AI interviewer.

Company:
{data.company}

Role:
{data.role}

Candidate Resume:
{data.resume}

Previous Question:
{data.previous_question}

Candidate's Previous Answer:
{data.previous_answer}

Previous Interview Score:
{data.average_score}/100

Generate the NEXT interview question.

Difficulty:
{difficulty}

Rules:
- Ask exactly ONE question.
- Do not repeat the previous question.
- The question must be relevant to the candidate's role and resume.
- Adapt the question based on the previous answer and score.
- If the score is low, test fundamentals and understanding.
- If the score is high, test deeper reasoning and advanced knowledge.
- Return ONLY the question.
"""

    response = groq_client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.7
    )

    return {
        "success": True,
        "next_question": response.choices[0].message.content
    }
