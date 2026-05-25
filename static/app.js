/**
 * Frontend Dashboard Controller
 * Manages UI interactions, polling logic, local history arrays, 
 * and particle physics vector lines on the canvas.
 */

let sessionJobCacheMemory = [];

document.getElementById('submitBtn').addEventListener('click', async () => {
    const videoUrlInput = document.getElementById('videoUrl');
    const formatStrategySelect = document.getElementById('formatStrategy');
    
    const url = videoUrlInput.value.trim();
    const strategy = formatStrategySelect.value;
    
    if (!url) {
        alert("Please enter a valid video link before running the pipeline.");
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    const statusContainer = document.getElementById('statusContainer');
    const statusText = document.getElementById('statusText');
    const resultPanel = document.getElementById('resultPanel');
    const markdownOutput = document.getElementById('markdownOutput');

    // Lock interface elements to prevent double submission bugs
    submitBtn.disabled = true;
    statusContainer.classList.remove('hidden');
    statusText.innerText = "Queueing process task and initializing background workers...";

    try {
        const response = await fetch('/api/repurpose', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                video_url: url,
                strategy: strategy 
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Server rejected processing request.");
        }

        const data = await response.json();
        pollJobStatus(data.job_id, url, strategy);

    } catch (err) {
        alert(`Ingestion Error: ${err.message}`);
        submitBtn.disabled = false;
        statusContainer.classList.add('hidden');
    }
});

async function pollJobStatus(jobId, sourceUrl, strategy) {
    const statusText = document.getElementById('statusText');
    const statusContainer = document.getElementById('statusContainer');
    const resultPanel = document.getElementById('resultPanel');
    const markdownOutput = document.getElementById('markdownOutput');
    const submitBtn = document.getElementById('submitBtn');
    const videoUrlInput = document.getElementById('videoUrl');

    const interval = setInterval(async () => {
        try {
            const res = await fetch(`/api/status/${jobId}`);
            if (!res.ok) return;

            const data = await res.json();
            
            if (data.status === 'processing') {
                statusText.innerText = "Extracting video metrics. Running language modeling layers...";
            } 
            else if (data.status === 'completed') {
                clearInterval(interval);
                
                const rawText = data.result_text;
                
                // Keep a local copy in our memory array to let the user tab back to it instantly
                sessionJobCacheMemory.push({
                    id: jobId,
                    url: sourceUrl,
                    strategy: strategy,
                    text: rawText
                });
                
                renderSessionHistorySidebar(jobId);
                
                // Parse markdown tokens safely into styled rich HTML layout blocks
                markdownOutput.innerHTML = marked.parse(rawText);
                
                // --- Clipboard Copy Handler ---
                document.getElementById('copyBtn').onclick = async () => {
                    const currentActiveJob = sessionJobCacheMemory.find(j => j.id === jobId);
                    await navigator.clipboard.writeText(currentActiveJob ? currentActiveJob.text : rawText);
                    
                    const copyBtn = document.getElementById('copyBtn');
                    copyBtn.innerText = "Copied!";
                    copyBtn.style.color = "var(--brand-success)";
                    setTimeout(() => {
                        copyBtn.innerText = "Copy Content";
                        copyBtn.style.color = "#cbd5e1";
                    }, 2000);
                };

                // --- Markdown File Exporter ---
                document.getElementById('downloadBtn').onclick = () => {
                    const currentActiveJob = sessionJobCacheMemory.find(j => j.id === jobId);
                    const textToExport = currentActiveJob ? currentActiveJob.text : rawText;
                    
                    const blob = new Blob([textToExport], { type: 'text/markdown' });
                    const downloadUrl = URL.createObjectURL(blob);
                    const pointerLink = document.createElement('a');
                    pointerLink.href = downloadUrl;
                    pointerLink.download = `Output_${jobId.substring(0, 8)}.md`;
                    document.body.appendChild(pointerLink);
                    pointerLink.click();
                    document.body.removeChild(pointerLink);
                    URL.revokeObjectURL(downloadUrl);
                };
                
                // Reset form visibility states
                statusContainer.classList.add('hidden');
                resultPanel.classList.remove('hidden');
                submitBtn.disabled = false;
                videoUrlInput.value = ""; 
            } 
            else if (data.status === 'failed') {
                clearInterval(interval);
                alert(`Pipeline Error: ${data.error_log}`);
                statusContainer.classList.add('hidden');
                submitBtn.disabled = false;
            }
        } catch (e) {
            console.error("Polling database sync tracking interruption:", e);
        }
    }, 4000);
}

function renderSessionHistorySidebar(activeJobId) {
    const historyListContainer = document.getElementById('historyList');
    if (!historyListContainer) return;
    
    historyListContainer.innerHTML = ""; 
    
    // Reverse array to show the most recent output run right on top of the tab drawer
    [...sessionJobCacheMemory].reverse().forEach(job => {
        const itemBtn = document.createElement('button');
        itemBtn.className = `history-item ${job.id === activeJobId ? 'active-job' : ''}`;
        
        const typeLabel = job.strategy === 'newsletter' ? '📧 Newsletter' : 
                          job.strategy === 'twitter_thread' ? '🧵 X Thread' : '📝 Full Suite';
                             
        itemBtn.innerText = typeLabel;
        itemBtn.title = `Source: ${job.url}`;
        
        // Let user click back and forth between old jobs without making network calls
        itemBtn.addEventListener('click', () => {
            document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active-job'));
            itemBtn.classList.add('active-job');
            document.getElementById('markdownOutput').innerHTML = marked.parse(job.text);
            activeJobId = job.id; 
        });
        
        historyListContainer.appendChild(itemBtn);
    });
}

// ============================================================================
// ANIMATED CANVAS PARSE VECTORS
// ============================================================================
const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');

let particlesArray = [];
const numberOfParticles = 80; 
const mouse = { x: null, y: null, radius: 140 };

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

window.addEventListener('mousemove', (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
});

window.addEventListener('mouseout', () => {
    mouse.x = null;
    mouse.y = null;
});

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 1;
        this.speedX = (Math.random() * 0.8) - 0.4;
        this.speedY = (Math.random() * 0.8) - 0.4;
    }
    
    update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > canvas.width || this.x < 0) this.speedX = -this.speedX;
        if (this.y > canvas.height || this.y < 0) this.speedY = -this.speedY;

        if (mouse.x != null && mouse.y != null) {
            let dx = this.x - mouse.x;
            let dy = this.y - mouse.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < mouse.radius) {
                const forceDirectionX = dx / distance;
                const forceDirectionY = dy / distance;
                const force = (mouse.radius - distance) / mouse.radius;
                this.x += forceDirectionX * force * 2.5;
                this.y += forceDirectionY * force * 2.5;
            }
        }
    }

    draw() {
        ctx.fillStyle = 'rgba(37, 99, 235, 0.4)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function initParticleMatrix() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    particlesArray = [];
    for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new Particle());
    }
}

function drawProximityLines() {
    for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
            let dx = particlesArray[a].x - particlesArray[b].x;
            let dy = particlesArray[a].y - particlesArray[b].y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 110) {
                let opacity = (1 - (distance / 110)) * 0.12;
                ctx.strokeStyle = `rgba(37, 99, 235, ${opacity})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                ctx.stroke();
            }
        }
    }
}

function animateSystemEngineLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();
    }
    drawProximityLines();
    requestAnimationFrame(animateSystemEngineLoop);
}

initParticleMatrix();
animateSystemEngineLoop();