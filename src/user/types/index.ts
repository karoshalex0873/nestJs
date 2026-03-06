import { Request } from 'express';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  roles: string[];
}

export interface UserRequest extends Request {
  user: AuthenticatedUser;
}


