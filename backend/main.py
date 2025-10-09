import os
import requests
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from utils import split_text  # Import your helper function

# Load environment variables
load_dotenv()
HF_API_TOKEN = os.getenv("HF_API_TOKEN")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")  # default to local dev

# Hugging Face Inference API (bart-large-cnn)
HF_API_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-cnn"

# Initialize FastAPI app
app = FastAPI(title="AI-Powered Summarizer")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],  # frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Preflight handler for OPTIONS requests
@app.options("/{rest_of_path:path}")
async def preflight_handler(rest_of_path: str, request: Request):
    response = JSONResponse()
    response.headers["Access-Control-Allow-Origin"] = FRONTEND_URL
    response.headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

# Request model
class TextInput(BaseModel):
    text: str

@app.get("/")
def root():
    return {"message": "AI Summarizer is running with Hugging Face Inference API!"}

@app.post("/summarize")
def summarize_text(input: TextInput):
    try:
        chunks = split_text(input.text, max_len=1000)
        summaries = []

        for chunk in chunks:
            payload = {
                "inputs": chunk,
                "parameters": {"max_length": 130, "min_length": 30, "do_sample": False},
            }
            headers = {"Authorization": f"Bearer {HF_API_TOKEN}"}

            response = requests.post(HF_API_URL, headers=headers, json=payload, timeout=60)
            response.raise_for_status()
            result = response.json()

            if isinstance(result, list) and "summary_text" in result[0]:
                summaries.append(result[0]["summary_text"])
            elif isinstance(result, dict) and "error" in result:
                return {"error": result["error"]}
            else:
                return {"error": f"Unexpected response: {result}"}

        final_summary = " ".join(summaries)
        return {"summary": final_summary}

    except Exception as e:
        return {"error": str(e)}
