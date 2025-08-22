export class CreateStaffDto {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  role?: 'ADMIN' | 'STAFF';
}

export class UpdateStaffDto {
  fullName?: string;
  username?: string;
  email?: string;
  phone?: string;
  role?: 'ADMIN' | 'STAFF';
  status?: 'ACTIVE' | 'INACTIVE';
}

export class ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export class SearchStaffDto {
  query?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  role?: 'ADMIN' | 'STAFF';
}