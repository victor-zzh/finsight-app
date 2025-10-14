#!/usr/bin/env python3
"""
AKShare MCP Server - A股财报数据获取服务

提供以下工具：
1. get_stock_info - 获取股票基本信息
2. get_financial_report - 获取财务报表
3. get_st_list - 获取ST股票列表
4. get_financial_indicators - 获取财务指标
"""

import asyncio
import json
import sys
from typing import Any, Awaitable, Callable, Dict, Optional

try:
    import akshare as ak
    import pandas as pd
except ImportError:
    print("错误：请先安装依赖: pip install akshare pandas", file=sys.stderr)
    sys.exit(1)

try:
    from mcp.server import Server
    from mcp.server.stdio import stdio_server
    import mcp.types as types
except ImportError:
    print("错误：请先安装MCP SDK: pip install mcp", file=sys.stderr)
    sys.exit(1)


# 创建MCP服务器实例
app = Server("akshare-mcp")

ToolHandler = Callable[..., Awaitable[str]]


def safe_json_response(data: Any, error: str = None) -> str:
    """安全地转换数据为JSON字符串"""
    if error:
        return json.dumps({"error": error}, ensure_ascii=False)
    
    if isinstance(data, pd.DataFrame):
        # DataFrame转JSON
        if data.empty:
            return json.dumps({"data": [], "message": "无数据"}, ensure_ascii=False)
        return data.to_json(orient='records', force_ascii=False, date_format='iso')
    
    return json.dumps(data, ensure_ascii=False)


async def get_stock_info(stock_code: str) -> str:
    """
    获取A股股票基本信息
    
    Args:
        stock_code: 6位股票代码，如 600519（贵州茅台）
    
    Returns:
        JSON格式的股票基本信息，包括公司名称、上市日期、行业等
    
    Example:
        get_stock_info("600519")
    """
    try:
        # 验证股票代码格式
        if not stock_code or len(stock_code) != 6:
            return safe_json_response(None, "股票代码必须是6位数字")
        
        # 获取股票信息
        df = ak.stock_individual_info_em(symbol=stock_code)
        
        if df is None or df.empty:
            return safe_json_response(None, f"未找到股票代码 {stock_code} 的信息")
        
        # 转换为字典格式
        info_dict = {}
        for _, row in df.iterrows():
            key = str(row['item']) if 'item' in row else str(row.iloc[0])
            value = str(row['value']) if 'value' in row else str(row.iloc[1])
            info_dict[key] = value
        
        return json.dumps({
            "stock_code": stock_code,
            "info": info_dict
        }, ensure_ascii=False)
        
    except Exception as e:
        return safe_json_response(None, f"获取股票信息失败: {str(e)}")
async def get_financial_report(
    stock_code: str, 
    report_type: str = "利润表"
) -> str:
    """
    获取A股公司财务报表
    
    Args:
        stock_code: 6位股票代码，如 600519
        report_type: 报表类型，可选值：
            - "利润表" (默认)
            - "资产负债表"
            - "现金流量表"
    
    Returns:
        JSON格式的财务报表数据，包含多个报告期的数据
    
    Example:
        get_financial_report("600519", "利润表")
    """
    try:
        # 验证参数
        if not stock_code or len(stock_code) != 6:
            return safe_json_response(None, "股票代码必须是6位数字")
        
        valid_types = ["利润表", "资产负债表", "现金流量表"]
        if report_type not in valid_types:
            return safe_json_response(None, f"报表类型必须是: {', '.join(valid_types)}")
        
        # 获取财务报表
        df = ak.stock_financial_report_sina(
            stock=stock_code,
            symbol=report_type
        )
        
        if df is None or df.empty:
            return safe_json_response(None, f"未找到 {stock_code} 的{report_type}数据")
        
        return safe_json_response(df)
        
    except Exception as e:
        return safe_json_response(None, f"获取财务报表失败: {str(e)}")
async def get_st_list() -> str:
    """
    获取当前A股市场所有ST股票列表
    
    Returns:
        JSON格式的ST股票列表，包括代码、名称、ST原因等
    
    Example:
        get_st_list()
    """
    try:
        # 获取ST股票列表
        df = ak.stock_zh_a_st_em()
        
        if df is None or df.empty:
            return json.dumps({
                "data": [],
                "message": "当前没有ST股票",
                "count": 0
            }, ensure_ascii=False)
        
        # 添加统计信息
        result = {
            "data": json.loads(df.to_json(orient='records', force_ascii=False)),
            "count": len(df),
            "message": f"共找到 {len(df)} 只ST股票"
        }
        
        return json.dumps(result, ensure_ascii=False)
        
    except Exception as e:
        return safe_json_response(None, f"获取ST股票列表失败: {str(e)}")
async def get_financial_indicators(
    stock_code: str, 
    start_year: str = "2019"
) -> str:
    """
    获取A股公司主要财务指标（东方财富数据源）
    
    Args:
        stock_code: 6位股票代码，如 600519
        start_year: 起始年份，如 "2019" (默认)
    
    Returns:
        JSON格式的财务指标数据，包括ROE、毛利率、净利率等关键指标
    
    Example:
        get_financial_indicators("600519", "2019")
    """
    try:
        # 验证参数
        if not stock_code or len(stock_code) != 6:
            return safe_json_response(None, "股票代码必须是6位数字")
        
        # 验证年份格式
        try:
            year = int(start_year)
            if year < 2000 or year > 2030:
                return safe_json_response(None, "年份必须在2000-2030之间")
        except ValueError:
            return safe_json_response(None, "年份格式错误，应为4位数字，如'2019'")
        
        # 获取财务指标
        df = ak.stock_financial_analysis_indicator(
            symbol=stock_code,
            start_year=start_year
        )
        
        if df is None or df.empty:
            return safe_json_response(None, f"未找到 {stock_code} 从{start_year}年至今的财务指标")
        
        return safe_json_response(df)
        
    except Exception as e:
        return safe_json_response(None, f"获取财务指标失败: {str(e)}")
async def analyze_company(
    keyword: str,
    report_type: str = "利润表",
    start_year: str = "2019"
) -> str:
    """综合分析指定公司，返回股票代码、基本信息、财报及财务指标。"""

    def normalize_stock_code(code: str) -> Optional[str]:
        code = (code or "").strip()
        if len(code) == 6 and code.isdigit():
            return code
        return None

    try:
        if not keyword or len(keyword.strip()) == 0:
            return safe_json_response(None, "公司名称或股票代码不能为空")

        keyword = keyword.strip()
        stock_code = normalize_stock_code(keyword)
        stock_name: Optional[str] = None

        if stock_code is None:
            df_codes = ak.stock_info_a_code_name()
            if df_codes is None or df_codes.empty:
                return safe_json_response(None, "无法获取A股代码列表")

            matched = df_codes[df_codes['name'].str.contains(keyword, case=False, na=False)]

            if matched.empty:
                return safe_json_response(None, f"未找到与 '{keyword}' 匹配的A股公司")

            top = matched.iloc[0]
            stock_code = str(top['code']).zfill(6)
            stock_name = str(top['name'])
        else:
            df_codes = ak.stock_info_a_code_name()
            if df_codes is not None and not df_codes.empty:
                matched = df_codes[df_codes['code'] == stock_code]
                if not matched.empty:
                    stock_name = str(matched.iloc[0]['name'])

        if stock_code is None:
            return safe_json_response(None, "未能识别有效的股票代码")

        if report_type not in ["利润表", "资产负债表", "现金流量表"]:
            return safe_json_response(None, "报表类型必须是: 利润表、资产负债表、现金流量表")

        try:
            year_value = int(start_year)
            if year_value < 2000 or year_value > 2030:
                return safe_json_response(None, "年份必须在2000-2030之间")
        except ValueError:
            return safe_json_response(None, "年份格式错误，应为4位数字，如'2019'")

        stock_info_json = await get_stock_info(stock_code)
        stock_info_data = json.loads(stock_info_json)
        if isinstance(stock_info_data, dict) and stock_info_data.get("error"):
            stock_info = None
        else:
            stock_info = stock_info_data.get("info") if isinstance(stock_info_data, dict) else None

        report_df = ak.stock_financial_report_sina(stock=stock_code, symbol=report_type)
        indicators_df = ak.stock_financial_analysis_indicator(symbol=stock_code, start_year=start_year)

        if report_df is not None and not report_df.empty:
            report_df = report_df.copy()
            if '报告日' in report_df.columns:
                report_df = report_df[report_df['报告日'].astype(str).str[:4].astype(int) >= int(start_year)]
                report_df = report_df.sort_values('报告日', ascending=False)

        if indicators_df is not None and not indicators_df.empty:
            if '日期' in indicators_df.columns:
                indicators_df = indicators_df[indicators_df['日期'].astype(str).str[:4].astype(int) >= int(start_year)]
                indicators_df = indicators_df.sort_values('日期', ascending=False)

        analysis = {
            "stock_code": stock_code,
            "stock_name": stock_name or stock_info_data.get("info", {}).get("股票简称") if isinstance(stock_info_data, dict) else None,
            "report_type": report_type,
            "start_year": start_year,
            "basic_info": stock_info,
            "financial_report": [],
            "financial_indicators": [],
        }

        if report_df is not None and not report_df.empty:
            analysis["financial_report"] = json.loads(report_df.to_json(orient='records', force_ascii=False))
        else:
            analysis["financial_report_message"] = f"未找到 {stock_code} 的{report_type}数据"

        if indicators_df is not None and not indicators_df.empty:
            analysis["financial_indicators"] = json.loads(indicators_df.to_json(orient='records', force_ascii=False))
        else:
            analysis["financial_indicators_message"] = f"未找到 {stock_code} 从{start_year}年至今的财务指标"

        return json.dumps(analysis, ensure_ascii=False)

    except Exception as e:
        return safe_json_response(None, f"公司分析失败: {str(e)}")
async def search_stock_by_name(keyword: str) -> str:
    """
    根据公司名称关键词搜索股票代码
    
    Args:
        keyword: 公司名称关键词，如 "茅台"、"平安"
    
    Returns:
        JSON格式的匹配股票列表
    
    Example:
        search_stock_by_name("茅台")
    """
    try:
        if not keyword or len(keyword.strip()) == 0:
            return safe_json_response(None, "搜索关键词不能为空")
        
        # 获取所有A股列表
        df = ak.stock_info_a_code_name()
        
        if df is None or df.empty:
            return safe_json_response(None, "获取股票列表失败")
        
        # 模糊搜索
        keyword = keyword.strip()
        matched = df[df['name'].str.contains(keyword, case=False, na=False)]
        
        if matched.empty:
            return json.dumps({
                "data": [],
                "message": f"未找到包含'{keyword}'的股票",
                "count": 0
            }, ensure_ascii=False)
        
        result = {
            "data": json.loads(matched.to_json(orient='records', force_ascii=False)),
            "count": len(matched),
            "message": f"找到 {len(matched)} 只匹配的股票"
        }
        
        return json.dumps(result, ensure_ascii=False)
        
    except Exception as e:
        return safe_json_response(None, f"搜索股票失败: {str(e)}")


TOOL_REGISTRY: Dict[str, Dict[str, Any]] = {
    "get_stock_info": {
        "handler": get_stock_info,
        "description": "获取A股股票的基本信息，包括公司名称、上市日期、行业等。",
        "input_schema": {
            "type": "object",
            "properties": {
                "stock_code": {
                    "type": "string",
                    "description": "6位A股股票代码，例如 600519"
                }
            },
            "required": ["stock_code"],
        },
    },
    "get_financial_report": {
        "handler": get_financial_report,
        "description": "获取指定股票的财务报表，支持利润表、资产负债表和现金流量表。",
        "input_schema": {
            "type": "object",
            "properties": {
                "stock_code": {
                    "type": "string",
                    "description": "6位A股股票代码，例如 600519"
                },
                "report_type": {
                    "type": "string",
                    "description": "财务报表类型。可选值：利润表、资产负债表、现金流量表",
                    "enum": ["利润表", "资产负债表", "现金流量表"],
                },
            },
            "required": ["stock_code"],
        },
    },
    "get_st_list": {
        "handler": get_st_list,
        "description": "获取当前A股市场所有ST股票列表。",
        "input_schema": {
            "type": "object",
            "properties": {},
        },
    },
    "get_financial_indicators": {
        "handler": get_financial_indicators,
        "description": "获取指定股票自某年份以来的主要财务指标（ROE、毛利率等）。",
        "input_schema": {
            "type": "object",
            "properties": {
                "stock_code": {
                    "type": "string",
                    "description": "6位A股股票代码，例如 600519"
                },
                "start_year": {
                    "type": "string",
                    "description": "起始年份，格式为4位数字，例如 2019",
                    "pattern": "^\\d{4}$",
                },
            },
            "required": ["stock_code"],
        },
    },
    "search_stock_by_name": {
        "handler": search_stock_by_name,
        "description": "根据公司名称关键词搜索A股股票代码。",
        "input_schema": {
            "type": "object",
            "properties": {
                "keyword": {
                    "type": "string",
                    "description": "公司名称关键词，例如 茅台、平安"
                }
            },
            "required": ["keyword"],
        },
    },
    "analyze_company": {
        "handler": analyze_company,
        "description": "综合分析指定公司，返回股票代码、基本信息、财报及财务指标。",
        "input_schema": {
            "type": "object",
            "properties": {
                "keyword": {
                    "type": "string",
                    "description": "公司名称关键词或6位股票代码"
                },
                "report_type": {
                    "type": "string",
                    "description": "财务报表类型，默认利润表，可选：利润表、资产负债表、现金流量表",
                    "enum": ["利润表", "资产负债表", "现金流量表"],
                    "default": "利润表"
                },
                "start_year": {
                    "type": "string",
                    "description": "财务指标起始年份（2000-2030），默认2019",
                    "pattern": "^\\d{4}$",
                    "default": "2019"
                }
            },
            "required": ["keyword"],
        },
    },
}


@app.list_tools()
async def list_tools(_: types.ListToolsRequest | None = None) -> types.ListToolsResult:
    tools = [
        types.Tool(
            name=name,
            description=config["description"],
            inputSchema=config["input_schema"],
        )
        for name, config in TOOL_REGISTRY.items()
    ]

    return types.ListToolsResult(tools=tools)


@app.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any] | None) -> Any:
    tool_config = TOOL_REGISTRY.get(name)
    if not tool_config:
        raise ValueError(f"未知工具: {name}")

    handler: ToolHandler = tool_config["handler"]
    args = arguments or {}

    try:
        result = await handler(**args)
    except TypeError as exc:
        raise ValueError(f"调用参数错误: {exc}") from exc

    if not isinstance(result, str):
        result = json.dumps(result, ensure_ascii=False)

    return [types.TextContent(type="text", text=result)]

async def main():
    """运行MCP服务器"""
    try:
        # 使用stdio传输协议启动服务器
        async with stdio_server() as (read_stream, write_stream):
            await app.run(
                read_stream,
                write_stream,
                app.create_initialization_options()
            )
    except KeyboardInterrupt:
        print("\n服务器已停止", file=sys.stderr)
    except Exception as e:
        print(f"服务器错误: {e}", file=sys.stderr)
        raise


if __name__ == "__main__":
    # 设置事件循环策略（Windows兼容）
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    # 运行服务器
    asyncio.run(main())
