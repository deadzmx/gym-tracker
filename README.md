# Gym Tracker — 健身房锻炼计划管理

[![CI](https://github.com/deadzmx/gym-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/deadzmx/gym-tracker/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/Node-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)](https://sqlite.org)
[![Tests](https://img.shields.io/badge/tests-82_passing-4c1?logo=checkmarx&logoColor=white)](#-测试)
[![E2E](https://img.shields.io/badge/E2E-Playwright-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev)

> 一套完整自托管的训练日志 + AI 计划推荐 + 移动响应式 + 暗色模式 + 离线缓存 + 月视图日历(可拖拽改日)的 Web 应用。Express + React 19,**单 Docker 镜像**统一部署(API + 静态文件),SQLite 持久化,零外部依赖。**多架构镜像**:linux/amd64 + linux/arm64(M1/M2 Mac 即开即用)。

## ✨ 功能

### 核心 (v0.1)
- **动作库**:35+ 常用训练动作,按部位 / 器械 / 肌群分类筛选
- **训练计划**:创建周期性计划(如"周一推日"),每个动作设目标组数/次数/重量
- **实时记录**:训练中按组录入 reps / weight / RPE,组间休息计时器
- **训练历史**:时间倒序浏览,支持编辑每组数据
- **统计**:总容量曲线、连续打卡天数、个人记录(PR:最大重量 / 容量 / 估算 1RM)
- **个人记录**:自动追踪每个动作的最大重量、最大容量、估算 1RM(Epley 公式)

### AI 计划推荐 (v0.2)
- **问卷式交互**:目标 / 经验 / 每周天数 / 时长 / 可用器械 / 重点部位
- **双 LLM provider**:支持 **MiniMax** 和 **智谱 GLM**,前端选择 + 网页里填 key
- **规则引擎兜底**:无 key 或 LLM 失败时,自动用内置规则生成
- **保存到计划库**:一键把生成结果保存为多个计划
- **可视化理由**:返回生成说明,告诉你为什么这么安排

### 移动端响应式 (v0.2)
- 侧边栏抽屉、表格转卡片、图表缩放、触控目标 ≥ 44px

### 暗色模式 (v0.3 新增)
- **全局暗色**:所有页面 + 组件 + 图表(Recharts 自动跟随)
- **三种模式**:浅色 / 深色 / 跟随系统(系统偏好自动检测)
- **持久化**:localStorage 记住你的选择,跨会话保留
- **切换按钮**:顶栏右上一个按钮(🌙/☀️)即时切换
- **防闪烁**:页面加载前先应用主题,避免"先亮后暗"的尴尬

### PR 自动调重量 (v0.3 新增)
- AI 推荐生成时自动查你的历史 PR(最大重量 / 估算 1RM)
- 按目标百分比推算起始重量(增肌 70% / 力量 85% / 减脂 65% / 综合 72%)
- 取整到最近的 2.5kg(标准杠铃片),最低 5kg
- rationale 里明确告诉你"已根据你 N 个动作的 PR 估算 1RM,按 X% 推算起始重量"
- 无 PR 时 target_weight 仍为 null(让用户首次训练时手填 60-70% 1RM)

### 训练日历热力图 (v0.3 新增)
- **GitHub 风格**:12 周 × 7 天网格,绿深浅表示训练量
- **5 级强度**:0 次 → 4+ 次
- **5 级颜色**:浅灰 → 深绿,暗色模式自动反转
- **统计概览**:"X 次训练 · Y 个训练日"
- **悬浮提示**:鼠标悬停看当天详情(日期 / 训练次数 / 组数 / 容量)
- **新 API**:`GET /api/stats/calendar?from=&to=`(默认 12 周窗口)

### Workout 离线缓存 (v0.3 新增)
- **IndexedDB 队列**:训练时无网络也能加组,数据存到本地
- **在线状态指示**:顶栏绿色/黄色状态条("🟢 在线" / "🟡 离线 · 待同步: N 个")
- **自动同步**:网络恢复时自动 flush 队列到后端
- **手动同步**:有"立即同步"按钮,网络好的时候强制 flush
- **大触控按钮**:移动端"+ 加一组"和"⏱ 休息 60s"按钮全宽、高度 ≥ 48px
- **离线提示**:开始训练时弹 toast 提示"离线模式,数据将保存到本地"

### 训练日历月视图 + 拖拽改日 (v0.4 新增)
- **新页面** `/calendar` - 7×6 网格月视图
- **月份切换**:← → 切上下月,"今天" 按钮回当前月
- **日期指示**:今天蓝色描边,周末灰色背景,跨月日期淡化
- **每日统计**:右上角绿点显示当天 session 数
- **session 卡片**:每张卡片显示计划名 + 组数
- **拖拽改日**:用 `@dnd-kit/core` 实现,长按 session 卡片拖到另一天 → 乐观更新 → 调 PATCH `/api/sessions/:id` 改 `session_date` → toast 提示
- **点击卡片**:跳转到 session 详情页
- **移动端**:grid 缩为 80px 高,触控目标 ≥ 44px

## 🏗 架构

```
gym-tracker/
├── backend/          # Node.js + Express + better-sqlite3 + TypeScript
├── frontend/         # React 19 + Vite + Tailwind + Recharts + idb
├── e2e/              # Playwright 端到端测试(桌面+移动+暗色)
├── docs/design.md    # API 契约 + 数据模型(SSOT)
├── start.sh          # 一键启动
├── stop.sh           # 一键停止
└── README.md
```

| 层 | 端口 | 技术栈 |
|---|---|---|
| 后端 API | 3001 | Node 20 / Express / better-sqlite3 / zod / Vitest |
| 前端 | 5173 | React 19 / Vite / Tailwind / Recharts / TanStack Query / Vitest / idb |
| LLM | — | MiniMax API + 智谱 GLM API(key 由前端传到后端) |
| 离线存储 | — | IndexedDB(浏览器本地) |
| E2E | — | Playwright (chromium) |

## 🚀 快速开始

```bash
# 启动(后台运行,PID 写到 .backend.pid / .frontend.pid)
./start.sh

# 打开浏览器
open http://localhost:5173

# 停止
./stop.sh
```

**首次启动**会自动 `npm install`(若缺依赖)、建表 SQLite、seed 35 个动作。

### 环境变量(可选)

| 变量 | 默认 | 说明 |
|---|---|---|
| `PORT` | 3001 | 后端端口 |
| `DB_PATH` | `backend/data/gym.db` | SQLite 文件位置 |
| `FRONTEND_PORT` | 5173 | 前端端口 |
| `VITE_API_BASE` | `http://localhost:3001/api` | 前端调用的 API base |

## 🧪 测试

```bash
# 后端(34 个测试)
cd backend && npm test

# 前端(24 个测试)
cd frontend && npm test

# E2E(20 个测试,需要后端+前端已运行)
cd e2e && npx playwright test

# 类型检查
cd backend && npx tsc --noEmit
cd frontend && npx tsc -b

# 生产构建
cd backend && npm run build
cd frontend && npm run build
```

## 📡 API 概览

完整契约见 [`docs/design.md`](docs/design.md)。

| 端点 | 说明 |
|---|---|
| `GET /api/exercises[?category=chest]` | 动作库列表 |
| `GET/POST/PUT/DELETE /api/exercises[/:id]` | 动作 CRUD |
| `GET/POST/PUT/DELETE /api/plans[/:id]` | 训练计划 |
| `POST /api/plans/recommend` | **AI 推荐** — 接受问卷,返回周计划 |
| `POST /api/plans/recommend/test-llm` | **测试 LLM 连接** |
| `GET/POST/PATCH/DELETE /api/sessions[/:id]` | 训练记录 |
| `POST /api/sessions/:id/sets` | 批量记录训练组 |
| `GET /api/stats/summary` | 总训练次数/容量/连续打卡 |
| `GET /api/stats/volume?exercise_id=` | 某动作按天容量曲线 |
| `GET /api/stats/personal-records?exercise_id=` | 最大重量 / 容量 / 估算 1RM |
| `GET /api/stats/calendar[?from=&to=]` | **日历热力图数据** (12 周默认) |

错误格式:`{ "error": { "code": "NOT_FOUND", "message": "..." } }`

## 🤖 AI 推荐使用流程

1. **设置** 页面 (`/settings`) → 选 Provider(MiniMax / 智谱 GLM)→ 填 key
2. **AI 推荐** 页面 (`/plans/recommend`) → 填问卷 → 生成
3. 看到结果 — **PR 自动调重量** 已经在 rationale 里告诉你"按 N% 推算"
4. 一键保存到训练计划库

## 🌓 暗色模式

- 顶栏右侧 🌙/☀️ 按钮一键切换
- 跟随系统:首次访问时检测 `prefers-color-scheme`,无手动选择时跟随
- 持久化:localStorage key `gym-tracker.theme.v1`
- 覆盖:全部页面、组件、Toast、Modal、Recharts 图表、SVG 热力图

## 📅 训练日历热力图

- Dashboard 上自动加载过去 12 周训练日历
- 颜色:5 级绿(0 次 → 4+ 次训练)
- 鼠标悬停:看当天组数/容量
- 暗色模式自动反转配色

## 📱 离线模式

- 顶栏状态条:🟢 在线 / 🟡 离线 + 待同步计数
- 训练时:离线也能加组,数据存 IndexedDB
- 网络恢复:自动 flush 队列到后端
- 手动同步:有"立即同步"按钮强制 flush

## 🐛 常见问题

**Q: 端口被占用?** 设环境变量换端口:`PORT=3002 FRONTEND_PORT=5174 ./start.sh`

**Q: 移动端不显示抽屉?** 浏览器宽度 < 1024px 自动显示抽屉入口

**Q: AI 推荐没反应?**
- 先在 `/settings` 填 key 并测试连接
- 浏览器 Network 面板看请求

**Q: PR 自动调重量对了吗?**
- 算法:1RM × 目标百分比(增肌 70% / 力量 85% / 减脂 65% / 综合 72%)
- 取整到最近 2.5kg(标准杠铃片)
- 最低 5kg

**Q: 离线数据会丢吗?**
- IndexedDB 存到浏览器本地,关闭浏览器不丢
- 卸载浏览器/清空数据 → 丢
- 建议:训练完看到"待同步: 0"再关闭

**Q: 1RM 怎么算的?**
Epley 公式:`1RM = weight × (1 + reps / 30)`,例:60kg × 8 reps → 60 × 1.267 = 76kg

## 📋 交付物

- ✅ 后端:5 张表、24 个 API 端点、34 个测试、TypeScript 严格模式
- ✅ 前端:11 个页面、10+ 个 UI 组件、24 个测试、Tailwind + Recharts + 暗色 + 离线
- ✅ E2E:20 个 Playwright 测试(桌面 + 移动 + 暗色 + 离线)
- ✅ 文档:design.md(API 契约)+ README
- ✅ 启动脚本:`./start.sh` `./stop.sh`

## 版本

- v0.1 — 核心 CRUD + 训练记录
- v0.2 — AI 推荐 + 移动端响应式
- v0.3 — 暗色模式 + PR 自动调重量 + 训练日历热力图 + Workout 离线缓存
- v0.4 — **月视图日历 + 拖拽改日 + Docker 化 + CI 全面 Docker 化**(当前)

## 🐳 Docker 化

v0.4 起项目全面 Docker 化:
- **多阶段构建**:`dev` 阶段带热重载,`prod` 阶段只产最终镜像
- **CI 用 docker compose 跑**:`docker compose -f docker-compose.ci.yml up` 起整个测试栈
- **镜像自动推 GHCR**:`ghcr.io/deadzmx/gym-tracker-{backend,frontend}`
- **生产单命令启动**:`make up` 或 `docker compose up -d --build`

详见下方 "🐳 Docker 部署" 章节。

## 🧪 测试

### 本地原生(npm)
```bash
# 后端
cd backend && npm install && npm test

# 前端
cd frontend && npm install && npm test

# E2E(需要后端 + 前端先跑起来)
cd e2e && npm install && npx playwright install chromium && npm test
```

### Docker 容器
```bash
# 单元测试(后端 + 前端)
make test

# E2E(需要先 make up 或 make dev)
make e2e
```

| 层级 | 数量 | 工具 |
|---|---|---|
| 后端 | 34 | vitest + better-sqlite3 |
| 前端 | 24 | vitest + @testing-library |
| E2E | 24 | Playwright |
| **合计** | **82** | — |

E2E 覆盖:核心 CRUD、AI 推荐流程、移动端响应式、暗色模式、PR 自动调重量、12 周热力图、Workout 离线缓存、月视图日历、拖拽改日。

## 🐳 Docker 部署

### 🎯 统一镜像(单容器)

生产部署只跑**一个容器** — Express 同时服务 API 和前端静态文件(SPA fallback)。
一个进程、一个端口、一个镜像。

### 快速启动
```bash
# 用 Makefile(推荐)
make up

# 或直接用 docker compose
docker compose up -d --build

# 浏览器 → http://localhost:8123
```

### 开发模式(热重载,2 个容器)

生产用单容器;开发用 `docker-compose.dev.yml` override,**拆成 2 个容器**(vite + tsx watch)各自热重载:

```bash
make dev
# 后端:http://localhost:3001 (tsx watch)
# 前端:http://localhost:5173 (vite dev with HMR)
```

### 常用命令
```bash
make help         # 查看所有命令
make build        # 构建统一镜像
make up           # 生产模式(单容器,后台)
make dev          # 开发模式(2 容器,前台)
make logs         # 查看日志
make down         # 停止
make clean        # 停止 + 删除 volume(数据会丢!)
make clean-keep-db # 停止 + 保留数据
make shell        # 进入生产容器
```

### 架构

**生产(单容器)**:
```
┌─────────────────────────────────┐
│  gym-tracker container (8123)    │
│  ┌───────────────────────────┐  │
│  │  Node + Express           │  │
│  │   ├─ /api/* (JSON)        │  │
│  │   └─ /* (SPA fallback)    │  │
│  │      → /app/frontend/dist │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

| Service | 镜像 | 端口 | 说明 |
|---|---|---|---|
| `app` (prod) | `ghcr.io/deadzmx/gym-tracker` | 8123 → 3001 | Express + 静态文件(单进程),**多架构:linux/amd64 + linux/arm64** |

**开发(2 容器)**:后端 3001 + 前端 5173,各带热重载。

### 数据持久化

SQLite 数据库存放在 named volume `gym-data`:
- 容器内路径:`/app/backend/data/gym.db`
- 主机查看:`docker volume inspect gym-data`
- 备份:停止容器后 `cp $(docker volume inspect gym-data -f '{{ .Mountpoint }}')/gym.db ./backup.db`

### 拉到 GHCR 镜像直接跑(无需 clone 代码)

```bash
docker run -d \
  --name gym-tracker \
  -p 8123:3001 \
  -v gym-data:/app/backend/data \
  -e NODE_ENV=production \
  ghcr.io/deadzmx/gym-tracker:latest
```

浏览器 → **http://localhost:8123** ✓

### 部署到服务器(纯 docker compose)

```bash
# 服务器上
git clone https://github.com/deadzmx/gym-tracker.git
cd gym-tracker
docker compose up -d --build
# 反向代理(nginx / Caddy)指向 8123 即可
```

## 📄 License

[MIT](./LICENSE) © 2026 deadzmx
