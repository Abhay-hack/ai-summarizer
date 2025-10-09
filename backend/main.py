import os
import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from utils import split_text  # Import your helper function

# Load environment variables
load_dotenv()
HF_API_TOKEN = os.getenv("HF_API_TOKEN")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Hugging Face Inference API (bart-large-cnn)
HF_API_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-cnn"

# Initialize FastAPI app
app = FastAPI(title="AI-Powered Summarizer")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],  # Use frontend URL from .env
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request model
class TextInput(BaseModel):
    text: str

@app.get("/")
def root():
    return {"message": "AI Summarizer is running with Hugging Face Inference API!"}

@app.post("/summarize")
def summarize_text(input: TextInput):
    try:
        # Split text into chunks if too long
        chunks = split_text(input.text, max_len=1000)
        summaries = []

        for chunk in chunks:
            payload = {
                "inputs": chunk,
                "parameters": {"max_length": 130, "min_length": 30, "do_sample": False},
            }
            headers = {"Authorization": f"Bearer {HF_API_TOKEN}"}

            response = requests.post(HF_API_URL, headers=headers, json=payload)
            response.raise_for_status()
            result = response.json()

            if isinstance(result, list) and "summary_text" in result[0]:
                summaries.append(result[0]["summary_text"])
            else:
                return {"error": f"Unexpected response: {result}"}

        final_summary = " ".join(summaries)
        return {"summary": final_summary}

    except Exception as e:
        return {"error": str(e)}
