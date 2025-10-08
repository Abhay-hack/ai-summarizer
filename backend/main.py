# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline
from utils import split_text  # Import your helper function

# Initialize FastAPI app
app = FastAPI(title="AI-Powered Summarizer")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load summarization pipeline (better model)
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")

# Request model
class TextInput(BaseModel):
    text: str

@app.get("/")
def root():
    return {"message": "AI Summarizer is running!"}

@app.post("/summarize")
def summarize_text(input: TextInput):
    try:
        # Split text into chunks if too long
        chunks = split_text(input.text, max_len=1000)

        # Summarize each chunk
        summaries = [
            summarizer(chunk, max_length=130, min_length=30, do_sample=False)[0]["summary_text"]
            for chunk in chunks
        ]

        # Combine all summaries
        final_summary = " ".join(summaries)
        return {"summary": final_summary}

    except Exception as e:
        return {"error": str(e)}
