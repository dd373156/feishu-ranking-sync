import { Hono } from 'hono'

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

  // 删除旧记录 + 创建新记录（你的逻辑）

  return c.text('OK');
});

export default app;
