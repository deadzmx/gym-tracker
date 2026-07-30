# 健身房锻炼计划管理 — v0.4 交付报告

> v0.4 在 v0.3 基础上新增:**训练日历月视图 + 拖拽改日**
> 之前的 v0.1 / v0.2 / v0.3 全部保留并继续测试。

## 1. 完成情况

| 模块 | 状态 | 证据 |
|---|---|---|
| 后端 - 全部 | ✅ | 34 个测试通过(PATCH 端点已支持 session_date,无需新增) |
| 前端 - 月视图组件 | ✅ v0.4 新增 | MonthCalendar.tsx,7×6 网格,支持 @dnd-kit |
| 前端 - 拖拽改日 | ✅ v0.4 新增 | @dnd-kit 集成,PATCH 调用,乐观更新 |
| 前端 - Calendar 页面 | ✅ v0.4 新增 | /calendar 路由,月份切换,移动端适配 |
| 前端 - 月份统计 | ✅ | "2026年7月 共 N 次训练" |
| 侧边栏入口 | ✅ | 新增 "📅 日历" 入口,带 active state |
| 测试 | ✅ | 后端 34 + 前端 24 + E2E 24 = **82 个全过** |

## 2. v0.4 关键改动

### 前端

| 文件 | 改动 |
|---|---|
| `frontend/package.json` | +`@dnd-kit/core` `@dnd-kit/sortable` `@dnd-kit/utilities` |
| `frontend/src/lib/calendar.ts` | **新** - buildMonth / addMonth / groupSessionsByDate / isoDate / pad2 工具 |
| `frontend/src/components/MonthCalendar.tsx` | **新** - 7×6 网格月视图 + session 卡片(可拖)+ 今日蓝色描边 + 周末灰色 + 跨月淡化 + 拖拽到 DroppableDay |
| `frontend/src/components/index.ts` | +export MonthCalendar / MonthSession |
| `frontend/src/pages/Calendar.tsx` | **新** - 月份状态 + 月份切换器 + 数据 fetch + 移动 PATCH + 乐观更新 + toast |
| `frontend/src/App.tsx` | +`/calendar` 路由 |
| `frontend/src/components/Layout.tsx` | +`/calendar` 侧边栏入口 |
| `frontend/src/types/index.ts` | +`session_date` 字段给 SessionPatchInput |

### 后端

**无新增** — PATCH `/api/sessions/:id` 原本就支持 `session_date` 字段(看 sessions.ts 路由),无 schema 变化。

## 3. 关键交互

### 3.1 月视图
- 7 列(周日到周六)× 6 行(固定 42 单元)
- 每月起始日 = 该月 1 号的周日(往前补)
- 跨月日期显示淡化背景 + 灰色文字
- 今天 = 蓝色描边 + 蓝色圆点
- 周末 = 浅灰背景
- 每日右上角 = 训练 session 数(绿色徽章)
- 每日 session 卡片 = 计划名 + 组数(深绿色背景,可拖动)

### 3.2 拖拽改日
- @dnd-kit PointerSensor 激活距离 5px(避免误触)
- DragOverlay 跟随鼠标显示半透明 ghost
- 释放时:
  - 同一天 → no-op
  - 不同天 → 乐观更新本地缓存 + 调 PATCH `/api/sessions/:id` 传 `session_date`
  - 成功 → toast "已移到 2026-06-28" + 刷新日历数据
  - 失败 → 回滚 + 错误 toast
- 拖拽时:
  - 拖动 cell 高亮(浅绿背景 + 描边)
  - 源 cell 的 session 卡片 opacity 30%

### 3.3 月份切换
- ← → 按钮
- "今天" 按钮跳回当前月
- 月份文字居中显示"2026年7月"
- URL 不变(状态在 React state 里)

## 4. 真实数据验证

### 4.1 E2E 拖拽实测
```
✓ 渲染月视图,42 个 day cell + 2+ session pill
✓ 拖动 session 10(从 2026-07-22)到 2026-06-28
✓ 调 PATCH /api/sessions/10 传 session_date: "2026-06-28"
✓ API 返回 session_date: "2026-06-28"
✓ Toast 提示 "已移到 2026-06-28"
✓ 7月从 10 次训练 → 9 次(因为 1 个移到 6月了)
✓ 6月 28 号 cell 出现新 session
```

### 4.2 月份切换
- 点击 "→" → 月份文字变化
- 点击 "今天" → 跳回 7 月
- 切换过程无延迟,query cache 复用

### 4.3 移动端
- 375px 宽度下 grid 7 列等宽分配
- cell 高度从桌面 110px 缩到 80px
- 月份切换按钮全可见
- 拖拽在触屏上有效(@dnd-kit PointerSensor)

## 5. 测试覆盖

| 层级 | 数量 | 状态 |
|---|---|---|
| 后端单测/集成 (vitest) | 34 | ✅ 全过 |
| 前端单测 (vitest) | 24 | ✅ 全过 |
| E2E (Playwright) | 24 | ✅ 全过 |
| **合计** | **82** | **✅ 全过** |

E2E 分类:
- 桌面 6 + 移动 6 (v0.2 响应式)
- 暗色 + 日历 + PR 重量 (v0.3)
- 大按钮 + 离线 (v0.3)
- 月视图 + 拖拽改日 + 月份切换 + 移动端日历 (v0.4 新增 4 个)

## 6. 怎么跑

```bash
cd /workspace/gym-tracker
./start.sh
# 浏览器打开 http://localhost:5173/calendar
# 长按 session 卡片拖到其他日期
./stop.sh
```

## 7. v0.5 候选

- 训练提醒 / 通知(PWA + service worker)
- 多用户 / 登录(JWT)
- 月视图拖拽多选 + 批量改日
- 日历导出为图片 / PDF
- 训练模板/分享
- 自定义训练日(day_of_week 0-6 扩展为多个)
