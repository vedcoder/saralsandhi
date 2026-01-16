import { ContractAnalysis, ContractListResponse } from '@/types/contract';
import { User, LoginCredentials, RegisterData, AuthToken, UserUpdate, PasswordChange } from '@/types/user';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
    throw new Error(error.detail || 'An error occurred');
  }

  return response.json();
}

// Auth endpoints
export async function login(credentials: LoginCredentials): Promise<AuthToken> {
  const formData = new URLSearchParams();
  formData.append('username', credentials.email);
  formData.append('password', credentials.password);

  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData,
  });

  return handleResponse<AuthToken>(response);
}

export async function register(data: RegisterData): Promise<User> {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  return handleResponse<User>(response);
}

export async function getMe(): Promise<User> {
  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders(),
  });

  return handleResponse<User>(response);
}

export async function updateProfile(data: UserUpdate): Promise<User> {
  const response = await fetch(`${API_BASE}/auth/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });

  return handleResponse<User>(response);
}

export async function changePassword(data: PasswordChange): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/auth/password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });

  return handleResponse<{ message: string }>(response);
}

// Contract endpoints
export async function analyzeContract(file: File): Promise<ContractAnalysis> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/contracts/analyze`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  return handleResponse<ContractAnalysis>(response);
}

export async function getContracts(
  search?: string,
  limit: number = 50,
  offset: number = 0
): Promise<ContractListResponse> {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());

  const response = await fetch(`${API_BASE}/contracts?${params}`, {
    headers: getAuthHeaders(),
  });

  return handleResponse<ContractListResponse>(response);
}

export async function getContract(contractId: string): Promise<ContractAnalysis> {
  const response = await fetch(`${API_BASE}/contracts/${contractId}`, {
    headers: getAuthHeaders(),
  });

  return handleResponse<ContractAnalysis>(response);
}

export async function deleteContract(contractId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/contracts/${contractId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  return handleResponse<{ message: string }>(response);
}

// Chat endpoint
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
}

export async function chatWithContract(
  contractId: string,
  message: string,
  history: ChatMessage[]
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/contracts/${contractId}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ message, history }),
  });

  return handleResponse<ChatResponse>(response);
}
