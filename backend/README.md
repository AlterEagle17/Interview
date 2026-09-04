# InterviewAI Backend

FastAPI backend for the InterviewAI frontend.

## Run locally

Create a virtual environment, install requirements, then run:

    uvicorn main:app --reload

API:
- GET /
- GET /api/health

The Groq API key belongs in an environment variable named GROQ_API_KEY.
Do not commit .env or any real API key to GitHub.
