# 播放会话分析器

一个基于追加事件日志的播放遥测服务，适用于本地开发和自有测试环境。

## 项目定位

该项目把播放器调试场景整理成一个可审计的观测服务：

```text
播放器客户端 -> POST /api/events -> JSONL 事件日志 -> 可重放会话聚合 -> 查询 API
```

事件日志是事实来源。会话报告通过重放事件生成，因此业务规则与存储实现解耦，后续可以替换为数据库或消息队列。

## 功能

- 固定事件类型白名单和严格事件校验
- 基于 `eventId` 的幂等写入
- 追加式 JSONL 持久化和启动重放
- 会话指标：完成度、观看时长、缓冲时长、错误数和交互次数
- 风险标记：错误率较高、缓冲时间过长、早期流失
- 使用 Node.js 标准库实现 HTTP API
- 使用内置 `node:test` 提供单元测试和接口测试

## 运行

需要 Node.js 18 或更高版本。

```powershell
npm test
npm run demo
npm start
```

服务默认监听 `http://localhost:8787`。可以通过 `PORT` 和 `DATA_FILE` 覆盖默认端口和数据文件路径。

## API

写入单个事件或批量事件：

```powershell
curl.exe -X POST http://localhost:8787/api/events `
  -H "content-type: application/json" `
  -d '{"events":[{"eventId":"e-1","sessionId":"s-1","mediaId":"m-1","type":"ended","occurredAt":"2026-08-10T00:00:00Z","positionSec":120,"durationSec":120}]}'
```

查询接口：

- `GET /api/health`
- `GET /api/sessions?mediaId=m-1&status=completed&limit=50`
- `GET /api/sessions/:sessionId`

支持事件类型：`play`、`pause`、`seek`、`progress`、`buffer_start`、`buffer_end`、`ended`、`error`。

## 架构说明

- `src/domain.js` 负责事件校验、排序和会话报告规则
- `src/service.js` 负责幂等写入和会话索引
- `src/repository.js` 是持久化边界
- `src/api.js` 负责 HTTP 请求适配
- `src/i18n.js` 负责中文标签和报告说明

高风险规则集中在领域层，测试时不需要启动 HTTP 服务。
