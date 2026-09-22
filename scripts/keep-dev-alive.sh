#!/bin/bash
# Self-restarting dev server wrapper. Runs forever, restarting `bun run dev` if it exits.
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting bun run dev..."
  bun run dev > /tmp/dev-keepalive.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] bun run dev exited with code $EXIT_CODE. Restarting in 3s..."
  sleep 3
done
