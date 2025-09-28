export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('收到数据:', body);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function GET() {
  return new Response(JSON.stringify({ message: 'OK' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
