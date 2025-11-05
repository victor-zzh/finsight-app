# FinSight 智能财报分析 - 项目总体规划书 (Master Plan)

## 1. 项目愿景与最终架构

### 1.1 项目愿景
本项目旨在为个人投资者打造一款严谨、智能、可追溯的财报分析与风险识别应用。它将结合确定性的数据分析与先进的AI智能体工程，提供一个能够理解用户复杂需求、执行多步骤分析并生成深度报告的智能助手。

### 1.2 最终架构：Next.js (BFF) + Python (CrewAI) 微服务
我们采用前后端分离、Web与AI分离的微服务架构，以实现最高的安全性、职责分离和可扩展性。

* **`finsight-app` (Next.js):** 用户的入口。前端使用React构建，其**Next.js后端**扮演“**BFF (Backend-for-Frontend)**”和“**安全网关**”的角色。它负责处理用户认证、会话和Web安全，并将用户的请求安全地转发到内部的AI服务。
* **`finsight-backend` (Python):** 系统的“**大脑**”。它是一个独立的Python服务（使用FastAPI等框架），包含了两个核心模块：
    1.  **`/collection` (离线):** 强大的数据采集管道。
    2.  **`/app` (在线):** 基于CrewAI的智能体分析服务。

```mermaid
graph TD
    User(👤 用户) --> App[finsight-app (Next.js 应用)];
    
    subgraph finsight-app (Next.js)
        Frontend[React 前端UI]
        BFF[Next.js API路由 (BFF / 安全网关)]
        Frontend --> BFF;
    end

    subgraph finsight-backend (Python 后端服务)
        CrewAI[CrewAI Agent 服务 (FastAPI)]
        Collection(🐍 /collection 数据采集脚本)
        Supabase[(Supabase/PostgreSQL)]
        Qdrant[(Qdrant Cloud)]
        TushareAPI(Tushare API)
        
        CrewAI --> Supabase;
        CrewAI --> Qdrant;
        CrewAI --> TushareAPI;
        Collection --> TushareAPI;
        Collection --> Supabase;
        Collection --> Qdrant;
    end
    
    BFF -- HTTP请求 --> CrewAI[CrewAI Agent 服务 (FastAPI)];

## 2. 核心功能集 (MVP)

MVP版本将实现四个核心的分析动作（`intent`）：

1.  **`get_trend_analysis`:** 深度财务趋势分析（结合定量数据与定性原因）。
2.  **`get_qualitative_insight`:** 定性信息问答（基于RAG的财报原文检索）。
3.  **`compare_companies`:** 对比多家公司的核心指标。
4.  **`get_realtime_quote`:** 获取并解读实时行情与估值。

---

## 3. 后端: `finsight-backend` (Python)

### 3.1 离线数据管道 (`/collection`)

负责为整个系统提供数据基础。

#### A. Tushare API使用指南

| API接口 | 接口名称 | 用途与目的 | 调用方 |
| :--- | :--- | :--- | :--- |
| `stock_basic` | 股票列表 | [基础] 获取所有公司信息，建立主数据。 | Python (离线) |
| `income` | 利润表 | [核心] 获取完整的利润表原始数据。 | Python (离线) |
| `balancesheet`| 资产负债表 | [核心] 获取完整的资产负债表原始数据。 | Python (离线) |
| `cashflow` | 现金流量表 | [核心] 获取完整的现金流量表原始数据。 | Python (离线) |
| `fina_indicator`| 财务指标 | [核心] 获取预计算的财务指标（ROE等）。 | Python (离线) |
| `notice` | 上市公司公告 | [RAG] **批量**发现新财报，作为PDF下载的任务触发器。 | Python (离线) |
| `daily` | 日线行情 | [实时] 获取最新收盘价、涨跌幅。 | **Python (在线)** |
| `daily_basic`| 每日指标 | [实时] 获取最新PE/PB、总市值。 | **Python (在线)** |

#### B. 数据库迁移脚本 (`migration_comprehensive_setup.py`)

此脚本用于在Supabase (PostgreSQL) 中创建生产级的表结构。

```python
# (此处粘贴 migration_comprehensive_setup.py 的完整Python代码)
# 脚本内容已在上一条回复中提供，包含:
# 1. CREATE_ENUM_TYPE_SQL
# 2. CREATE_COMPANIES_TABLE_SQL (完整版)
# 3. CREATE_INCOME_STATEMENTS_TABLE_SQL
# 4. CREATE_BALANCE_SHEETS_TABLE_SQL
# 5. CREATE_CASH_FLOW_STATEMENTS_TABLE_SQL
# 6. CREATE_FINANCIAL_INDICATORS_TABLE_SQL (汇总表)
# 7. CREATE_DOCUMENTS_TABLE_SQL
# 8. CREATE_CHUNKS_TABLE_SQL (RAG知识库)
# 9. CREATE_INDEXES_SQL (所有索引)
# 10. ADD_COMMENTS_SQL (所有表和字段的备注)
# 11. execute_migration() 主函数