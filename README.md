# VECTOText.ai 

A high-performance, full-stack asynchronous web application designed to ingest streaming media URLs, extract underlying audio payloads, and leverage state-of-the-art Generative AI to synthesize high-density, structured markdown text documents. 

🔗 **Live Deployment:** [https://vectotext.onrender.com](https://vectotext.onrender.com)

---

##  System Architecture

The application implements a decoupled, asynchronous multi-tier pipeline to safely manage data processing from client request to final storage:

1. **Client Interface:** Modern, responsive frontend layer engineered to capture user target assets (YouTube URLs) and display processing states.
2. **Gateway Application (FastAPI):** High-throughput Python ASGI backend management layer directing routing pipelines and background computation worker pools.
3. **Ingestion Pipeline (yt-dlp):** Isolated media capture library that extracts, processes, and stores local raw audio blocks.
4. **Cognitive Analytics Layer (Google GenAI):** Advanced semantic parsing pipeline running on Google Gemini models, transforming raw audio strings into highly structured text documentation.
5. **Data Persistence Layer (Supabase / PostgreSQL):** Remote relational database ledger mapping user active telemetry, session states, and processing quotas.
6. **Cloud Container Infrastructure (Render):** Managed cloud hosting environment operating automated CI/CD deployment pipelines synced directly to repository commits.

---

## 🛠️ Tech Stack & Key Dependencies

* **Language:** Python 3.11+
* **Framework:** FastAPI (ASGI Engine) & Uvicorn (Production Server)
* **AI Engine:** Google GenAI SDK (Gemini Core Ecosystem)
* **Database Management:** Supabase Python client integration
* **Media Processing:** yt-dlp Core
* **Templating Engine:** Jinja2 

