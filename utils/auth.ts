import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret'; // Use a strong secret in production

export interface AuthenticatedRequest extends NextApiRequest {
  userId?: number;
  user?: {
    username: string;
    ai_model?: string;
    
    avatar_url?: string;
    ai_provider?: string; // Added ai_provider
  };
  signal?: AbortSignal;
}

export const authenticateToken = (handler: Function) => {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
      return res.status(401).json({ error: 'Authentication token required' });
    }

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.userId;
      req.user = {
        username: decoded.username,
        ai_model: decoded.ai_model,
        avatar_url: decoded.avatar_url,
        ai_provider: decoded.ai_provider, // Populated ai_provider
      };
      return handler(req, res);
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
  };
};
