# Release Notes

> v0.1 → v0.4 全部在初始 commit `1fb5fe8` 中。
> tags 在初始 commit 上分别打,作为里程碑。

---

## v0.4 — 月视图日历 + 拖拽改日

**新增**

- 📅 训练日历月视图页面 `/calendar` —— 7×6 网格,显示每天的训练 session
- 🖱️ 拖拽改日 —— 用 `@dnd-kit` 长按 session 卡片,拖到任意日期 → 自动 PATCH 改日 → 乐观更新
- 📊 每月统计 —— 底栏显示"2026年7月 共 N 次训练"
- 🔄 月份切换器 —— ← / 今天 / → 三键导航
- 🎨 视觉细节 —— 今天蓝色描边、周末灰色、跨月日期淡化、每日 session 数绿点

**改动**

- 加 `SessionPatchInput.session_date` 字段
- 侧边栏新增 "📅 日历" 入口
- 安装 `@dnd-kit/core` `@dnd-kit/sortable` `@dnd-kit/utilities`

**测试**

- E2E 新增 4 个:月视图渲染、拖拽改日、移动端适配、月份切换
- 全部测试通过:**82 个** (后端 34 + 前端 24 + E2E 24)

---

## v0.3 — 暗色模式 + PR 自动调重量 + 日历热力图 + 离线缓存

**新增**

- 🌙 暗色模式 —— Tailwind `darkMode: 'class'`,localStorage 持久化,顶栏一键切换
- 🏋️ PR 自动调重量 —— 1RM × 目标百分比(增肌 70% / 力量 85% / 减脂 65% / 综合 72%),取整到 2.5kg
- 🔥 12 周训练热力图 —— Dashboard 上 SVG 渲染最近 12 周 × 7 天训练量
- 📴 离线训练缓存 —— IndexedDB 队列,无网络也能加组,网络恢复自动同步
- 📱 移动端大按钮 —— "+ 加一组" 和 "⏱ 休息 60s" 全宽 ≥ 48px 高度
- 🟡 在线状态指示 —— 顶栏绿/黄状态条 + 待同步数

**改动**

- 后端:recommend 服务读取 PR 估算起始重量
- 前端:Workout 页面重写,支持离线模式

**测试**

- E2E 新增 5 个:暗色模式、热力图、PR 重量、大按钮、离线缓存
- 测试数:21 个(后端 30 + 前端 18 + E2E 21)

---

## v0.2 — AI 计划推荐 + 移动响应式

**新增**

- 🤖 AI 推荐计划 —— `/plans/recommend` 问卷 → 调用 LLM 生成定制计划
- 🧠 多 provider 支持 —— MiniMax + 智谱 GLM + 规则引擎兜底
- 📱 移动端响应式 —— 抽屉式侧边栏、表格转卡片、触控目标 ≥ 44px
- ⚙️ Settings 页面 —— LLM provider 选择、API key 输入、测试连接、清空数据

**改动**

- 后端:`/api/plans/recommend` 端点
- 前端:`recommend.ts` `llm.ts` 服务、Settings 页面

**测试**

- 桌面 + 移动端 E2E:12 个
- 测试数:16 个(后端 26 + 前端 12 + E2E 16)

---

## v0.1 — 核心 CRUD + 训练记录

**新增**

- 🏋️ 35+ 动作库 —— 按部位/器械/肌群分类筛选
- 📋 训练计划 —— 创建/编辑/删除,设目标组数/次数/重量
- ⏱ 实时记录 —— 训练中按组录入 reps/weight/RPE,组间休息计时
- 📜 训练历史 —— 时间倒序浏览,可编辑每组数据
- 📊 统计 —— 总容量曲线、连续打卡天数、PR 表(最大重量/容量/估算 1RM)
- 🌱 自动 PR 追踪 —— 每动作最大重量、最大容量、估算 1RM(Epley 公式)

**技术栈**

- 前端:React 19 + Vite + Tailwind + Recharts + TypeScript
- 后端:Node 20 + Express + better-sqlite3 + TypeScript
- 数据:SQLite 文件 `backend/data/gym.db`

**测试**

- 集成 + 单测:38 个(后端 22 + 前端 16)
