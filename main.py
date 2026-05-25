from dotenv import load_dotenv
load_dotenv()  # Initialize environment variables at system startup
import os
from fastapi.templating import Jinja2Templates

# Change your old templates line to look exactly like this:
current_dir = os.path.dirname(os.path.abspath(__file__))
templates = Jinja2Templates(directory=os.path.join(current_dir, "templates"))
import os
import uuid
import time
from fastapi import FastAPI, BackgroundTasks, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from engine import secure_repurpose_pipeline, validate_youtube_url_securely

app = FastAPI(title="VectoText Backend Engine", version="1.1.0")

# Setup routing for static assets and HTML layout templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Configure CORS policies for frontend connectivity
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type", "Authorization"],
)

# Connect to database ledger instances
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Configuration Error: Missing database environment credentials.")

supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- In-Memory Application Rate Limiting ---
# Maps visitor IP hosts to a dynamic timestamp log array
USAGE_TRACKER_LEDGER = {}
MAX_RUNS_PER_HOUR = 5
COOLDOWN_WINDOW_SECONDS = 3600

class RepurposeRequest(BaseModel):
    video_url: str
    strategy: str = "full_suite"

def execute_asynchronous_secure_job(raw_url: str, target_job_uuid: str, strategy: str):
    """Background task queue handler to process files and update database job records."""
    try:
        markdown_result = secure_repurpose_pipeline(raw_url, target_job_uuid, strategy)
        
        supabase_client.table("repurpose_jobs").update({
            "status": "completed",
            "result_text": markdown_result
        }).eq("id", str(target_job_uuid)).execute()
        
    except Exception as e:
        supabase_client.table("repurpose_jobs").update({
            "status": "failed",
            "error_log": f"Processing failure: {str(e)}"
        }).eq("id", str(target_job_uuid)).execute()

# --- Page Render Endpoints ---
    @app.get("/")
    async def read_root(request: Request):
     return templates.TemplateResponse(request=request, name="index.html", context={"request": request})

# --- Core Business API Routes ---
@app.post("/api/repurpose", status_code=202)
async def request_generation_task(request: Request, payload: RepurposeRequest, background_tasks: BackgroundTasks):
    clean_url = payload.video_url.strip()
    chosen_strategy = payload.strategy.strip()
    
    # Fetch client IP address to evaluate rate limiter constraints
    client_ip = request.client.host if request.client else "unknown_node"
    current_timestamp = time.time()
    
    if client_ip not in USAGE_TRACKER_LEDGER:
        USAGE_TRACKER_LEDGER[client_ip] = []
        
    # Drop usage logs older than 1 hour to reset the rate limiter corridor cleanly
    USAGE_TRACKER_LEDGER[client_ip] = [
        ts for ts in USAGE_TRACKER_LEDGER[client_ip] 
        if current_timestamp - ts < COOLDOWN_WINDOW_SECONDS
    ]
    
    # Enforce request boundary gates
    if len(USAGE_TRACKER_LEDGER[client_ip]) >= MAX_RUNS_PER_HOUR:
        oldest_request_time = USAGE_TRACKER_LEDGER[client_ip][0]
        remaining_cooldown = int(COOLDOWN_WINDOW_SECONDS - (current_timestamp - oldest_request_time))
        minutes_left = max(1, remaining_cooldown // 60)
        
        raise HTTPException(
            status_code=429, 
            detail=f"Rate limit exceeded. Try again in {minutes_left} minutes."
        )
    
    # Defensive Input Regex Shielding Check
    if not validate_youtube_url_securely(clean_url):
        raise HTTPException(status_code=400, detail="Invalid YouTube URL format.")
    
    generated_job_uuid = uuid.uuid4()
    
    try:
        supabase_client.table("repurpose_jobs").insert({
            "id": str(generated_job_uuid),
            "video_url": clean_url,
            "status": "processing"
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database logger transaction error: {str(e)}")
        
    # Append the verified successful transaction timestamp into the usage register array
    USAGE_TRACKER_LEDGER[client_ip].append(current_timestamp)
    
    # Fire off the heavy asset pipeline inside a decoupled thread worker
    background_tasks.add_task(execute_asynchronous_secure_job, clean_url, generated_job_uuid, chosen_strategy)
    
    return {
        "status": "queued",
        "job_id": str(generated_job_uuid)
    }

@app.get("/api/status/{job_id}")
async def retrieve_processing_status(job_id: str):
    try:
        validated_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job ID format.")
        
    db_query = supabase_client.table("repurpose_jobs").select("status", "result_text", "error_log").eq("id", str(validated_uuid)).execute()
    
    if not db_query.data:
        raise HTTPException(status_code=404, detail="Job ID not found in database registry.")
        
    return db_query.data[0]