import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  const requestId = nanoid();
  response.headers.set('X-Request-ID', requestId);
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
    );
  }
  
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (process.env.NODE_ENV === 'production') {
      const apiKey = request.headers.get('x-api-key');
      
      if (request.nextUrl.pathname.startsWith('/api/webhooks/')) {
        return response;
      }
      
      if (!apiKey || apiKey !== process.env.API_SECRET_KEY) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }
    
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const windowMs = 60 * 1000;
    const maxRequests = 100;
    
    const rateLimit = rateLimitStore.get(ip) || { count: 0, resetAt: now + windowMs };
    
    if (now > rateLimit.resetAt) {
      rateLimit.count = 0;
      rateLimit.resetAt = now + windowMs;
    }
    
    rateLimit.count++;
    rateLimitStore.set(ip, rateLimit);
    
    if (rateLimit.count > maxRequests) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }
    
    response.headers.set('X-RateLimit-Limit', maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', (maxRequests - rateLimit.count).toString());
    response.headers.set('X-RateLimit-Reset', new Date(rateLimit.resetAt).toISOString());
  }
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};