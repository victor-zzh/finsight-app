# AKShare MCP Server

A股财报数据获取服务，基于 [AKShare](https://github.com/akfamily/akshare) 开源库。

## 功能

提供5个核心工具，让AI助手可以实时查询A股数据：

| 工具 | 功能 | 示例 |
|-----|------|------|
| `get_stock_info` | 获取股票基本信息 | 公司名称、上市日期、行业 |
| `get_financial_report` | 获取财务报表 | 利润表、资产负债表、现金流 |
| `get_st_list` | 获取ST股票列表 | 所有ST、*ST股票 |
| `get_financial_indicators` | 获取财务指标 | ROE、毛利率、净利率等 |
| `search_stock_by_name` | 搜索股票代码 | 根据公司名称查找代码 |

## 快速开始

### 1. 安装依赖

```bash
cd mcp-servers/akshare-mcp

# 创建虚拟环境（推荐）
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt
```

### 2. 测试服务器

```bash
# 直接运行测试
python server.py
```

服务器会启动并监听stdio输入。你可以发送JSON-RPC请求测试：

```bash
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_stock_info","arguments":{"stock_code":"600519"}},"id":1}' | python server.py
```

### 3. 在Next.js中使用

服务器会被Next.js自动启动，无需手动运行。参见项目根目录的 `mcp-servers.json` 配置。

## 工具详细说明

### 1. get_stock_info

获取股票基本信息。

**参数**：
- `stock_code` (string, 必需): 6位股票代码，如 "600519"

**返回示例**：
```json
{
  "stock_code": "600519",
  "info": {
    "股票简称": "贵州茅台",
    "股票代码": "600519",
    "上市日期": "2001-08-27",
    "总市值": "2234000000000",
    "流通市值": "2234000000000"
  }
}
```

### 2. get_financial_report

获取财务报表。

**参数**：
- `stock_code` (string, 必需): 6位股票代码
- `report_type` (string, 可选): 报表类型，默认"利润表"
  - "利润表"
  - "资产负债表"
  - "现金流量表"

**返回示例**：
```json
[
  {
    "截止日期": "2024-12-31",
    "营业收入": "150670000000",
    "营业成本": "32450000000",
    "营业利润": "123200000000",
    "净利润": "74740000000"
  }
]
```

### 3. get_st_list

获取当前所有ST股票列表。

**参数**：无

**返回示例**：
```json
{
  "data": [
    {
      "代码": "600634",
      "名称": "*ST富控",
      "ST原因": "连续两年亏损"
    }
  ],
  "count": 50,
  "message": "共找到 50 只ST股票"
}
```

### 4. get_financial_indicators

获取财务指标（多年度）。

**参数**：
- `stock_code` (string, 必需): 6位股票代码
- `start_year` (string, 可选): 起始年份，默认"2019"

**返回示例**：
```json
[
  {
    "报告期": "2024-12-31",
    "净资产收益率": "0.335",
    "总资产收益率": "0.257",
    "销售毛利率": "0.913",
    "销售净利率": "0.496",
    "资产负债率": "0.221"
  }
]
```

### 5. search_stock_by_name

根据公司名称搜索股票。

**参数**：
- `keyword` (string, 必需): 公司名称关键词

**返回示例**：
```json
{
  "data": [
    {"code": "600519", "name": "贵州茅台"},
    {"code": "000858", "name": "五粮液"}
  ],
  "count": 2,
  "message": "找到 2 只匹配的股票"
}
```

## 数据来源

所有数据来自以下公开数据源：
- 新浪财经
- 东方财富
- 巨潮资讯网

数据仅供学习研究使用，不构成投资建议。

## 常见问题

### Q: 为什么获取数据失败？

A: 可能原因：
1. 股票代码错误（必须是6位数字）
2. 网络连接问题
3. 数据源临时不可用
4. AKShare接口变更

### Q: 数据更新频率？

A: 实时查询，数据来自AKShare的数据源，通常：
- 基本信息：日更新
- 财务报表：季度更新（财报披露后）
- ST列表：实时更新

### Q: 支持哪些股票？

A: 支持所有A股上市公司，包括：
- 上交所（600xxx, 601xxx, 603xxx, 688xxx）
- 深交所（000xxx, 001xxx, 002xxx, 003xxx, 300xxx）
- 北交所（8xxxxx, 4xxxxx）

## 许可证

本项目基于 MIT 许可证开源。

AKShare 库基于 MIT 许可证。
