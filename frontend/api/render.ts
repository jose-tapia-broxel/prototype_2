import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Dynamically import the SSR handler from the built server
    const { reqHandler } = await import('../dist/app/server/server.mjs');
    
    // Forward the request to the Angular SSR handler
    return reqHandler(req, res);
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
