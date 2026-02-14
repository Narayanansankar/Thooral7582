# Use the official lightweight Python image.
# https://hub.docker.com/_/python
FROM python:3.10-slim

# Allow statements and log messages to be sent straight to the logs
ENV PYTHONUNBUFFERED True

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install the dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
COPY . .

# Expose the port that the application will run on
EXPOSE 8080

# Command to run the application using Gunicorn (a production-ready web server)
# Cloud Run will automatically set the $PORT environment variable.
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 app:app