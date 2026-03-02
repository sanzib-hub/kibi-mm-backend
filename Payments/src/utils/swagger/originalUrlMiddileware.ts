import { Request, Response, NextFunction } from "express";

/**
 * Middleware to handle forwarded prefix from ALB/Nginx
 * This ensures Swagger UI works correctly behind a reverse proxy
 */
export function forwardedPrefixSwagger(req: Request, res: Response, next: NextFunction) {
  // Check for various proxy headers
  const forwardedProto = req.headers['x-forwarded-proto'] as string;
  const forwardedHost = req.headers['x-forwarded-host'] as string;
  const forwardedPrefix = req.headers['x-forwarded-prefix'] as string;
  
  // For ALB (AWS Load Balancer)
  if (forwardedProto && forwardedHost) {
    req.url = `${forwardedProto}://${forwardedHost}${forwardedPrefix || ''}${req.url}`;
  }
  
  // For Nginx
  if (req.headers['x-original-url']) {
    req.url = req.headers['x-original-url'] as string;
  }
  
  next();
}

/**
 * General middleware to trust proxy headers
 * Add this to your main app.ts before routes
 */
export function trustProxyMiddleware(req: Request, res: Response, next: NextFunction) {
  // Trust first proxy (ALB)
  req.app.set('trust proxy', 1);
  next();
}