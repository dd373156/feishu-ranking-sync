import { Hono } from 'hono';

type Env = {
  FEISHU_APP_ID: string;
  FEISHU_APP_SECRET: string;
  BITABLE_APP_TOKEN: string;
  TABLE_ID: string;
};

const app = new Hono<{ Bindings: Env }>();

async function getTenantAccessToken(env: Env) {
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
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
  const env = c.env;
  const data = await c.req.json();

  const { 
    name, 
    goodsId, 
    days, 
    publishDate, 
    likes, 
    dailyLikes, 
    queryTime, 
    deviceId 
  } = data;

  if (!goodsId || !deviceId) {
    return c.text('Missing goodsId or deviceId', 400);
  }

  const token = await getTenantAccessToken(env);

  // Step 1: Search existing records
  const searchRes = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${env.BITABLE_APP_TOKEN}/tables/${env.TABLE_ID}/records/search`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: {
          conjunction: 'and',
          conditions: [
            { field: '商品ID', operator: 'is', value: [goodsId] },
            { field: '设备ID', operator: 'is', value: [deviceId] },
          ],
        },
      }),
    }
  );

  const searchResult = await searchRes.json();
  const records = searchResult.data?.items || [];

  // Step 2: Delete existing records
  for (const record of records) {
    await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${env.BITABLE_APP_TOKEN}/tables/${env.TABLE_ID}/records/${record.record_id}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  }

  // Step 3: Create new record
  await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${env.BITABLE_APP_TOKEN}/tables/${env.TABLE_ID}/records`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          商品名称: name,
          商品ID: goodsId,
          发布天数: days,
          发布日期: publishDate,
          点赞数量: likes,
          日均点赞: dailyLikes,
          查询时间: queryTime,
          设备ID: deviceId,
        },
      }),
    }
  );

  return c.text('OK');
});

export default app;
