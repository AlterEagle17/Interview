from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="InterviewAI Backend",
    version="1.0.0"
)

# During development we allow the Vercel frontend to call this API.
# After deployment, replace "*" with your exact Vercel domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
