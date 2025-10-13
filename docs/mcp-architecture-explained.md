# MCP Server 架构详解 & GLM模型选型

## 问题1：GLM模型选择（财报分析）

### 智谱GLM可用模型

根据智谱AI官方文档，主要有以下模型：

| 模型 | 定位 | 价格 | 推荐场景 | 推荐指数 |
|-----|------|------|---------|---------|
| **GLM-4 Plus** | 旗舰版 | 高 | 复杂推理、长文档 | ⭐⭐⭐⭐⭐ |
| **GLM-4** | 标准版 | 中 | 通用对话、文档处理 | ⭐⭐⭐⭐ |
| **GLM-4 Air** | 轻量版 | 低 | 简单任务、快速响应 | ⭐⭐⭐ |
| **GLM-4 Flash** | 免费版 | 免费 | 测试、简单问答 | ⭐⭐ |

### 财报分析推荐：**GLM-4 Plus** ⭐ 最佳选择

**理由**：

1. **长文本处理能力**
   - 财报PDF通常20-100页
   - GLM-4 Plus支持**128K上下文**
   - 可以一次性处理完整年报

2. **All Tools 功能**
   - 自动调用工具（网页浏览、数据分析）
   - 可以自主搜索行业数据、同行对比
   - 绘制图表（财务趋势图、对比图）

3. **复杂推理能力**
   - 财务指标计算（ROE、负债率等）
   - 风险因素识别（连续亏损、审计意见）
   - 趋势分析（多年度对比）

4. **性能对比**
   - **GLM-4 Plus ≈ GPT-4o** 水平
   - 在数学计算、逻辑推理上表现优秀

### 价格参考

```
GLM-4 Plus: ¥0.1/1K tokens（输入） + ¥0.1/1K tokens（输出）
GLM-4: ¥0.05/1K tokens
GLM-4 Air: ¥0.01/1K tokens
GLM-4 Flash: 免费（有限额）
```

**成本估算**（以一份30页财报为例）：
- 财报PDF → 文本：约50K tokens
- 分析输出：约5K tokens
- **总成本：¥5.5/次** （使用GLM-4 Plus）

### 如何接入GLM-4 Plus

```typescript
// lib/glm-client.ts

import { createOpenAI } from '@ai-sdk/openai';

// 智谱AI兼容OpenAI API
const glm = createOpenAI({
  baseURL: 'https://open.bigmodel.cn/api/paas/v4',
  apiKey: process.env.GLM_API_KEY,
});

export const glm4Plus = glm('glm-4-plus');
export const glm4 = glm('glm-4');
export const glm4Air = glm('glm-4-air');
```

**在分析中使用**：
```typescript
// app/api/analyze-report/route.ts

import { generateText } from 'ai';
import { glm4Plus } from '@/lib/glm-client';

export async function POST(req: Request) {
  const { pdfContent, stockCode } = await req.json();
  
  const result = await generateText({
    model: glm4Plus,
    messages: [
      {
        role: 'system',
        content: `你是A股财报分析专家，精通财务指标计算和风险识别。
        
请分析以下财报，关注：
1. 关键财务指标（ROE、负债率、现金流等）
2. ST风险（连续亏损、净资产为负）
3. 财务造假信号（应收账款异常、现金流背离）
4. 审计意见异常

以结构化格式输出分析结果。`
      },
      {
        role: 'user',
        content: `请分析${stockCode}的以下财报：\n\n${pdfContent}`
      }
    ],
    maxTokens: 4000,
  });
  
  return Response.json({ analysis: result.text });
}
```

---

## 问题2：MCP Server 架构详解

### 什么是MCP Server？

**MCP = Model Context Protocol（模型上下文协议）**

MCP Server是一个**独立运行的服务**，它：
- 封装特定功能（如AKShare数据获取）
- 通过标准协议与AI对话
- 让AI可以像调用函数一样使用外部工具

### 架构图

```
┌─────────────────────────────────────────────────────────┐
│                     你的 Next.js App                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │           AI Chat Interface (前端)                 │  │
│  └─────────────────────┬─────────────────────────────┘  │
│                        │                                 │
│  ┌─────────────────────▼─────────────────────────────┐  │
│  │      /app/api/chat/route.ts (后端API)            │  │
│  │   ┌───────────────────────────────────────────┐   │  │
│  │   │   Vercel AI SDK + MCP Client              │   │  │
│  │   │   - 接收用户消息                           │   │  │
│  │   │   - 调用AI模型（GLM-4 Plus）               │   │  │
│  │   │   - AI决定是否需要调用MCP工具              │   │  │
│  │   └──────────────┬────────────────────────────┘   │  │
│  └──────────────────┼────────────────────────────────┘  │
└───────────────────┼─┼────────────────────────────────┘
                    │ │
                    │ │ MCP协议通信
                    │ │ (stdio/HTTP/SSE)
                    ▼ ▼
┌─────────────────────────────────────────────────────────┐
│            AKShare MCP Server (Python进程)               │
│  ┌───────────────────────────────────────────────────┐  │
│  │  server.py                                        │  │
│  │  - 监听MCP请求                                     │  │
│  │  - 调用AKShare库                                   │  │
│  │  - 返回数据给Next.js                               │  │
│  └───────────────────┬───────────────────────────────┘  │
└──────────────────────┼───────────────────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │   AKShare库      │
              │  - 爬取A股数据   │
              │  - 解析财报      │
              └─────────────────┘
```

### MCP Server 需要独立启动吗？

**答案：是的，但有多种启动方式**

#### 方式1：**STDIO（标准输入输出）** ⭐ 推荐用于本地开发

**特点**：
- MCP Server作为**子进程**被Next.js启动
- 通过stdin/stdout通信
- **无需单独启动服务**
- 生命周期与Next.js绑定

**示例配置**：
```json
// mcp-servers.json（放在项目根目录）
{
  "mcpServers": {
    "akshare": {
      "command": "python",
      "args": ["-m", "akshare_mcp.server"],
      "cwd": "${workspaceFolder}/mcp-servers/akshare-mcp",
      "env": {
        "PYTHONPATH": "${workspaceFolder}/mcp-servers/akshare-mcp"
      }
    }
  }
}
```

**Next.js中的调用**：
```typescript
// 你的 /app/api/chat/route.ts 已经有了这个逻辑
import { initializeMCPClients } from '@/lib/mcp-client';

// 在API路由中
const mcpServers = [
  {
    type: 'stdio',
    command: 'python',
    args: ['-m', 'akshare_mcp.server'],
    cwd: path.join(process.cwd(), 'mcp-servers/akshare-mcp')
  }
];

const { tools } = await initializeMCPClients(mcpServers);
```

**工作流程**：
```
用户消息 → Next.js API
         ↓
Next.js启动Python子进程（MCP Server）
         ↓
AI决定调用工具 → MCP Client通过stdin发送请求
         ↓
Python MCP Server处理 → 调用AKShare
         ↓
通过stdout返回结果 → AI继续对话
         ↓
请求结束 → 子进程关闭
```

#### 方式2：**HTTP/SSE（远程服务）** ⭐ 推荐用于生产环境

**特点**：
- MCP Server作为**独立HTTP服务**运行
- 可部署在任何地方（本地、云端）
- 支持多个Next.js实例共享
- **需要单独启动和维护**

**部署示例**：
```bash
# 启动MCP Server（独立运行）
cd mcp-servers/akshare-mcp
python -m uvicorn server:app --host 0.0.0.0 --port 8001

# 或使用Docker
docker run -d -p 8001:8001 akshare-mcp:latest
```

**Next.js配置**：
```typescript
// 连接到远程MCP Server
const mcpServers = [
  {
    type: 'http',
    url: 'http://localhost:8001/mcp',  // 或云端URL
  }
];
```

### 三种通信方式对比

| 方式 | STDIO | HTTP | SSE |
|-----|-------|------|-----|
| **部署** | 子进程 | 独立服务 | 独立服务 |
| **启动** | 自动启动 | 需手动启动 | 需手动启动 |
| **网络** | 本地通信 | HTTP请求 | 实时推送 |
| **延迟** | 极低 | 低 | 低（支持流式） |
| **扩展性** | 单机 | 可分布式 | 可分布式 |
| **适用场景** | 本地开发 | 生产环境 | 实时更新 |

---

## 推荐方案：分阶段实施

### Phase 1：本地开发（STDIO）

**项目结构**：
```
scira-mcp-chat/
├── app/
│   └── api/
│       └── chat/
│           └── route.ts        # 已有的聊天API
├── mcp-servers/                # 新增目录
│   └── akshare-mcp/            # AKShare MCP Server
│       ├── server.py           # MCP服务器代码
│       ├── requirements.txt    # Python依赖
│       └── README.md
├── lib/
│   └── mcp-client.ts          # 已有的MCP客户端
└── mcp-servers.json           # MCP配置文件
```

**优点**：
- ✅ 无需额外部署
- ✅ 开发调试方便
- ✅ 快速验证功能

### Phase 2：生产部署（HTTP）

**部署架构**：
```
Vercel (Next.js App)
       ↓ HTTP
Railway/Render (Python MCP Server)
       ↓
AKShare库 → A股数据源
```

**优点**：
- ✅ 独立扩展MCP服务
- ✅ 多实例共享
- ✅ 便于监控和维护

---

## 实施步骤

### Step 1：创建AKShare MCP Server

```bash
# 创建目录
mkdir -p mcp-servers/akshare-mcp
cd mcp-servers/akshare-mcp

# 创建Python虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install akshare mcp
```

**创建 `server.py`**：
```python
from mcp.server import Server
from mcp.server.stdio import stdio_server
import akshare as ak
import json

app = Server("akshare-mcp")

@app.tool()
async def get_stock_info(stock_code: str) -> str:
    """获取股票基本信息"""
    try:
        # 获取股票信息
        df = ak.stock_individual_info_em(symbol=stock_code)
        return df.to_json(orient='records', force_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)})

@app.tool()
async def get_financial_report(stock_code: str, report_type: str = "利润表") -> str:
    """
    获取财务报表
    
    Args:
        stock_code: 6位股票代码（如600519）
        report_type: 报表类型（利润表/资产负债表/现金流量表）
    """
    try:
        df = ak.stock_financial_report_sina(
            stock=stock_code,
            symbol=report_type
        )
        return df.to_json(orient='records', force_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)})

@app.tool()
async def get_st_list() -> str:
    """获取当前ST股票列表"""
    try:
        df = ak.stock_zh_a_st_em()
        return df.to_json(orient='records', force_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)})

@app.tool()
async def get_financial_indicators(stock_code: str, start_year: str = "2019") -> str:
    """
    获取财务指标
    
    Args:
        stock_code: 6位股票代码
        start_year: 起始年份（如2019）
    """
    try:
        df = ak.stock_financial_analysis_indicator(
            symbol=stock_code,
            start_year=start_year
        )
        return df.to_json(orient='records', force_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)})

if __name__ == "__main__":
    # STDIO模式启动
    import asyncio
    asyncio.run(stdio_server(app))
```

**创建 `requirements.txt`**：
```txt
akshare>=1.14.0
mcp>=0.9.0
pandas>=2.0.0
```

### Step 2：配置Next.js项目

**创建 `mcp-servers.json`**（项目根目录）：
```json
{
  "mcpServers": {
    "akshare": {
      "command": "python",
      "args": ["-m", "server"],
      "cwd": "./mcp-servers/akshare-mcp",
      "env": {
        "PYTHONPATH": "./mcp-servers/akshare-mcp"
      }
    }
  }
}
```

### Step 3：修改聊天API

**更新 `/app/api/chat/route.ts`**：
```typescript
import { initializeMCPClients } from '@/lib/mcp-client';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  // ... 现有代码 ...
  
  // 加载MCP配置
  const mcpConfigPath = path.join(process.cwd(), 'mcp-servers.json');
  const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8'));
  
  // 转换为MCP服务器配置
  const mcpServers = Object.entries(mcpConfig.mcpServers).map(([name, config]: any) => ({
    type: 'stdio',
    command: config.command,
    args: config.args,
    cwd: path.join(process.cwd(), config.cwd),
    env: config.env
  }));
  
  // 初始化MCP客户端
  const { tools, cleanup } = await initializeMCPClients(mcpServers, req.signal);
  
  // ... 使用 tools 调用AI ...
}
```

### Step 4：测试

```bash
# 启动Next.js
npm run dev

# 在浏览器中测试
用户: 查询贵州茅台的最新财报
AI: [自动调用akshare MCP] 正在获取600519的财报数据...
```

---

## 常见问题

### Q1: MCP Server在哪里运行？
**A**: 
- **STDIO模式**：作为Next.js的子进程运行，与Next.js在同一台机器
- **HTTP模式**：独立运行，可以在任何服务器上

### Q2: 需要手动启动MCP Server吗？
**A**:
- **STDIO模式**：不需要，Next.js自动启动
- **HTTP模式**：需要单独启动

### Q3: Vercel部署时MCP Server怎么办？
**A**: 
- Vercel **不支持STDIO模式**（无法运行Python子进程）
- 必须使用**HTTP模式**，将MCP Server部署到：
  - Railway（推荐）
  - Render
  - Google Cloud Run
  - AWS Lambda

### Q4: 多个用户同时使用怎么办？
**A**:
- **STDIO模式**：每个请求启动一个子进程，自动隔离
- **HTTP模式**：共享一个服务，需要服务端处理并发

### Q5: 如何调试MCP Server？
**A**:
```bash
# 直接运行Python服务器测试
cd mcp-servers/akshare-mcp
python server.py

# 然后在另一个终端测试
echo '{"jsonrpc":"2.0","method":"get_stock_info","params":{"stock_code":"600519"},"id":1}' | python server.py
```

---

## 总结

1. **GLM模型选择**：
   - 推荐 **GLM-4 Plus** 用于财报分析
   - 长文本处理 + 复杂推理 + All Tools
   - 成本约¥5.5/次分析

2. **MCP Server架构**：
   - **本地开发**：STDIO模式，自动启动Python子进程
   - **生产部署**：HTTP模式，独立服务部署
   - **位置**：在 `mcp-servers/akshare-mcp/` 目录下
   - **启动**：STDIO自动启动，HTTP需手动启动

3. **下一步行动**：
   - 我可以帮你立即创建 `akshare-mcp` 服务器代码
   - 配置好后，就可以在对话中实时查询A股数据了！

需要我现在创建MCP Server代码吗？
