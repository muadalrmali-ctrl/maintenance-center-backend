declare namespace Express {
  interface Request {
    user?: {
      id: number;
      name: string;
      email: string;
      role: string;
      permissions: string[];
      isAdmin: boolean;
    };
  }
}
