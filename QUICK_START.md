# 🚀 快速启动指南

> 修复 MCP 配置和 API Key 问题

---

## ✅ 问题已修复

### 1. Python 命令 ✅
```diff
- "command": "python"     ❌ macOS没有python命令
+ "command": "python3"    ✅ 已修复
```

### 2. 创建环境变量文件 ✅
已创建 `.env.local` - 需要填入 API Key

---

## 🔑 获取免费 Groq API Key（推荐）

### 为什么选 Groq？
- ✅ **完全免费** - 无需信用卡
- ✅ **超快速度** - LPU推理引擎
- ✅ **无限配额** - 测试阶段
- ✅ **支持多模型** - Llama、Qwen、Kimi等

### 获取步骤（2分钟）

#### 1. 访问 Groq Console
https://console.groq.com/keys

#### 2. 注册/登录
- 使用 Google/GitHub 账号登录
- 或邮箱注册（无需验证）

#### 3. 创建 API Key
- 点击 "Create API Key"
- 复制生成的 Key（以 `gsk_` 开头）

#### 4. 配置到项目
```bash
# 编辑 .env.local
GROQ_API_KEY="gsk_xxxxxxxxxxxxxxxx"
```

---

## 🎯 启动步骤

### 步骤1：配置 API Key

```bash
# 编辑配置文件
code .env.local

# 或使用 nano
nano .env.local
```

填入你的 Groq API Key：
```env
GROQ_API_KEY="gsk_your_actual_key_here"
```

### 步骤2：启动服务器

```bash
npm run dev
```

### 步骤3：测试

访问：http://localhost:3000

输入测试查询：
```
查询贵州茅台的股票代码
```

---

## 🔍 验证配置

### 检查 Python 命令
```bash
which python3
# 应该输出: /opt/homebrew/bin/python3 或类似路径
```

### 检查虚拟环境
```bash
ls -la mcp-servers/akshare-mcp/venv
# 应该看到虚拟环境目录
```

### 检查 MCP Server
```bash
cd mcp-servers/akshare-mcp
python3 server.py
# 应该启动 MCP 服务器（Ctrl+C 退出）
```

### 测试工具
```bash
cd mcp-servers/akshare-mcp
source venv/bin/activate  # 或: ./venv/bin/python
python test.py
# 应该看到测试通过
```

---

## 📊 启动后的日志

**正常日志应该是：**

```bash
💡 Real-time analysis mode: Database operations skipped
✅ Loaded 1 MCP server(s) from config file
Initializing STDIO MCP client: python3 -u server.py  # ✅ python3
✅ MCP tools available: get_stock_info, search_stock_by_name, ...
```

**错误日志（如果还有问题）：**

```bash
# 如果看到 "spawn python ENOENT"
# → 检查 mcp-servers.json 是否使用 python3

# 如果看到 "Groq API key is missing"
# → 检查 .env.local 是否有 GROQ_API_KEY

# 如果看到 "ModuleNotFoundError: No module named 'akshare'"
# → 运行: cd mcp-servers/akshare-mcp && ./venv/bin/pip install -r requirements.txt
```

---

## 🆘 常见问题

### Q1: 没有 Groq 账号怎么办？

**方案A：使用其他免费API**

编辑 `.env.local`：
```bash
# XAI (grok-3-mini)
XAI_API_KEY="your_xai_key"
```

前端选择模型：Grok 3 Mini

**方案B：使用本地模型（需要安装Ollama）**

这需要额外配置，暂时建议先用 Groq。

### Q2: API Key 无效

检查：
- 是否以 `gsk_` 开头
- 是否有空格或换行
- 是否放在引号内

### Q3: MCP Server 启动失败

```bash
# 1. 检查虚拟环境
ls mcp-servers/akshare-mcp/venv

# 2. 重新安装依赖
cd mcp-servers/akshare-mcp
python3 -m venv venv
./venv/bin/pip install -r requirements.txt

# 3. 测试 MCP Server
./venv/bin/python server.py
```

### Q4: 工具调用失败

查看浏览器控制台（F12）或终端日志：
```bash
tail -f /tmp/nextjs-dev.log
```

---

## 🎉 成功标志

当你看到以下界面，说明成功了：

1. **浏览器** http://localhost:3000 正常打开
2. **输入查询** "查询贵州茅台的股票代码"
3. **AI响应** 显示"正在使用工具..."
4. **返回结果** 展示股票信息和代码

---

## 📚 相关文档

- **测试指南**: `docs/READY-TO-TEST.md`
- **架构文档**: `docs/a-share-financial-analysis-architecture.md`
- **MCP说明**: `docs/mcp-architecture-explained.md`

---

## 🔗 有用的链接

- Groq Console: https://console.groq.com/keys
- Groq 文档: https://console.groq.com/docs
- AKShare 文档: https://akshare.akfamily.xyz/
- MCP 协议: https://modelcontextprotocol.io/

---

**创建时间**: 2025-01-XX
**最后更新**: 2025-01-XX
