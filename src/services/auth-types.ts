export enum AppRole {
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  WAITER = 'WAITER',
  KITCHEN = 'KITCHEN',
  CASHIER = 'CASHIER',
}

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type EmployeeProfile = {
  id: string;
  employeeCode: string;
  branchId: string;
  firstName: string;
  lastName: string;
};

export type OwnerProfile = {
  id: string;
  ownerCode: string;
  firstName: string;
  lastName: string;
};

export type AuthUser = {
  id: string;
  email: string;
  phone: string | null;
  status: UserStatus;
  role: AppRole;
  employee: EmployeeProfile | null;
  owner: OwnerProfile | null;
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshExpiresIn: number;
};

export type MessageResponse = {
  message: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
