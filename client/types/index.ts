export interface User {
  id:        string;
  name:      string;
  email:     string;
  role:      'buyer' | 'seller' | 'admin';
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  user:    User;
}

export interface ErrorResponse {
  error: string;
}

export interface RegisterFormData {
  name:            string;
  email:           string;
  password:        string;
  confirmPassword: string;
  role:            'buyer' | 'seller';
}