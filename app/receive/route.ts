// app/receive/route.js
import { NextRequest, NextResponse } from 'next/server';

const FEISHU_WEBHOOK_URL = process.env.FEISHU_WEBHOOK_URL || 'https://open.feishu.cn/webhook/your-webhook-url-here';

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.name || !body.nickname || !body.likes) {
      return NextResponse.json({ error: '缺少必要字段' }, { status: 400 });
    }

    const message = {
      msg_type: 'interactive',
      card: {
        config: { wide_screen_mode: true },
        header: { title: { content: '🔥 新商品上榜！', tag: 'plain_text' }, template: 'blue' },
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `📦 **商品名称**：${body.name}\n👤 **博主昵称**：${body.nickname}\n❤️ **总点赞数**：${body.likes}\n📈 **日均点赞**：${body.dailyLikes}\n📆 **发布天数**：${body.days}天\n📅 **发布日期**：${body.publishDate}\n🆔 **商品ID**：${body.goodsId}\n⏱️ **查询时间**：${new Date(body.queryTime).toLocaleString('zh-CN')}`
            }
          },
          {
            tag: 'action',
            actions: [
              {
                tag: 'button',
                text: { content: '🔗 查看商品', tag: 'plain_text' },
                url: `https://item.taobao.com/item.htm?id=${body.goodsId}`,
                type: 'default'
              }
            ]
          }
        ]
      }
    };

    const response = await fetch(FEISHU_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    if (response.ok) {
      return NextResponse.json({ success: true });
    } else {
      const errorText = await response.text();
      return NextResponse.json({ error: '飞书发送失败', details: errorText }, { status: 500 });
    }

  } catch (error) {
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: '请使用 POST 请求发送数据' }, { status: 405 });
}
