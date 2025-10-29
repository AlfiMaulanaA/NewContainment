# Dockerfile for NewContainment Middleware (Python + ZKTeco PyZK)
FROM python:3.11-slim AS base

# Set working directory
WORKDIR /app

# Install system dependencies for PyZK and networking
RUN apt-get update && apt-get install -y \
    git \
    gcc \
    g++ \
    make \
    pkg-config \
    libffi-dev \
    libssl-dev \
    libusb-1.0-0-dev \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Clone and install PyZK library
RUN git clone https://github.com/fananimi/pyzk.git /tmp/pyzk && \
    cd /tmp/pyzk && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir .

# Install additional Python dependencies
RUN pip install --no-cache-dir \
    paho-mqtt \
    requests \
    flask \
    gunicorn \
    python-dotenv

# Create non-root user
RUN groupadd --gid 1001 appuser && \
    useradd --uid 1001 --gid 1001 --shell /bin/bash --create-home appuser

# Copy middleware files
COPY Middleware/main.py ./middleware/
COPY Middleware/requirements.txt ./

# Copy PyZK sample/example if needed
COPY Middleware/ ./middleware/

# Create directories for configurations
RUN mkdir -p /app/config /app/logs /app/data && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV FLASK_ENV=production

# Create directories for app data
RUN mkdir -p /app/config /app/logs /app/data

# Expose port for Flask monitoring (optional)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python3 -c "import sys; sys.exit(0)" || exit 1

# Default command - can be overridden in docker-compose
CMD ["python3", "middleware/main.py"]
