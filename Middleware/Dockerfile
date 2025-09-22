# Use Python 3.9 Alpine as base image
FROM python:3.9-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for pyzk
RUN apk add --no-cache \
    gcc \
    musl-dev \
    linux-headers \
    libffi-dev \
    openssl-dev \
    && rm -rf /var/cache/apk/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directories for persistent data
RUN mkdir -p JSON backups logs

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser && chown -R appuser:appuser /app
USER appuser

# Expose any ports if needed (MQTT client doesn't need exposed ports)

# Set the entry point
CMD ["python", "main.py"]
