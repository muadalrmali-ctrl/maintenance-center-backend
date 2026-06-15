declare namespace Express {
  interface Request {
    user?: {
      id: number;
      name: string;
      email: string;
      role: string;
      receptionPointId?: number | null;
      permissions: string[];
      isAdmin: boolean;
    };
  }
}
