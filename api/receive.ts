import { Hono } from 'hono'

export const config = {
  runtime: 'edge',
};

type Env = {
  FEISHU_APP_ID: string;
  FEISHU_APP_SECRET: string;
  BITABLE_APP_TOKEN: string;
  TABLE_ID: string;
};

const app = new Hono<{}>();

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
  const env = c.env as unknown as Env;
  const data = await c.req.json();

  if (!data.goodsId || !data.deviceId) {
    return c.text('Missing goodsId or deviceId', 400);
  }

  const token = await getTenantAccessToken(env);

  // Step 1: Search
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
  const records = searchResult.data?.items || [];

  // Step 2: Batch delete (关键优化！)
  if (records.length > 0) {
    const recordIds = records.map((r: any) => r.record_id);
    await fetch(
      `https://open.feishu.cn/open-api/bitable/v1/apps/${env.BITABLE_APP_TOKEN}/tables/${env.TABLE_ID}/records/batch_delete`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ record_ids: recordIds }),
      }
    );
  }

  // Step 3: Create
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
