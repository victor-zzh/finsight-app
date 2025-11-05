# FinSight 智能分析应用 - 智能体执行规范 (AGENTS.md)

## 1. 文档目的

本文档为 FinSight 项目中的所有自动化与智能化组件（统称为“智能体”或“Agents”）提供了一套标准的执行规范和操作注意事项。所有开发者和维护者都应严格遵守此文档，以确保数据处理的准确性、服务响应的稳定性以及系统整体的可靠性。

## 2. 智能体概览

根据项目总体规划书，本系统主要由以下四个核心智能体（或组件）协同工作：

1.  **数据采集智能体 (Offline Data Collection Agent):** 离线的Python脚本，负责系统的知识库构建。
2.  **任务调度智能体 (Orchestrator Agent):** 在线的Next.js API路由，充当“总指挥官”，负责执行核心业务逻辑。
3.  **意图分析智能体 (Intent Analysis Agent):** 一个轻量级LLM服务，**被“任务调度智能体”调用**，用于解析用户输入。
4.  **综合分析智能体 (Synthesis & Analysis Agent):** 一个重量级LLM服务，**被“任务调度智能体”调用**，用于生成最终的深度分析报告。

---

## Agent 1: 数据采集智能体 (`finsight-backend/collection`)

### 1.1 核心职责 (Core Responsibilities)

作为系统的“**数据研究员**”，其唯一职责是在后台**离线**、**定期**地采集、处理所有金融数据，并将其结构化地存入相应的数据库（PostgreSQL/Supabase 和 Qdrant Cloud），为在线服务提供高质量、随时可用的“弹药”。

### 1.2 执行规范 (Execution Specifications)

* **执行环境:** 必须在独立的Python环境中运行，通过系统的定时任务（如 Cron Job）或专门的调度服务（如Docker容器定时运行）来触发。
* **核心流程:** 必须严格遵循 `DATA_PIPELINE_WORKFLOW.md` 中定义的优化版流程：
    1.  **任务发现:** 必须通过**批量API调用** (`notice`接口) 的方式，一次性获取指定日期范围内的所有公告。
    2.  **数据更新:** 在向数据库写入财务报表数据时，必须使用 **UPSERT** 逻辑 (`ON CONFLICT DO UPDATE`)，以确保数据能被“更正公告”所更新。
    3.  **状态管理:** 必须严格遵循 `documents` 表中的 `status` 字段 (`PENDING` -> `PROCESSING` -> `COMPLETED`/`FAILED`) 来追踪每个任务的生命周期。
    4.  **RAG数据处理:**
        * PDF原文必须上传至 Supabase Storage （或等效的云存储）进行持久化。
        * 文本块原文及其元数据必须存入 Supabase `chunks` 表。
        * 文本块的向量及其关联元数据，必须使用与 `chunks` 表中记录**相同的UUID**作为ID，存入 Qdrant Cloud。
    5.  **批量写入:** 在向Supabase `chunks` 表和Qdrant Cloud写入数据时，必须采用**批量化 (Batching)** 的方式，以减少网络开销和数据库事务压力。

### 1.3 注意事项与风险 (Precautions & Risks)

* **API配额:** Tushare API有积分和调用频率限制。必须监控积分消耗，确保批量调用逻辑被正确执行。
* **错误隔离:** 脚本中的 `try...except` 块必须能隔离**单个财报**的处理失败，确保不会因为一份有问题的PDF而导致整个采集任务中断。
* **失败任务重试:** 需要建立机制（手动或自动）来定期查询`documents`表中`status`为`FAILED`的任务，并尝试重新处理。
* **爬虫稳定性:** 财报PDF的下载链接规则可能会变化，专用爬虫模块需要有良好的日志和告警机制，以便在规则失效时能快速响应。

---

## Agent 2: 任务调度智能体 (Orchestrator Agent)

### 2.1 核心职责 (Core Responsibilities)

作为系统的“**总指挥官**”，其职责是充当**Next.js API路由 (`/app/api/analyze/route.ts`)**，负责**调度**和**协调**所有在线智能体和数据源，完整、安全地执行一次用户请求。

### 2.2 执行规范 (Execution Specifications)

1.  接收前端HTTP请求。
2.  **调用 Agent 3 (意图分析LLM)**，获取结构化的“执行蓝图”JSON。
3.  对“执行蓝图”进行解析和校验。
4.  **根据“执行蓝图”的`intent`，在TypeScript代码中执行确定的业务逻辑：**
    * `get_trend_analysis`: 并行查询 PostgreSQL 和 Qdrant。
    * `get_qualitative_insight`: 查询 Qdrant。
    * `compare_companies`: 查询 PostgreSQL。
    * `get_realtime_quote`: 调用 Tushare 实时API。
5.  将所有查询到的数据，聚合成一个结构化的JSON数据团（即`INPUT_JSON_BLOB`）。
6.  根据`intent`，从 `prompts.ts` 中选择并组装最终的分析提示词。
7.  **调用 Agent 4 (综合分析LLM)**，获取最终的报告JSON。
8.  将报告JSON返回给前端。

### 2.3 注意事项与风险 (Precautions & Risks)

* **安全 (最高优先级):** 这是唯一直接暴露在公网的组件。必须确保：
    * 所有密钥 (`DATABASE_URL`, `QDRANT_API_KEY`, `GLM_API_KEY`, `TUSHARE_TOKEN`等) 必须作为**环境变量**存储在部署平台（如Vercel）上。
    * **严禁**在Next.js的**前端**代码（任何`"use client"`组件）中访问这些密钥。所有敏感操作必须在Next.js的**后端**（API路由）中完成。
* **超时管理:** 必须为对下游服务（LLM API, 数据库）的每一次调用设置合理的超时时间，防止单个请求耗尽服务器资源（尤其是在Vercel的Serverless环境中）。
* **错误处理:** 必须能优雅地处理任意步骤的失败（例如，意图分析失败、数据库查询为空、RAG未找到上下文），并向前端返回一个清晰、可读的错误信息。

---

## Agent 3: 意图分析智能体 (Intent Analysis Agent)

### 3.1 核心职责 (Core Responsibilities)

作为系统的“**前台接待员**”，其职责是在线、快速地解析用户的自然语言查询，并将其转换为下游**Agent 2 (任务调度智能体)**可以理解的、结构化的**“执行蓝图” (Execution Blueprint) JSON**。

### 3.2 执行规范 (Execution Specifications)

* **执行者:** 被`Agent 2`调用的GLM免费/快速模型。
* **输入:** 用户的原始查询字符串。
* **输出:** 必须严格遵循我们设计的“执行蓝图”JSON格式，包含 `intent`, `entities`（标准化为`ts_code`, `revenue`, `{"start": 2022, ...}`）, `status`等关键字段。
* **Prompt:** 必须使用 `prompts.py` (或 `.ts`) 中为意图分析设计的、包含小样本示例（Few-Shot）的专用提示词。
* **确定性:** API调用时的`temperature`参数应设置为`0.0`，以追求最稳定、最确定的解析结果。

### 3.3 注意事项与风险 (Precautions & Risks)

* **商业许可:** **[高风险]** 必须在上线前，最终确认所使用的免费/快速模型的服务条款，是否明确允许用于**商业化产品**。
* **速率限制 (Rate Limit):** 免费模型通常有QPS（每秒查询数）限制。这可能成为应用在高并发场景下的性能瓶颈，需要进行压力测试。
* **JSON格式校验:** `Agent 2` (Next.js后端) 必须有严格的 `try...catch` 机制来解析此LLM返回的字符串，如果解析失败，必须触发**降级机制**。
* **降级机制 (Fallback):** 当此智能体调用失败或返回 `intent: 'unknown'` 时，`Agent 2` 应能自动降级到基于关键词和规则的备用解析方案，以保证核心功能的可用性。

---

## Agent 4: 综合分析智能体 (Synthesis & Analysis Agent)

### 4.1 核心职责 (Core Responsibilities)

作为系统的“**首席分析师**”，其职责是在所有数据准备就绪后，**严格依据**`Agent 2`所提供的结构化数据和原文摘要，生成一份逻辑严谨、有深度、可追溯的**最终分析报告JSON**。

### 4.2 执行规范 (Execution Specifications)

* **执行者:** 被`Agent 2`调用的GLM强大模型。
* **输入:** 由`Agent 2`精心组装的、包含所有定量和定性数据的结构化JSON (`INPUT_JSON_BLOB`)。
* **输出:** 必须严格遵循 `prompts.ts` 中为每个意图定义的、用于前端渲染的最终报告JSON格式。
* **核心原则:** 必须严格遵守 `MAIN_FRAMEWORK_PROMPT` 中定义的**“绝对事实性”、“可追溯性”、“客观中立”**三大核心原则。**严禁**模型使用任何外部知识或进行猜测。

### 4.3 注意事项与风险 (Precautions & Risks)

* **成本控制:** **[高风险]** 这是系统中最主要的API成本来源。`Agent 2`必须对输入和输出的Token数量进行监控和记录，以便进行成本分析和优化。
* **响应延迟 (Latency):** 强大模型的响应时间通常更长。`Agent 2`必须有健壮的超时处理，同时前端UI必须有良好的加载状态（Loading State）以优化用户体验。
* **模型幻觉 (Hallucination):** 尽管Prompt设计了严格的约束，但模型幻觉的风险无法100%消除。应用在呈现结论时，应始终提供返回