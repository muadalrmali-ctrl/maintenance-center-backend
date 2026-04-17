declare namespace Express {
  interface Request {
    user?: {
      id: number;
      name: string;
      email: string;
      role: string;
      permissions: string[];
      branchId?: number | null;
      branchName?: string | null;
      isAdmin: boolean;
    };
  }
}
