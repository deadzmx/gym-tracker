#!/usr/bin/env bash
# 停止前后端
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [ -f "$ROOT_DIR/.backend.pid" ]; then
  PID="$(cat "$ROOT_DIR/.backend.pid")"
  kill "$PID" 2>/dev/null && echo "[stop.sh] 后端 pid=$PID 已停止" || echo "[stop.sh] 后端 pid=$PID 不存在或已退出"
  rm -f "$ROOT_DIR/.backend.pid"
else
  echo "[stop.sh] 没有 .backend.pid,后端可能未启动"
fi

if [ -f "$ROOT_DIR/.frontend.pid" ]; then
  PID="$(cat "$ROOT_DIR/.frontend.pid")"
  kill "$PID" 2>/dev/null && echo "[stop.sh] 前端 pid=$PID 已停止" || echo "[stop.sh] 前端 pid=$PID 不存在或已退出"
  rm -f "$ROOT_DIR/.frontend.pid"
else
  echo "[stop.sh] 没有 .frontend.pid,前端可能未启动"
fi

# 兜底:按端口再杀一次
pkill -f "tsx src/server.ts" 2>/dev/null || true
pkill -f "vite --port" 2>/dev/null || true

echo "[stop.sh] 完成"
