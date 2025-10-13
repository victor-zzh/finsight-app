#!/usr/bin/env python3
"""
AKShare MCP Server 测试脚本

直接测试AKShare功能，无需启动MCP服务器
"""

import akshare as ak
import json


def test_stock_info():
    """测试：获取股票基本信息"""
    print("\n" + "="*60)
    print("测试1：获取贵州茅台(600519)基本信息")
    print("="*60)
    
    try:
        df = ak.stock_individual_info_em(symbol="600519")
        print("\n✅ 成功获取数据：")
        print(df.to_string())
    except Exception as e:
        print(f"\n❌ 失败：{e}")


def test_financial_report():
    """测试：获取财务报表"""
    print("\n" + "="*60)
    print("测试2：获取贵州茅台利润表")
    print("="*60)
    
    try:
        df = ak.stock_financial_report_sina(
            stock="600519",
            symbol="利润表"
        )
        print("\n✅ 成功获取数据（显示前5行）：")
        print(df.head().to_string())
        print(f"\n共 {len(df)} 行数据")
    except Exception as e:
        print(f"\n❌ 失败：{e}")


def test_st_list():
    """测试：获取ST股票列表"""
    print("\n" + "="*60)
    print("测试3：获取ST股票列表")
    print("="*60)
    
    try:
        df = ak.stock_zh_a_st_em()
        print(f"\n✅ 成功获取数据，共 {len(df)} 只ST股票")
        print("\n前10只：")
        print(df.head(10).to_string())
    except Exception as e:
        print(f"\n❌ 失败：{e}")


def test_financial_indicators():
    """测试：获取财务指标"""
    print("\n" + "="*60)
    print("测试4：获取贵州茅台财务指标（2019年至今）")
    print("="*60)
    
    try:
        df = ak.stock_financial_analysis_indicator(
            symbol="600519",
            start_year="2019"
        )
        print("\n✅ 成功获取数据（显示前5行）：")
        
        # 只显示部分关键列
        key_columns = ['报告期', '净资产收益率', '销售毛利率', '销售净利率', '资产负债率']
        available_columns = [col for col in key_columns if col in df.columns]
        
        if available_columns:
            print(df[available_columns].head().to_string())
        else:
            print(df.head().to_string())
        
        print(f"\n共 {len(df)} 个报告期")
    except Exception as e:
        print(f"\n❌ 失败：{e}")


def test_stock_search():
    """测试：搜索股票"""
    print("\n" + "="*60)
    print("测试5：搜索包含'茅台'的股票")
    print("="*60)
    
    try:
        df = ak.stock_info_a_code_name()
        matched = df[df['name'].str.contains('茅台', case=False, na=False)]
        
        print(f"\n✅ 成功，找到 {len(matched)} 只股票：")
        print(matched.to_string())
    except Exception as e:
        print(f"\n❌ 失败：{e}")


def main():
    print("""
╔══════════════════════════════════════════════════════════╗
║          AKShare MCP Server 功能测试                      ║
║                                                          ║
║  测试所有工具是否正常工作                                  ║
╚══════════════════════════════════════════════════════════╝
    """)
    
    try:
        # 运行所有测试
        test_stock_info()
        test_financial_report()
        test_st_list()
        test_financial_indicators()
        test_stock_search()
        
        print("\n" + "="*60)
        print("✅ 所有测试完成！")
        print("="*60)
        print("\n📝 说明：")
        print("  - 如果所有测试都显示 ✅，说明AKShare工作正常")
        print("  - 如果出现 ❌，请检查网络连接或AKShare版本")
        print("  - 数据来源于公开数据源，可能偶尔不可用")
        print("\n下一步：运行 'python server.py' 启动MCP服务器")
        
    except KeyboardInterrupt:
        print("\n\n测试已中断")
    except Exception as e:
        print(f"\n\n❌ 测试失败：{e}")


if __name__ == "__main__":
    main()
