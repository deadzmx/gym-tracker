#!/usr/bin/env bash
# 一键启动前后端(后台运行,PID 写入 ./*.pid)
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# 端口配置
BACKEND_PORT="${PORT:-3001}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
DB_PATH="${DB_PATH:-$ROOT_DIR/backend/data/gym.db}"

# 装依赖(若缺)
if [ ! -d "$ROOT_DIR/backend/node_modules" ]; then
  echo "[start.sh] 安装后端依赖..."
  (cd backend && npm install)
fi
if [ ! -d "$ROOT_DIR/frontend/node_modules" ]; then
  echo "[start.sh] 安装前端依赖..."
  (cd frontend && npm install)
fi

# 停掉旧实例
if [ -f "$ROOT_DIR/.backend.pid" ]; then
  kill "$(cat "$ROOT_DIR/.backend.pid")" 2>/dev/null || true
  rm -f "$ROOT_DIR/.backend.pid"
fi
if [ -f "$ROOT_DIR/.frontend.pid" ]; then
  kill "$(cat "$ROOT_DIR/.frontend.pid")" 2>/dev/null || true
  rm -f "$ROOT_DIR/.frontend.pid"
fi

# 启动后端
echo "[start.sh] 启动后端 on :$BACKEND_PORT ..."
(cd backend && PORT="$BACKEND_PORT" DB_PATH="$DB_PATH" setsid nohup npx tsx src/server.ts > "$ROOT_DIR/.backend.log" 2>&1 < /dev/null &)
BACKEND_PID=$!
echo $BACKEND_PID > "$ROOT_DIR/.backend.pid"
echo "[start.sh] backend pid=$BACKEND_PID"

# 启动前端
echo "[start.sh] 启动前端 on :$FRONTEND_PORT ..."
(cd frontend && VITE_API_BASE="http://localhost:$BACKEND_PORT/api" setsid nohup npx vite --port "$FRONTEND_PORT" --strictPort > "$ROOT_DIR/.frontend.log" 2>&1 < /dev/null &)
FRONTEND_PID=$!
echo $FRONTEND_PID > "$ROOT_DIR/.frontend.pid"
echo "[start.sh] frontend pid=$FRONTEND_PID"

# 等服务起来
sleep 5

# 探活
echo ""
echo "[start.sh] ===== 状态检查 ====="
if curl -s -o /dev/null -w "  backend  http://localhost:$BACKEND_PORT/api/exercises  -> HTTP %{http_code}\n" "http://localhost:$BACKEND_PORT/api/exercises"; then
  :
fi
if curl -s -o /dev/null -w "  frontend http://localhost:$FRONTEND_PORT/             -> HTTP %{http_code}\n" "http://localhost:$FRONTEND_PORT/"; then
  :
fi

echo ""
echo "[start.sh] 全部启动完成!"
echo "  前端: http://localhost:$FRONTEND_PORT"
echo "  后端: http://localhost:$BACKEND_PORT/api"
echo "  日志: tail -f $ROOT_DIR/.backend.log  /  tail -f $ROOT_DIR/.frontend.log"
echo "  停止: ./stop.sh"
