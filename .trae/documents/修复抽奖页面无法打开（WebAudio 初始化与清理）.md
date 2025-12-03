## 问题定位

* 页面为单页应用，入口在 `app/index.html:10–12` 与 `app/src/main.tsx:7–12`，访问根路径 `/`。

* 抽奖交互在 `app/src/App.tsx:24–47` 与 `app/src/components/DrawControls.tsx:40–90`。

* 高概率故障点在 `app/src/lib/effects.ts:187–197` 的渐弱与关闭逻辑（你当前查看的第191行：`ambienceMaster.gain.setValueAtTime(...)`）。当 `AudioContext` 已关闭或节点为空时该行会抛错，阻断渲染。

* 首次播放可能受浏览器自动播放策略影响，`AudioContext` 处于 `suspended`，导致后续节点操作异常。

## 修复方案

* 音频上下文恢复：

  * 在 `startAmbience`（`app/src/lib/effects.ts:109–115`）、`playLevelUp`（`app/src/lib/effects.ts:61–66`）、`playCoins`（`app/src/lib/effects.ts:16–21`）创建 `AudioContext` 后检测并执行 `resume()`：`if (ctx.state === 'suspended') await ctx.resume()`。

* 空值守卫替代非空断言：

  * 将 `ambienceCtx!`/`ambienceMaster!` 改为空值检查；在 `app/src/lib/effects.ts:117–176` 的节点创建与调度前增加 `if (!ambienceCtx || !ambienceMaster) return`。

* 安全停止与清理：

  * 在清理阶段先清除 `ambienceInterval`，统一 `safeStop(node)` 捕获重复 `stop()`；

  * 渐弱结束与关闭解耦：将关闭延迟设置为略大于渐弱时长（例如 `1600ms`），避免竞争（修改 `app/src/lib/effects.ts:195–197`）。

* 性能与稳健：

  * 显式 `Math.floor(bufferSize)` 并限制 `scale` 范围，避免过大缓冲导致卡顿（`app/src/lib/effects.ts:143–147`）。

* 降级策略：

  * 若浏览器不支持或用户未交互，允许禁用音效并保证 UI 正常显示。

## 验证步骤

* 开发环境：启动后访问 `http://localhost:5173/`，控制台无错误；点击开始抽奖，音效正常；结束后不再报错。

* 构建预览：打开 `app/dist/index.html` 验证页面渲染与抽奖流程正常。

* 不同端设备（桌面/移动端）验证自动播放策略兼容性。

