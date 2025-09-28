import { Hono } from 'hono'

export const config = {
  runtime: 'edge', // ✅ 启用 Edge Runtime（更快 + 30秒超时）
};

type Env = {
  FEISHU_APP_ID: string;
  FEISHU_APP_SECRET: string;
  BITABLE_APP_TOKEN: string;
  TABLE_ID: string;
};

const app = new Hono<{}>();

// ... 后面逻辑不变

// 获取租户 token 的函数
async function getTenantAccessToken(env: Env) {
  const res = await fetch('https://open.feishu.cn/open-api/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: env.FEISHU_APP_ID,
      app_secret: env.FEISHU_APP_SECRET,
    }),
  });

  const data = await res.json();
  return data.tenant_access_token;
}

app.post('/receive', async (c) => {
  // ✅ 使用 c.env 获取环境变量
  const env = c.env as unknown as Env; // ← 强制类型转换

  const data = await c.req.json();

  if (!data.goodsId || !data.deviceId) {
    return c.text('Missing goodsId or deviceId', 400);
  }

  const token = await getTenantAccessToken(env);

  // Step 1: Search existing records
  const searchRes = await fetch(
    `https://open.feishu.cn/open-api/bitable/v1/apps/${env.BITABLE_APP_TOKEN}/tables/${env.TABLE_ID}/records/search`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: {
          conjunction: 'and',
          conditions: [
            { field: '商品ID', operator: 'is', value: [data.goodsId] },
            { field: '设备ID', operator: 'is', value: [data.deviceId] },
          ],
        },
      }),
    }
  );

  const searchResult = await searchRes.json();
  const records = searchResult.data.items || [];

  // Step 2: Delete existing records
  for (const record of records) {
    await fetch(
      `https://open.feishu.cn/open-api/bitable/v1/apps/${env.BITABLE_APP_TOKEN}/tables/${env.TABLE_ID}/records/${record.record_id}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );
  }

  // Step 3: Create new record
  await fetch(
    `https://open.feishu.cn/open-api/bitable/v1/apps/${env.BITABLE_APP_TOKEN}/tables/${env.TABLE_ID}/records`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          '商品名称': data.name,
          '商品ID': data.goodsId,
          '发布天数': data.days,
          '发布时间': data.publishDate,
          '点赞次数': data.likes,
          '日均点赞': data.dailyLikes,
          '查询时间': data.queryTime,
          '设备ID': data.deviceId,
        },
      }),
    }
  );

  return c.text('OK');
});

export default app;
