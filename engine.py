import os
import re
import random
import string
import time
from google import genai
from google.genai import types

# Initialize the Gemini API client
client = genai.Client()

def validate_youtube_url_securely(url: str) -> bool:
    """
    Validates the incoming YouTube URL pattern to prevent injection attacks 
    and bad format submissions before they hit our backend download utilities.
    """
    youtube_regex = r'(https?://)?(www\.)?(youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)[a-zA-Z0-9_-]{11}'
    return bool(re.match(youtube_regex, url))

def secure_repurpose_pipeline(video_url: str, job_uuid: str, strategy: str = "full_suite") -> str:
    """
    Core pipeline to extract video audio tracks locally, verify file system stability,
    and manage the GenAI synthesis routing based on user strategy.
    """
    import yt_dlp
    
    # Generate a unique 6-character random suffix to completely avoid filename collisions on disk
    random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    audio_output_filename = f"stream_cache_{job_uuid}_{random_str}"
    target_cache_filepath = f"{audio_output_filename}.m4a"
    
    # Configure yt-dlp to stream the audio directly into our designated m4a cache path
    ydl_opts = {
        'format': 'm4a/bestaudio/best',
        'outtmpl': target_cache_filepath,
        'quiet': True,
        'no_warnings': True,
        'overwrites': True,
    }
    
    try:
        print(f"Starting audio extraction for file: {target_cache_filepath}")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([video_url])
            
        # --- File I/O Synchronization Latch ---
        # Give large video downloads up to 2 minutes to completely finish writing to disk
        print("Verifying file download state and waiting for disk sync...")
        timeout = 120  
        start_time = time.time()
        while not os.path.exists(target_cache_filepath):
            time.sleep(1)
            if time.time() - start_time > timeout:
                raise FileNotFoundError(f"Download monitoring timed out for file: {target_cache_filepath}")
        
        # Short extra buffer to let the OS fully flush its file handles safely
        time.sleep(2)
            
        print("Uploading extracted audio binary to secure cloud sandbox...")
        audio_media_reference = client.files.upload(file=target_cache_filepath)
        
        # --- Prompt Strategy Matrix Router ---
        if strategy == "newsletter":
            system_instruction_prompt = (
                "You are an elite B2B SaaS Technical Copywriter and Growth Marketer. "
                "Analyze the provided audio transcript and transform it into a premium, "
                "high-converting Email Newsletter Brief targeted at CTOs, Developers, and Founders. "
                "Structure your output strictly using the following blueprint format:\n\n"
                "# [SaaS Newsletter Title]\n\n"
                "## Executive Summary\n"
                "[Provide a powerful, high-level 3-sentence summary explaining why this concept matters today.]\n\n"
                "## Core Architectural Takeaways\n"
                "[Extract 3 to 4 technical concepts or workflows detailed in the audio using professional bullet points.]\n\n"
                "## Operational Business Impact\n"
                "[Explain the immediate business ROI or performance value of implementing these techniques.]\n\n"
                "## The Value-Drop Fast Matrix\n"
                "[Create a short Markdown Table summarizing Key Technical Concept vs Enterprise Implementation Difficulty vs Priority Level.]"
            )
        elif strategy == "twitter_thread":
            system_instruction_prompt = (
                "You are an elite viral tech influencer and developer advocate. "
                "Analyze the provided media transcript and rewrite the key architectural insights "
                "into a highly engaging, punchy, 7-to-10 part X (Twitter) Thread breakdown. "
                "Structure your output strictly matching this blueprint profile:\n\n"
                "# 🧵 THE ARCHITECTURAL VALUE THREAD\n\n"
                "### Post 1: The Hook\n"
                "[Write a viral, high-conversion attention hook outlining a massive technical problem and teasing the solution. Do not include emojis or hashtags here.]\n\n"
                "### Post 2: The Core Concept\n"
                "[Introduce the fundamental architectural framework or discovery explained in the video.]\n\n"
                "### Post 3 - Post 8: The Granular Details\n"
                "[Break down the specific code steps, operators, variables, or system tactics one post at a time. Keep sentences short, fast, and packed with high-signal data.]\n\n"
                "### Post 9: The Core Takeaway\n"
                "[Summarize the absolute major technical shift or performance outcome of using this method.]\n\n"
                "### Post 10: Call to Action\n"
                "[Invite the audience to follow for more elite development teardowns, share the thread, or drop their thoughts in the comment section below.]"
            )
        else:
            system_instruction_prompt = (
                "You are an expert technical documentation engineer and senior developer. "
                "Analyze the uploaded media audio track carefully and generate a highly comprehensive, "
                "deep-dive technical textbook blog post in markdown format. Include comprehensive Python code snippets block structures with comments where applicable. "
                "At the very bottom of the document, append a section divider `---` followed by "
                "exactly 3 distinct professional LinkedIn thread drafts."
            )
            
        print(f"Initializing Gemini content synthesis under strategy rule: '{strategy}'...")
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[audio_media_reference, "Execute processing strategy according to your operational instructions."],
            config=types.GenerateContentConfig(
                system_instruction=system_instruction_prompt,
                temperature=0.2  # Low temperature forces exact technical precision and prevents creative drift
            )
        )
        
        print("Cleaning up remote cloud storage file references...")
        client.files.delete(name=audio_media_reference.name)
        
        return response.text
        
    finally:
        # Guarantee that local temporary storage is always wiped to prevent server disk bloat
        if os.path.exists(target_cache_filepath):
            try:
                os.remove(target_cache_filepath)
                print(f"Temporary cache file '{target_cache_filepath}' successfully cleared.")
            except Exception as e:
                print(f"Handled secondary file cleanup exception: {str(e)}")