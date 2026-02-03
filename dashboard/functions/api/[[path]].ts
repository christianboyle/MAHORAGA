/**
 * Cloudflare Pages Function to proxy /api/* requests to the Worker
 * This replaces the Vite dev server proxy in production
 */

export async function onRequest(context: {
  request: Request;
  env: {
    MAHORAGA_WORKER_URL?: string;
  };
}): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Get the path after /api (e.g., /api/status -> status)
  const path = url.pathname.replace(/^\/api/, '') || '/status';
  
  // Target Worker URL - can be set via Pages environment variable or defaults to production
  const workerUrl = env.MAHORAGA_WORKER_URL || 'https://mahoraga.chrisboyle.workers.dev';
  const targetUrl = `${workerUrl}/agent${path}${url.search}`;
  
  // Forward the request to the Worker, preserving headers and method
  const workerRequest = new Request(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });
  
  try {
    const response = await fetch(workerRequest);
    
    // Return the response with CORS headers if needed
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Failed to proxy request: ${error}` }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
