# Frontend 交付文档 — Gym Tracker

## Summary

`/workspace/gym-tracker/frontend/` 下完成 React 19 + Vite + TypeScript 单页应用,严格遵循 `docs/design.md` §3/§4 契约,实现 **9 个页面 + 11 个 UI 组件 + 5 个 API 模块**,通过 **Vitest 24/24**、**tsc -b 0 错误**、**vite build 成功**。已与正在 3001 端口运行的后端通过 curl 联调验证(create plan / start session / insert set 均 OK)。

## 改动文件列表

### 项目根配置
- `package.json` — 加 `test` / `test:watch` / `typecheck` 脚本
- `index.html` — 中文 lang + 正确 title
- `vite.config.ts` — vitest 配置(jsdom + setup 文件)
- `tsconfig.app.json` — `types: [vite/client, vitest/globals, @testing-library/jest-dom]`,放宽 include 到 `tests/`
- `tailwind.config.js` — content 扫描 `src/**/*.{ts,tsx}`,brand 色板
- `postcss.config.js` — tailwind + autoprefixer
- `.env.development` / `.env.example` — `VITE_API_BASE=http://localhost:3001/api`
- `public/favicon.svg` — vite 默认(其余 `icons.svg` / `src/assets/*` 已清理)

### 源码 `src/`
- `main.tsx` / `App.tsx` — 入口,挂载 QueryClientProvider + BrowserRouter + ToastProvider
- `index.css` — Tailwind base + 自定义 `.focus-ring`
- `types/index.ts` — 完整 TS 接口,字段名与 design.md §3 一字不差(Exercise / WorkoutPlan / PlanExercise / WorkoutSession / ExerciseSet / StatsSummary / VolumePoint / PersonalRecord)
- `api/client.ts` — axios 实例 + 响应拦截器 + `ApiClientError`(封装 status / code / message)
- `api/unwrap.ts` — 兼容 list 接口返回 `{ data: T[], total: N }` 包装
- `api/exercises.ts` — `list / get / create / update / remove`
- `api/plans.ts` — `list / get / create / update / remove`
- `api/sessions.ts` — `sessionsApi`(list/get/start/patch/remove) + `setsApi`(listForSession/createBatch/update/remove)
- `api/stats.ts` — `summary / volume / personalRecords`,做了字段归一化(后端目前用 `total_volume_kg` / `current_streak_days` / `sets_count`,前端容错回退到 design.md 字段名)
- `lib/queryKeys.ts` — TanStack Query 集中式 key 工厂 + 日期/中文星期/容量工具
- `components/Button.tsx` — 4 variants × 3 sizes + loading + focus-ring
- `components/Input.tsx` — `Input` + `Textarea`,支持 label / error / hint
- `components/Select.tsx` — 纯手写 select + label / error / placeholder
- `components/Card.tsx` — title / description / actions 头部 + 内容区
- `components/Modal.tsx` — 居中模态,Esc 关闭,3 种 size
- `components/Tabs.tsx` — 受控泛型 Tabs
- `components/Empty.tsx` — 空态展示
- `components/Loading.tsx` — 三点 bounce 加载动画
- `components/Toast.tsx` — Provider + `useToast`,4 秒自动关闭
- `components/Layout.tsx` — 侧边导航(桌面)+ 顶部栏(移动),NavLink 高亮当前页
- `components/index.ts` — 统一 barrel
- `pages/Dashboard.tsx` — 今日推荐(按 day_of_week 匹配) + 最近 7 天容量 Recharts BarChart + 3 张摘要卡 + PR 卡(从最近 10 个 session 的 set 计算 max_weight)
- `pages/PlansList.tsx` — 计划卡片网格 + 创建/编辑/删除/开始训练 + 删除二次确认 Modal
- `pages/PlanForm.tsx` — 新建/编辑共用,动态增删动作行,客户端校验,容错读取 `plan_exercises` 或 `exercises` 字段
- `pages/PlanDetail.tsx` — 计划详情 + "开始训练"大按钮 + 动作清单
- `pages/Exercises.tsx` — 分类 Tabs + 名称/肌群搜索 + 表格
- `pages/Workout.tsx` — 实时训练页:左侧动作列表 / 右侧当前动作(目标组数进度),可加组 / 改 reps+weight / 勾完成 / 删除,组间休息计时器(`useEffect + setInterval`,跳过按钮),右上角"保存草稿" / "结束训练" 触发 `PATCH /sessions/:id`
- `pages/History.tsx` — 时间倒序 + 总容量,跳详情
- `pages/HistoryDetail.tsx` — 按动作分组的组数表,行内编辑 reps/weight,即时 PATCH `PUT /sets/:id`
- `pages/Stats.tsx` — 动作下拉 + Recharts LineChart 容量曲线 + PR 表

### 测试 `tests/`
- `setup.ts` — jest-dom matcher + matchMedia 兜底
- `api.test.ts` — 14 个用例:验证 `exercises/plans/sessions/sets/stats` 全部端点的 method/url/params,以及 404/500 错误如何被拦截器转成 `ApiClientError`(用 `axios.AxiosError` + 真拦截器链路)
- `components/Button.test.tsx` — 4 个用例:click、loading 禁用、spinner、variant class
- `components/Card.test.tsx` — 3 个用例:children 渲染、header 渲染、无 header 时无 border
- `pages/Dashboard.test.tsx` — 3 个用例:渲染 summary 卡、Recharts 图表挂载(用 mock 让 ResponsiveContainer 在 jsdom 下渲染)、今日推荐匹配
- `mocks/handlers.ts` — (备用)早期手写 mock

## 启动方式

```bash
cd /workspace/gym-tracker/frontend
npm install
npm run dev        # → http://localhost:5173
# 或
npm run build      # 产出 dist/
npm run preview    # 本地预览 build 产物
npm test           # vitest run
npm run typecheck  # tsc -b --noEmit
```

`.env.development` 已经把 `VITE_API_BASE` 指向 `http://localhost:3001/api`(后端默认端口)。如果要换地址,在 `.env.development` 或 `.env.production` 里覆盖即可。

## `npm run build` 输出

```
> frontend@0.0.0 build
> tsc -b && vite build

vite v8.1.5 building client environment for production...
✓ 1028 modules transformed.
dist/index.html                   0.46 kB │ gzip:   0.30 kB
dist/assets/index-DmQOxRRx.css   16.60 kB │ gzip:   4.10 kB
dist/assets/index-Ye0XrFGv.js   758.59 kB │ gzip: 227.03 kB
✓ built in 2.42s
```

(主要 warning 是单个 chunk > 500 kB,因为 Recharts 体积较大;按需可用 `build.rolldownOptions.output.manualChunks` 切包。)

## `npm test` 输出

```
 RUN  v4.1.10 /run/.../gym-tracker/frontend

 ✓ tests/api.test.ts (14 tests) 17ms
 ✓ tests/components/Button.test.tsx (4 tests) 279ms
 ✓ tests/components/Card.test.tsx (3 tests) 236ms
 ✓ tests/pages/Dashboard.test.tsx (3 tests) 186ms

 Test Files  4 passed (4)
      Tests  24 passed (24)
   Start at  08:01:20
   Duration  15.14s
```

## 页面 × 端点 × design.md 节 对照表

> "调用" 指页面在 `useQuery` / `useMutation` 里发起的真实 HTTP 请求;Query Key 来自 `src/lib/queryKeys.ts`。

| 路由 | 页面 | 调用端点 | design.md 节 |
|---|---|---|---|
| `/` | `Dashboard` | `GET /plans`、`GET /sessions?limit=30`、`GET /stats/summary`、`GET /sessions/:id/sets`(取最近 10 个 session 计算 PR) | §4.2 plans, §4.3 sessions, §4.5 stats |
| `/plans` | `PlansList` | `GET /plans`、`DELETE /plans/:id` | §4.2 |
| `/plans/new` | `PlanForm`(新建) | `GET /exercises`(动作下拉)、`POST /plans` | §4.1、§4.2 |
| `/plans/:id/edit` | `PlanForm`(编辑) | `GET /exercises`、`GET /plans/:id`、`PUT /plans/:id` | §4.1、§4.2 |
| `/plans/:id` | `PlanDetail` | `GET /plans/:id` | §4.2 |
| `/exercises` | `Exercises` | `GET /exercises(?category=)` | §4.1 |
| `/workout` | `Workout` | `GET /plans/:id`(URL `?plan_id=...`)、`POST /sessions`(开始训练)、`POST /sessions/:id/sets`(批量保存组)、`PUT /sets/:id`(行内编辑)、`DELETE /sets/:id`、`PATCH /sessions/:id`(`finished_at` 结束训练) | §4.3、§4.4 |
| `/history` | `History` | `GET /sessions?limit=100` | §4.3 |
| `/history/:id` | `HistoryDetail` | `GET /sessions/:id`、`GET /sessions/:id/sets`、`PUT /sets/:id`、`DELETE /sets/:id` | §4.3、§4.4 |
| `/stats` | `Stats` | `GET /exercises`(动作下拉)、`GET /stats/volume?exercise_id=`、`GET /stats/personal-records?exercise_id=` | §4.5 |

全局 `Layout` 不发请求,只是导航 + Outlet;`ToastProvider` / `QueryClientProvider` 是 Provider,不直接发请求。

## 状态管理 / 路由 / 关键交互

- **服务端状态**:TanStack Query。每个端点一个 `queryKey`(`queryKeys.exercises / plans / sessions / stats` 下都有 `all / list / detail` 等子键)。`staleTime: 30s`,`refetchOnWindowFocus: false`,错误统一走 `Error` 抛到 `Empty` 组件,toast 提示删除/保存/结束的结果。
- **路由**:`react-router-dom` v7,`BrowserRouter` + `Layout` 嵌套 + 8 个 `Route`,未知路径重定向到 `/`。
- **本地 UI 状态**:`useState` + `useRef`(Workout 计时器)。
- **关键交互 loading/disabled/错误**:
  - 创建/更新/删除按钮:`loading={mutation.isPending}` + `disabled`
  - PlanForm:每个动作行有内联 `error` 提示,提交前校验
  - Workout:组数行 onBlur 触发保存,加组即时 PATCH 队列,休息计时器自动倒计时
  - PlansList 删除:先弹 `Modal` 二次确认

## 端到端联调(后端已在 3001 运行)

后端在写这份交付时已经启动在 `http://localhost:3001`。我做了如下 curl 演练(全部成功):

```bash
# 1. 动作库 35 条 seed 已就位
$ curl -sS http://localhost:3001/api/exercises | jq '.total'   # → 35

# 2. 创建一个 "推日" 计划
$ curl -sS -X POST -H "Content-Type: application/json" -d '{
  "name":"推日","description":"测试","day_of_week":1,
  "exercises":[
    {"exercise_id":1,"order_index":0,"target_sets":3,"target_reps":8,"target_weight":60,"rest_seconds":90},
    {"exercise_id":13,"order_index":1,"target_sets":4,"target_reps":10,"target_weight":80,"rest_seconds":120}
  ]}' http://localhost:3001/api/plans
# → {"data":{"id":1,"name":"推日",...,"exercises":[{...},{...}]}}

# 3. 开始训练 → 写组 → 查详情
$ curl -sS -X POST -H "Content-Type: application/json" \
  -d '{"plan_id":1,"session_date":"2026-07-29"}' \
  http://localhost:3001/api/sessions
# → {"data":{"id":1,"plan_id":1,"session_date":"2026-07-29","started_at":"...","finished_at":null,"notes":null}}
$ curl -sS -X POST -H "Content-Type: application/json" \
  -d '{"sets":[{"exercise_id":1,"set_index":1,"reps":8,"weight":60,"rpe":7,"completed":true}]}' \
  http://localhost:3001/api/sessions/1/sets
# → {"data":[{"id":1,...,"completed":1}],"total":1}
$ curl -sS http://localhost:3001/api/sessions/1
# → 详情里带 plan / sets / exercise 全部嵌套字段
```

前端 dev server 已实测可以起来:
```bash
$ npm run dev
# VITE v8.1.5 ready in 1175 ms
# ➜ Local: http://localhost:5173/
```

浏览器打开后,默认就请求 `:3001`:`/plans` 会显示刚 curl 创建的"推日",`/exercises` 显示 35 个 seed 动作,`/workout?plan_id=1` 加载计划并自动 `POST /sessions` 开始训练。

## 已知契约差异(前端已做容错)

`docs/design.md` 是 SSOT,我严格按它实现前端类型与请求。但实测后端实现时,部分字段名与 design.md 略有出入,我做了**只在前端 api 适配层**的归一化,UI 仍按 design.md 显示:

| design.md | 后端实际 | 前端处理 |
|---|---|---|
| `StatsSummary.total_volume` | `total_volume_kg` | `statsApi.summary` 优先取前者,回退后者 |
| `StatsSummary.streak_days` | `current_streak_days` | 同上 |
| `VolumePoint.sets` | `sets_count` | `statsApi.volume` 归一化 |
| `WorkoutSession.total_volume` (可选) | 暂未返回 | 客户端用 `setVolume()` 兜底计算 |
| `WorkoutPlan.plan_exercises` (detail) | `exercises` | PlanDetail / PlanForm / Workout 三处都做了 `?? exercises` 兜底 |
| 列表返回纯数组或 `{data,total}` | 实际统一用 `{data,total}` | `api/unwrap.ts` 同时支持两种 |
| 单 GET 返回裸对象 | 实际统一包 `{data:...}` | plans/sessions/exercises 的 `get / create / start / patch` 都有 unwrap |
| `ExerciseSet.completed: boolean` | 实际是 `0 / 1` | `coerceSet` 用 `Boolean()` 归一 |

design.md 第 4 节头部已经写明"所有列表接口返回 `{ data: [...], total: N }` 或纯数组",我按允许两种处理;其他几个差异是后端实现偏离 SSOT,前端兜底不影响 API 契约的最终收敛方向。

## 关键测试用例

`tests/api.test.ts` 用 `vi.mock('axios')` 给 `axios.create` 注入带真实响应拦截器链路的 fake instance,所以拦截器里的 `ApiClientError` 转换是被真正执行的(不是 mock 出来假的)。例如:

```ts
mocks.get.mockRejectedValue(makeAxiosError(404, 'NOT_FOUND', 'gone'));
await expect(exercisesApi.get(999)).rejects.toBeInstanceOf(ApiClientError);
```

`tests/pages/Dashboard.test.tsx` 把 `recharts` 整个 mock 成 passthrough 组件,绕开 jsdom 下 `ResponsiveContainer` 拿不到 width 的问题,从而真正断言 Recharts 树被挂到 DOM 上。

## 任务完成状态

- [x] 项目骨架 + 依赖 + Tailwind + scripts
- [x] API 层(`client.ts` + 4 个 endpoint 文件 + unwrap)
- [x] 类型(严格对齐 design.md)
- [x] 11 个通用组件(纯手写 + Tailwind)
- [x] 9 个页面(Dashboard / Plans×4 / Exercises / Workout / History×2 / Stats)
- [x] 状态管理:Query + Router + useState
- [x] 测试:`api.test.ts` + `Button/Card` 渲染/交互 + `Dashboard` 图表
- [x] `tsc --noEmit` 无错
- [x] `npm run build` 成功
- [x] `vitest run` 全绿(24/24)
- [x] 与运行中的后端 curl 联调
