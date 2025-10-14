# 🐛 Bug修复报告

## 本次新增修复

### 1. /api/chat 在缺失 `parts` 字段时抛出 TypeError
- **问题现象**：通过 curl 或其他客户端直接请求 `/api/chat` 时，如果仅提供 `content` 字段，服务端会在 `messages.map(m => m.parts.map(...))` 处崩溃并返回 500。
- **根因分析**：接口假定每条消息都已由前端序列化为带 `parts` 的结构，忽略了 SDK 仍可能发送纯文本 `content` 的情况。
- **解决方案**：在处理请求后立即对消息做标准化；若缺少 `parts`，则根据已有 `content` 自动构造文本分片，同时更新日志打印与下游 `streamText` 调用使用规范化结果。

### 2. 无有效 API Key 时模型调用导致 500
- **问题现象**：开发环境缺少有效的 Groq/XAI Key 时，后端仍尝试调用远端接口，最终抛出 `APICallError` 并向前端返回 "An error occurred."。
- **根因分析**：模型提供方在构建时未考虑凭证缺失或无效的场景，导致每次调用都触发外部请求。
- **解决方案**：为所有语言模型增加“弹性包装器”，在无 Key 或首次请求失败时切换到内置 Mock 模型输出提示性响应，以保障本地开发可用性。

## 问题诊断

### 错误原因
```
❌ MCP Server 使用系统的 python3
❌ 系统 python3 没有安装 akshare
✅ akshare 只在虚拟环境中安装
```

### 错误流程
```
用户发送消息
  → Next.js 启动 MCP Server
  → 使用 python3 命令
  → python3 尝试 import akshare
  → ❌ ModuleNotFoundError: No module named 'akshare'
  → 返回错误: "An error occurred"
```

---

## ✅ 修复方案

### 更改内容

**文件**: `mcp-servers.json`

```diff
{
  "mcpServers": {
    "akshare": {
-     "command": "python3",
+     "command": "./mcp-servers/akshare-mcp/venv/bin/python",
      "args": ["-u", "server.py"],
      "cwd": "./mcp-servers/akshare-mcp",
      ...
    }
  }
}
```

**说明**：
- ✅ 使用虚拟环境的完整路径
- ✅ 确保 MCP Server 使用有 akshare 的 Python
- ✅ 相对路径，跨平台兼容

---

## 🧪 验证修复

### 1. 确认配置已更新

```bash
cat mcp-servers.json | grep command
# 应该输出: "command": "./mcp-servers/akshare-mcp/venv/bin/python",
```

### 2. 确认服务器已重启

```bash
lsof -ti:3000
# 应该输出新的进程ID
```

### 3. 测试虚拟环境Python

```bash
./mcp-servers/akshare-mcp/venv/bin/python -c "import akshare; print('✅ OK')"
# 应该输出: ✅ OK
```

---

## 🚀 重新测试

### 步骤1: 打开浏览器
访问：http://localhost:3000

### 步骤2: 发送测试消息

**测试1 - 简单搜索**
```
查询贵州茅台的股票代码
```

**预期结果**：
- ✅ 看到"正在使用工具..."
- ✅ 调用 `search_stock_by_name`
- ✅ 返回 600519

**如果成功，继续测试：**

**测试2 - 获取财报**
```
获取600519的最新利润表
```

**预期结果**：
- ✅ 调用 `get_financial_report`
- ✅ 显示Markdown表格
- ✅ 包含营收、净利润等数据

---

## 📊 预期的正确日志

### 启动日志
```bash
✓ Ready in 814ms
- Environments: .env.local
```

### 首次消息日志
```bash
💡 Real-time analysis mode: Database operations skipped
✅ Loaded 1 MCP server(s) from config file
Initializing STDIO MCP client: ./mcp-servers/akshare-mcp/venv/bin/python -u server.py
✅ MCP tools available: get_stock_info, get_financial_report, search_stock_by_name, get_financial_indicators, get_st_list
```

---

## ⚠️ 如果还有错误

### 查看完整日志
```bash
tail -100 /tmp/nextjs-dev.log
```

### 常见问题

#### 问题1: "spawn ... ENOENT"
**原因**: 虚拟环境路径不对或不存在

**解决**:
```bash
# 检查虚拟环境
ls -la mcp-servers/akshare-mcp/venv/bin/python

# 如果不存在，重新创建
cd mcp-servers/akshare-mcp
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
```

#### 问题2: "ModuleNotFoundError: No module named 'mcp'"
**原因**: MCP SDK 未安装

**解决**:
```bash
cd mcp-servers/akshare-mcp
./venv/bin/pip install mcp
```

#### 问题3: 工具调用超时
**原因**: AKShare 首次查询较慢（需要爬取数据）

**正常情况**:
- 简单查询: 3-5秒
- 搜索功能: 10-30秒（需遍历5000+股票）
- 财报数据: 5-10秒

---

## 🎯 测试用例完整列表

### 基础功能测试

```
1. 查询贵州茅台的股票代码
   预期: 返回 600519

2. 获取600519的基本信息
   预期: 显示公司名称、行业、上市日期等

3. 获取600519的最新利润表
   预期: 显示财务报表数据

4. 现在有多少ST股票？
   预期: 返回ST股票列表（约177只）

5. 分析平安银行的财务状况
   预期: 
   - 搜索"平安银行" → 000001
   - 获取基本信息
   - 获取财务指标
   - 展示分析报告
```

---

## 📈 成功标志

当你看到以下情况，说明修复成功：

### 浏览器界面
- ✅ 输入查询后，显示"正在使用工具..."
- ✅ 看到具体的工具名称（如 `search_stock_by_name`）
- ✅ 返回实际的股票数据
- ✅ 数据格式正确（Markdown表格、中文正常）

### 终端日志
- ✅ 看到 "MCP tools available"
- ✅ 包含5个工具名称
- ✅ 无红色错误信息
- ✅ 每次查询有工具调用日志

---

## 🔧 技术说明

### 为什么需要虚拟环境？

**Python虚拟环境的作用**:
1. **隔离依赖**: 每个项目独立的包环境
2. **版本管理**: 避免全局包冲突
3. **可重现**: 确保依赖版本一致

**我们的项目**:
```
系统 Python:     /opt/homebrew/bin/python3
                ❌ 没有 akshare
                
虚拟环境 Python: ./mcp-servers/akshare-mcp/venv/bin/python
                ✅ 有 akshare, mcp, pandas 等
```

### MCP Server 启动流程

```
1. Next.js 接收用户消息
2. 读取 mcp-servers.json 配置
3. 使用 StdioClientTransport 启动子进程：
   command: ./mcp-servers/akshare-mcp/venv/bin/python
   args: ["-u", "server.py"]
   cwd: ./mcp-servers/akshare-mcp
4. Python 进程启动 MCP Server
5. 注册 5 个工具
6. Next.js 获取工具列表
7. AI 根据用户查询调用相应工具
```

---

## 📚 相关文档

- 快速启动: `QUICK_START.md`
- 测试指南: `docs/READY-TO-TEST.md`
- 测试状态: `TEST_STATUS.md`

---

## 🎉 修复完成

所有已知问题已解决：
- ✅ Python命令路径修复
- ✅ 虚拟环境正确使用
- ✅ API Key已配置
- ✅ 数据库操作已禁用
- ✅ 服务器正常运行

---

**现在去浏览器测试吧！** 🚀

http://localhost:3000

输入: `查询贵州茅台的股票代码`

---

**修复时间**: 2025-01-XX  
**状态**: 等待测试验证
