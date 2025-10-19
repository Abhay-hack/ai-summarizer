import os
import requests
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from utils import split_text  # Import your helper function
from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound
from youtube_transcript_api._errors import TranscriptsDisabled, VideoUnavailable

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

class YoutubeInput(BaseModel):
    url: str

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

            if isinstance(result, list) and len(result) > 0 and "summary_text" in result[0]:
                summaries.append(result[0]["summary_text"])
            elif isinstance(result, dict) and "error" in result:
                return {"error": result["error"]}
            else:
                return {"error": f"Unexpected response: {result}"}

        final_summary = " ".join(summaries)
        return {"summary": final_summary}

    except Exception as e:
        return {"error": str(e)}

@app.post("/youtube-summarize")
def summarize_youtube(input: YoutubeInput):
    try:
        import re

        # Extract video ID from YouTube URL
        match = re.search(r"(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})", input.url)
        if not match:
            print(f"[DEBUG] Invalid URL: {input.url}")
            return {"error": "Invalid YouTube URL"}
        video_id = match.group(1)
        print(f"[DEBUG] Extracted Video ID: {video_id}")

        # Fetch transcript (with English priority + fallback to any available)
        transcript_data = None
        video_lang = 'en'  # Default assumption
        ytt_api = YouTubeTranscriptApi()
        try:
            # Try English first
            transcript_data = ytt_api.fetch(video_id, languages=['en'])
            video_lang = 'en'
        except NoTranscriptFound:
            print(f"[DEBUG] No English transcript; listing available for fallback")
            try:
                transcript_list = ytt_api.list_transcripts(video_id)
                if transcript_list:
                    fallback_transcript = transcript_list.find_transcript([])  # Empty list = any/default
                    transcript_data = fallback_transcript.fetch()
                    video_lang = fallback_transcript.language_code
                    print(f"[DEBUG] Fetched fallback in language: {video_lang}")
                else:
                    raise NoTranscriptFound("No transcripts at all")
            except Exception as list_e:
                print(f"[DEBUG] Failed to list/fallback: {list_e}")
                return {"error": "No transcripts available in any language."}
        except (TranscriptsDisabled, VideoUnavailable) as e:
            print(f"[DEBUG] {type(e).__name__} for video {video_id}")
            return {"error": f"Transcripts disabled or video unavailable: {str(e)}"}
        except Exception as e:
            print(f"[DEBUG] Other error fetching transcript: {e}")
            return {"error": f"Failed to fetch transcript: {str(e)}"}

        if not transcript_data:
            print(f"[DEBUG] Empty transcript for video {video_id}")
            return {"error": "No transcript data found."}

        # Segregate into 5-min segments using timestamps
        segments = []
        current_segment = []
        segment_start = 0
        segment_duration = 300  # 5 minutes in seconds

        for t in transcript_data:
            current_time = t.start
            if current_time >= segment_start + segment_duration or not current_segment:
                # Start new segment
                if current_segment:
                    # Summarize previous
                    segment_text = " ".join([s.text for s in current_segment])
                    chunk_summaries = summarize_chunks(segment_text)
                    segment_end = segment_start + segment_duration
                    segments.append({
                        "start_time": format_time(segment_start),
                        "end_time": format_time(segment_end),
                        "summary": " ".join(chunk_summaries)
                    })
                current_segment = [t]
                segment_start = int(current_time // segment_duration * segment_duration)  # Align to multiples of 5min
            else:
                current_segment.append(t)

        # Last segment
        if current_segment:
            segment_text = " ".join([s.text for s in current_segment])
            chunk_summaries = summarize_chunks(segment_text)
            segment_end = segment_start + segment_duration
            segments.append({
                "start_time": format_time(segment_start),
                "end_time": format_time(segment_end),
                "summary": " ".join(chunk_summaries)
            })

        print(f"[DEBUG] Created {len(segments)} segments (lang: {video_lang})")
        return {"segments": segments, "original_lang": video_lang}

    except Exception as e:
        print(f"[DEBUG] General exception: {e}")
        return {"error": str(e)}

# Helper: Format seconds to MM:SS
def format_time(seconds):
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins}:{secs:02d}"

# Helper: Summarize text chunks (extracted from your existing loop)
def summarize_chunks(text, max_len=1000):
    chunks = split_text(text, max_len=max_len)
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
        if isinstance(result, list) and len(result) > 0 and "summary_text" in result[0]:
            summaries.append(result[0]["summary_text"])
    return summaries