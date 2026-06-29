FROM python:3.11-slim

# Prevent Python from writing .pyc files
ENV PYTHONDONTWRITEBYTECODE=1
# Force stdout and stderr streams to be unbuffered
ENV PYTHONUNBUFFERED=1

WORKDIR /chroma

# Install ChromaDB and dependencies
RUN pip install --no-cache-dir chromadb

EXPOSE 8000

# Run ChromaDB with persistent storage directory pointing to /chroma/chroma
# We map host 0.0.0.0 so that Render can rout internally/externally
CMD ["chroma", "run", "--host", "0.0.0.0", "--port", "8000", "--path", "/chroma/chroma"]
