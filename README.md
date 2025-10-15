# 🚀 快速启动指南

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

### 检查虚拟环境 （弃用）
```bash
ls -la mcp-servers/akshare-mcp/venv
# 应该看到虚拟环境目录
```

### 检查 MCP Server （弃用）
```bash
cd mcp-servers/akshare-mcp
python3 server.py
# 应该启动 MCP 服务器（Ctrl+C 退出）
```

### 测试工具 （弃用）
```bash
cd mcp-servers/akshare-mcp
source venv/bin/activate  # 或: ./venv/bin/python
python test.py
# 应该看到测试通过
```



## 🔗 有用的链接

- Groq Console: https://console.groq.com/keys
- Groq 文档: https://console.groq.com/docs
- AKShare 文档: https://akshare.akfamily.xyz/
- MCP 协议: https://modelcontextprotocol.io/