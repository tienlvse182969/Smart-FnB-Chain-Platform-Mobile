export type AppRole = 'CASHIER' | 'BARISTA';

export type AuthUser = {
  id: string;
  email: string;
  phone: string | null;
  status: string;
  role: AppRole;
  employee: {
    id: string;
    employeeCode: string;
    branchId: string;
    firstName: string;
    lastName: string;
  } | null;
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshExpiresIn: number;
};

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}
