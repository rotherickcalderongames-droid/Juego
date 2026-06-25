import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { IAuthenticatedRequest } from '../controllers/game.controller';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_cyberpunk_token_key_2099';

export function authenticateJWT(req: IAuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    // Expected format: Bearer <token>
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Acceso no autorizado: Formato de token incorrecto' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Acceso prohibido: Token inválido o expirado' });
      }

      req.user = user as any;
      next();
    });
  } else {
    res.status(401).json({ error: 'Acceso no autorizado: Token no proporcionado' });
  }
}
