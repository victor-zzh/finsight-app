# Tushare API 集成概要 (MVP 版本)

## 1. 文档目的

本文档旨在为本项目的MVP（最小可行产品）阶段，提供一个清晰、集中的Tushare Pro API使用指南。它详细说明了为了实现四个核心功能，我们需要调用哪些API、由哪个系统组件调用，以及数据的核心用途。

## 2. 核心架构原则：离线与在线分离

我们的数据策略严格遵循离线与在线分离的原则，以保证系统性能和稳定性：

* **离线数据管道 (Python脚本):**
    * **职责:** 负责所有历史数据的提前获取、清洗、计算和存储。这是系统的“数据基石”。
    * **调用频率:** 定时执行（如每日、每周）。
    * **数据流向:** Tushare API -> Python脚本 -> PostgreSQL / Qdrant Cloud。

* **在线服务API (Next.js后端):**
    * **职责:** 负责处理用户实时请求，仅调用那些必须获取即时信息的API。
    * **调用频率:** 按需调用（On-Demand）。
    * **数据流向:** Tushare API -> Next.js后端 -> 前端用户。

---

## 3. 基础数据API (所有分析的基石)

在进行任何分析前，必须首先构建本地的公司主数据列表。

| API接口 | 接口名称 | 描述与目的 | 关键字段 | 调用方 |
| :--- | :--- | :--- | :--- | :--- |
| `stock_basic` | 股票列表 | **[系统初始化]** 获取A股所有公司的基础信息，建立`ts_code`与公司名称、行业的映射关系。这是后续所有数据库查询的“主键”来源。 | `ts_code`, `name`, `industry`, `list_date` | Python (离线) |

---

## 4. MVP功能所需API详解

### 4.1 `get_trend_analysis` & `compare_companies` (趋势分析 & 公司对比)

这两个功能依赖于相同的历史财务数据集。数据由Python脚本提前准备。

| API接口 | 接口名称 | 描述与目的 | 关键字段 | 调用方 |
| :--- | :--- | :--- | :--- | :--- |
| `income` | 利润表 | 获取公司历年的盈利状况，用于分析收入、利润等增长趋势。 | `ts_code`, `end_date`, `revenue`, `n_income`, `grossprofit_margin` | Python (离线) |
| `balancesheet`| 资产负债表 | 获取公司历年的资产与负债结构，用于分析偿债能力和资本结构。 | `ts_code`, `end_date`, `total_assets`, `total_liab` | Python (离线) |
| `cashflow` | 现金流量表 | 获取公司历年的现金流状况，用于分析盈利质量和经营健康度。 | `ts_code`, `end_date`, `n_cashflow_act` | Python (离线) |
| `fina_indicator`| 财务指标 | **[核心]** 直接获取Tushare计算好的关键财务比率，极大简化后端计算。 | `ts_code`, `end_date`, `roe`, `debt_to_assets`, `netprofit_yoy` | Python (离线) |

### 4.2 `get_qualitative_insight` (定性信息问答 - RAG)

此功能需要财报原文作为RAG的数据源。Tushare API在此扮演“信息发现”和“任务触发”的角色。

| API接口 | 接口名称 | 描述与目的 | 关键字段 | 调用方 |
| :--- | :--- | :--- | :--- | :--- |
| `notice` | 上市公司公告 | **[RAG触发器]** 发现新发布的财报公告（如“年度报告”），为后续的PDF下载、解析和向量化提供线索。 | `ts_code`, `ann_date`, `title` | Python (离线) |

### 4.3 `get_realtime_quote` (获取并解读实时行情)

此功能是**唯一**需要在用户请求时进行实时API调用的。

| API接口 | 接口名称 | 描述与目的 | 关键字段 | 调用方 |
| :--- | :--- | :--- | :--- | :--- |
| `daily` | 日线行情 | 获取最新的收盘价、涨跌幅、成交量等核心交易数据。 | `ts_code`, `trade_date`, `close`, `pct_chg`, `vol`, `amount` | **Next.js (在线)** |
| `daily_basic`| 每日指标 | **[核心]** 获取与最新股价相关的动态估值指标，如市盈率、总市值。 | `ts_code`, `trade_date`, `pe_ttm`, `pb`, `total_mv` | **Next.js (在线)** |

---

## 5. 实施要点与建议

1.  **积分管理:** Tushare Pro API调用需要积分。离线脚本应设计得尽可能高效，避免重复调用，例如，只拉取增量更新的数据。
2.  **错误处理:** 封装API调用函数，加入重试逻辑和日志记录，以应对网络波动或API限流。
3.  **数据存储:**
    * `stock_basic`的数据应作为PostgreSQL中的一个“主表”。
    * `fina_indicator`的数据应按`ts_code`和`end_date`建立索引，以优化查询性能。
4.  **实时缓存:** Next.js后端在调用实时行情API后，应设置一个短时间的缓存（如5-10秒），以降低API调用频率并提升响应速度。