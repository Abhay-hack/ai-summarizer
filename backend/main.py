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
        import yt_dlp
        from io import StringIO
        import webvtt  # pip install webvtt-py for VTT parsing
        import os

        # Helper: Parse VTT to transcript_data list [{'text': str, 'start': float, 'duration': float}]
        def parse_vtt_to_transcript(vtt_content):
            if not vtt_content.strip():
                raise ValueError("Empty VTT content")
            vtt = webvtt.read_buffer(StringIO(vtt_content))
            transcript_data = []
            for caption in vtt:
                start = caption.start_in_seconds
                duration = caption.end_in_seconds - start
                text = caption.text.strip().replace('\n', ' ')  # Flatten multi-line
                transcript_data.append({'text': text, 'start': start, 'duration': duration})
            if not transcript_data:
                raise ValueError("No captions in VTT")
            return transcript_data

        # Extract video ID from YouTube URL
        match = re.search(r"(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})", input.url)
        if not match:
            print(f"[DEBUG] Invalid URL: {input.url}")
            return {"error": "Invalid YouTube URL"}
        video_id = match.group(1)
        print(f"[DEBUG] Extracted Video ID: {video_id}")

        # Probe for available subs without download
        ydl_opts_probe = {
            'skip_download': True,
            'quiet': True,
            'no_warnings': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts_probe) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            manual_subs = info.get('subtitles', {}).get('en', [])
            auto_subs = info.get('automatic_captions', {}).get('en', [])

        if not manual_subs and not auto_subs:
            return {"error": "No English subtitles available"}

        sub_type = 'manual' if manual_subs else 'auto'
        video_lang = 'en'  # Set language
        print(f"[DEBUG] Using {sub_type} English subtitles")

        # Download only the subtitle (VTT format)
        ydl_opts = {
            'skip_download': True,  # No video
            'writesubtitles': bool(manual_subs),
            'writeautomaticsubs': bool(auto_subs),
            'subtitleslangs': ['en'],
            'sub_format': 'vtt',  # Force VTT
            'outtmpl': '%(id)s.%(ext)s',  # Simple template; we'll search for result
            'quiet': True,
            'no_warnings': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([f"https://www.youtube.com/watch?v={video_id}"])

        # Find the downloaded VTT file dynamically
        files = [f for f in os.listdir('.') if f.startswith(video_id) and f.endswith('.vtt')]
        if not files:
            # Fallback search for any .vtt with 'en' (in case title-based naming)
            files = [f for f in os.listdir('.') if '.en.' in f and f.endswith('.vtt')]
        files.sort(key=len)  # Prefer shortest (most exact) match
        if not files:
            raise FileNotFoundError(f"No VTT file created for {video_id}")
        filename = files[0]
        print(f"[DEBUG] Found subtitle file: {filename}")

        with open(filename, 'r', encoding='utf-8') as f:
            vtt_content = f.read()
        os.remove(filename)  # Clean up temp file

        transcript_data = parse_vtt_to_transcript(vtt_content)
        print(f"[DEBUG] Fetched {sub_type} English transcript ({len(transcript_data)} segments)")

        if not transcript_data:
            print(f"[DEBUG] Empty transcript data for video {video_id}")
            return {"error": "No transcript data found."}

        # Segregate into 5-min segments using timestamps (unchanged)
        segments = []
        current_segment = []
        segment_start = 0
        segment_duration = 300  # 5 minutes in seconds

        for t in transcript_data:
            current_time = t['start']
            if current_time >= segment_start + segment_duration or not current_segment:
                # Start new segment
                if current_segment and len(current_segment) > 0:
                    segment_text = " ".join([s['text'] for s in current_segment])
                    if segment_text.strip():
                        chunk_summaries = summarize_chunks(segment_text)
                        segment_end = segment_start + segment_duration
                        segments.append({
                            "start_time": format_time(segment_start),
                            "end_time": format_time(segment_end),
                            "summary": " ".join(chunk_summaries)
                        })
                current_segment = [t]
                segment_start = int(current_time // segment_duration * segment_duration)
            else:
                current_segment.append(t)

        # Last segment
        if current_segment and len(current_segment) > 0:
            segment_text = " ".join([s['text'] for s in current_segment])
            if segment_text.strip():
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