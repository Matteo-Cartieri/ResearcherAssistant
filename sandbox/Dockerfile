FROM python:3.11-slim

COPY requirements.txt /tmp/requirements.txt

RUN pip install --no-cache-dir -r /tmp/requirements.txt --root-user-action=ignore && rm /tmp/requirements.txt

RUN useradd -m -u 1000 sandbox
USER sandbox
WORKDIR /home/sandbox

# ENTRYPOINT ["python3", "/tmp/script.py"]