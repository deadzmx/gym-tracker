# 健身房锻炼计划管理 — API 契约与架构设计

本文件是前后端协作的**单一事实来源(SSOT)**,由 Mavis 制定,所有 track 必须遵守。
后端负责实现,前端负责消费,API 形状若需修改须先更新本文件。

---

## 1. 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 前端 | React 18 + Vite + TypeScript + React Router + TanStack Query | 主流组合,TanStack Query 简化服务端状态 |
| UI 库 | Tailwind CSS + shadcn/ui 风格组件(纯手写,无依赖) | 简洁现代,无需安装庞大组件库 |
| 图表 | Recharts | 轻量,React 友好 |
| 后端 | Node.js 20 + Express 4 + TypeScript | 主流,生态成熟 |
| 数据库 | SQLite (better-sqlite3) | 零运维,单文件 |
| 测试 | Vitest(前后端通用) | 与 Vite 生态一致 |
| E2E | Playwright | 标准 E2E 框架 |
| LLM | MiniMax API + 智谱 GLM API(双 provider) | 国产,中文友好 |

## 2. 项目结构

```
gym-tracker/
├── backend/
│   ├── src/
│   │   ├── db/           # better-sqlite3 初始化、迁移
│   │   ├── routes/       # 路由处理器
│   │   ├── repositories/ # 数据访问层
│   │   ├── middleware/   # 错误处理、CORS
│   │   ├── types/        # 共享类型
│   │   └── server.ts     # 入口
│   ├── tests/
│   ├── data/             # SQLite 文件目录
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/          # fetch 封装
│   │   ├── components/   # 通用组件
│   │   ├── pages/        # 页面组件
│   │   ├── hooks/        # 自定义 hooks
│   │   ├── lib/          # 工具函数
│   │   ├── types/        # 与后端共享的类型
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── tests/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── e2e/
│   └── tests/            # Playwright 测试
├── docs/
│   └── design.md         # 本文件
├── start.sh              # 一键启动前后端
├── README.md
└── .gitignore
```

## 3. 数据模型

### Exercise(动作库)

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PK | 自增 |
| name | TEXT NOT NULL UNIQUE | 动作名,如 "杠铃卧推" |
| category | TEXT | 部位分类:chest/back/legs/shoulders/arms/core/cardio |
| equipment | TEXT | 器械:barbell/dumbbell/machine/cable/bodyweight/cable |
| primary_muscle | TEXT | 主要肌群 |
| description | TEXT | 动作要领 |
| created_at | DATETIME | ISO 8601 |

启动时 seed 一份 30+ 常用动作。

### WorkoutPlan(训练计划)

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PK | 自增 |
| name | TEXT NOT NULL | 计划名,如 "推日" |
| description | TEXT | 描述 |
| day_of_week | INTEGER | 0-6 (周日=0),可空表示非固定 |
| created_at | DATETIME | |

### PlanExercise(计划内的动作)

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PK | 自增 |
| plan_id | INTEGER NOT NULL FK | 关联计划 |
| exercise_id | INTEGER NOT NULL FK | 关联动作 |
| order_index | INTEGER | 顺序 |
| target_sets | INTEGER | 目标组数 |
| target_reps | INTEGER | 目标次数 |
| target_weight | REAL | 目标重量(kg),可空 |
| rest_seconds | INTEGER | 组间休息秒数 |

### WorkoutSession(训练记录 — 一次实际训练)

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PK | 自增 |
| plan_id | INTEGER FK | 引用计划,可空(自由训练) |
| session_date | DATE | 训练日期 |
| started_at | DATETIME | 开始时间 |
| finished_at | DATETIME | 结束时间,可空 |
| notes | TEXT | 备注 |

### ExerciseSet(每组实际记录)

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PK | 自增 |
| session_id | INTEGER NOT NULL FK | 关联训练 |
| exercise_id | INTEGER NOT NULL FK | 关联动作 |
| plan_exercise_id | INTEGER FK | 关联计划项(自由训练时为空) |
| set_index | INTEGER | 第几组 |
| reps | INTEGER | 实际次数 |
| weight | REAL | 实际重量(kg) |
| rpe | REAL | 1-10 主观用力程度 |
| completed | BOOLEAN | 是否完成 |

## 4. REST API

**基础 URL**: `http://localhost:3001/api`
**CORS**: 允许 `http://localhost:5173`
**响应格式**: `application/json`,所有列表接口返回 `{ data: [...], total: N }` 或纯数组
**错误格式**: `{ error: { code: "NOT_FOUND", message: "..." } }`,状态码语义化

### 4.1 动作 Exercise

| Method | Path | 说明 |
|---|---|---|
| GET | `/exercises` | 列出所有动作,支持 `?category=chest` |
| GET | `/exercises/:id` | 获取单个动作 |
| POST | `/exercises` | 新建(管理用) |
| PUT | `/exercises/:id` | 更新 |
| DELETE | `/exercises/:id` | 删除 |

### 4.2 训练计划 WorkoutPlan

| Method | Path | 说明 |
|---|---|---|
| GET | `/plans` | 列出所有计划 |
| GET | `/plans/:id` | 获取计划详情(含 plan_exercises 列表 + 动作信息) |
| POST | `/plans` | 新建计划,可同时附带 plan_exercises 数组 |
| PUT | `/plans/:id` | 更新计划(含 plan_exercises 全量替换) |
| DELETE | `/plans/:id` | 删除计划 |

请求示例(创建):
```json
{
  "name": "推日",
  "description": "胸+三头+肩",
  "day_of_week": 1,
  "exercises": [
    { "exercise_id": 1, "order_index": 0, "target_sets": 4, "target_reps": 8, "target_weight": 60, "rest_seconds": 90 },
    { "exercise_id": 5, "order_index": 1, "target_sets": 3, "target_reps": 12, "target_weight": 16, "rest_seconds": 60 }
  ]
}
```

### 4.3 训练记录 WorkoutSession

| Method | Path | 说明 |
|---|---|---|
| GET | `/sessions` | 列出,支持 `?from=2024-01-01&to=2024-12-31&limit=50` |
| GET | `/sessions/:id` | 详情(含所有组 + 动作信息) |
| POST | `/sessions` | 开始一次训练(返回 id + started_at) |
| PATCH | `/sessions/:id` | 更新(结束 / 备注 / 关联 plan) |
| DELETE | `/sessions/:id` | 删除 |

POST 请求体(开始):
```json
{ "plan_id": 1, "session_date": "2024-07-29" }
```

### 4.4 训练组 ExerciseSet

| Method | Path | 说明 |
|---|---|---|
| GET | `/sessions/:sessionId/sets` | 列出某次训练的所有组 |
| POST | `/sessions/:sessionId/sets` | 记录一组(可批量) |
| PUT | `/sets/:id` | 更新单组 |
| DELETE | `/sets/:id` | 删除单组 |

POST 批量:
```json
{
  "sets": [
    { "exercise_id": 1, "set_index": 1, "reps": 8, "weight": 60, "rpe": 7, "completed": true },
    { "exercise_id": 1, "set_index": 2, "reps": 8, "weight": 60, "rpe": 8, "completed": true }
  ]
}
```

### 4.5 统计 Stats

| Method | Path | 说明 |
|---|---|---|
| GET | `/stats/summary` | 总体摘要:总训练次数、总容量、连续打卡天数 |
| GET | `/stats/volume?exercise_id=1&from=...&to=...` | 某动作的容量曲线数据(按日期聚合) |
| GET | `/stats/personal-records?exercise_id=1` | 某动作的 PR:最大重量、最大容量、最大 1RM 估算 |

### 4.6 AI 推荐 Plans(新增)

| Method | Path | 说明 |
|---|---|---|
| POST | `/plans/recommend` | 根据用户问卷生成周训练计划 |
| POST | `/plans/recommend/test-llm` | 测试 LLM provider 连接是否可用 |

**POST /plans/recommend 请求体**:
```json
{
  "goal": "muscle" | "fat_loss" | "strength" | "balanced",
  "experience": "beginner" | "intermediate" | "advanced",
  "days_per_week": 3 | 4 | 5 | 6,
  "available_equipment": ["barbell", "dumbbell", "machine", "bodyweight", "cable"],
  "session_duration_min": 30 | 45 | 60 | 75 | 90,
  "focus_areas": ["chest", "back", "legs", "shoulders", "arms", "core"],
  "notes": "可选,用户的额外说明",
  "llm": {
    "provider": "minimax" | "zhipu",
    "api_key": "用户在前端 Settings 页面填的 key"
  }
}
```

**响应**:
```json
{
  "data": {
    "name": "4 天增肌计划 - 中级",
    "description": "推/拉/腿/上肢 split,基于你的中级水平和 4 天/周",
    "days": [
      {
        "name": "周一 - 推",
        "day_of_week": 1,
        "exercises": [
          { "exercise_id": 1, "order_index": 0, "target_sets": 4, "target_reps": 8, "target_weight": null, "rest_seconds": 90 },
          ...
        ]
      },
      ...
    ],
    "rationale": "推/拉/腿 split 是增肌的经典分法...你最近没练胸所以放在第一天",
    "source": "rule_engine" | "llm",
    "provider": "minimax" | "zhipu" | null
  },
  "degraded": true,
  "warning": null
}
```

**degraded 标记**:
- `false`:LLM 成功返回,内容是 LLM 生成的
- `true`:无 key / LLM 失败 / 用户没填 llm 字段,后端用规则引擎,`provider` 为 `null`,`rationale` 是规则引擎的文字解释

**Llm provider 接口**:
- `provider`: `"minimax"` 或 `"zhipu"`
- `api_key`: 用户自己的 key,**不进后端持久化**,只在请求生命周期内使用
- 后端对应环境变量(可选,作为默认):`MINIMAX_API_KEY` / `ZHIPU_API_KEY`,请求 body 里的 key 优先
- 后端实现 `src/services/llm.ts`,导出 `callLLM(provider, apiKey, prompt): Promise<string>`

**prompt 模板**:后端构造中文 prompt,包含用户问卷 + 动作库列表(用 id 引用,避免模型编造动作),要求返回结构化 JSON(用 zod 校验)。LLM 失败/超时(8s)/返回无效 JSON → 自动 fallback 规则引擎,响应 `degraded: true` + `warning: "llm_unavailable"`。

## 5. 前端页面

| 路由 | 页面 | 说明 |
|---|---|---|
| `/` | Dashboard | 显示今日推荐训练、最近 7 天容量图、PR 提醒 |
| `/plans` | 计划列表 | 卡片网格,可创建/编辑/删除 |
| `/plans/recommend` | **AI 推荐(新增)** | 问卷 → 调用 `/api/plans/recommend` → 展示生成结果 |
| `/plans/:id` | 计划详情 | 显示计划内容,可"开始训练" |
| `/plans/:id/edit` | 计划编辑 | 编辑现有计划 |
| `/plans/new` | 计划新建 | 手动新建 |
| `/exercises` | 动作库 | 表格 + 分类筛选 + 搜索 |
| `/history` | 训练历史 | 时间倒序列表 |
| `/history/:id` | 单次训练详情 | 显示所有组,可编辑 |
| `/workout` | 正在训练 | 实时记录每组,可计时 |
| `/stats` | 统计 | 容量曲线、PR 表 |
| `/settings` | **设置(新增)** | LLM provider 选择 + API key 输入 + 测试连接 + 清空 |

## 6. 启动约定

- 后端默认端口 3001,前端 Vite 默认 5173
- 后端通过环境变量 `PORT` 和 `DB_PATH` 配置
- 前端通过 `VITE_API_BASE` 配置后端 URL,默认 `http://localhost:3001/api`
- 一键启动:根目录 `./start.sh` 同时启动前后端(后台运行),`./stop.sh` 停止

## 7. 响应式设计约定(新增)

断点(Tailwind 默认):
- `sm` 640px — 手机横屏
- `md` 768px — 平板竖屏
- `lg` 1024px — 平板横屏/小桌面
- `xl` 1280px — 桌面(主要设计目标)

**关键规则**:
- 侧边栏:`< lg` 隐藏,变成顶部顶栏 + 汉堡按钮,点击展开抽屉式菜单
- 表格:`< md` 转卡片列表(数据按行展示成 vertical card)
- 按钮:`< md` 高度至少 44px,宽度自适应,文字 16px
- 图表:`< md` 高度从 300px → 200px,字号缩小
- 表单:`< md` 单列堆叠,输入框全宽
- 内容 padding:`< md` 缩到 12px,`>= md` 24px

**Layout 组件**职责:
- 检测 `window.matchMedia('(min-width: 1024px)')`
- desktop:固定侧边栏 + 主内容
- mobile:顶栏 + 主内容,菜单按钮控制抽屉显隐
- 路由切换时自动关闭抽屉

## 7. 错误约定

| 状态码 | 含义 |
|---|---|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 409 | 冲突(如 unique 约束) |
| 500 | 服务器内部错误 |

## 8. 测试约定

- 后端:每个路由至少 1 个 happy path + 1 个 error path 单测(Vitest + supertest)
- 前端:关键组件渲染测试 + API 调用 mock(Vitest + React Testing Library)
- E2E:Playwright 跑"创建计划 → 开始训练 → 记录组数 → 结束 → 查看历史"全链路

## 9. 交付物清单

1. 完整可运行的 monorepo(`npm install` 一键装)
2. 启动脚本 + README
3. seed 数据(30+ 动作)
4. 后端 + 前端 + E2E 测试通过
5. 截图或文本证据证明全链路可用
