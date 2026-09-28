import {
  User, Patient, Screening, ModuleStatus,
  SimulationParameters, SimulationRun, SimulationResultData, UserRole
} from '../types';

const API_BASE = '/api';

class ApiClient {
  private token: string | null = null;
  private demoRole: UserRole | null = null;

  constructor() {
    this.token = localStorage.getItem('netra_ai_token');
    this.demoRole = (localStorage.getItem('netra_ai_demo_role') as UserRole) || null;
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('netra_ai_token', token);
    } else {
      localStorage.removeItem('netra_ai_token');
    }
  }

  public setDemoRole(role: UserRole | null) {
    this.demoRole = role;
    if (role) {
      localStorage.setItem('netra_ai_demo_role', role);
    } else {
      localStorage.removeItem('netra_ai_demo_role');
    }
  }

  public getDemoRole(): UserRole | null {
    return this.demoRole;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    if (this.demoRole) {
      headers['X-Demo-Role'] = this.demoRole;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (!res.ok) {
      let errorMsg = 'An error occurred';
      try {
        const errorData = await res.json();
        errorMsg = errorData.error || errorData.message || errorMsg;
      } catch {
        errorMsg = await res.text();
      }
      throw new Error(errorMsg || `HTTP error ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  // --- Auth ---
  public async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(res.token);
    return res;
  }

  public async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/me');
  }

  public async getDemoUsers(): Promise<{ users: User[] }> {
    return this.request<{ users: User[] }>('/auth/demo-users');
  }

  // --- Facilities ---
  public async getFacilities(): Promise<{ facilities: any[] }> {
    return this.request<{ facilities: any[] }>('/facilities');
  }

  // --- Patients ---
  public async getPatients(params?: { search?: string; facilityId?: string; limit?: number; offset?: number }): Promise<{ patients: Patient[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.facilityId) query.append('facilityId', params.facilityId);
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));
    return this.request<{ patients: Patient[]; total: number }>(`/patients?${query.toString()}`);
  }

  public async getPatientById(id: string): Promise<{ patient: Patient }> {
    return this.request<{ patient: Patient }>(`/patients/${id}`);
  }

  public async registerPatient(data: {
    name: string;
    age: number;
    gender: 'Male' | 'Female' | 'Other';
    phone?: string;
    location: string;
    diabetes_duration_years: number;
    facility_id?: string;
  }): Promise<{ patient: Patient }> {
    return this.request<{ patient: Patient }>('/patients', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // --- Screenings ---
  public async getScreenings(params?: {
    patientId?: string;
    facilityId?: string;
    status?: string;
    grade?: number;
    referralStatus?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ screenings: Screening[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.patientId) query.append('patientId', params.patientId);
    if (params?.facilityId) query.append('facilityId', params.facilityId);
    if (params?.status) query.append('status', params.status);
    if (params?.grade !== undefined) query.append('grade', String(params.grade));
    if (params?.referralStatus) query.append('referralStatus', params.referralStatus);
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));
    return this.request<{ screenings: Screening[]; total: number }>(`/screenings?${query.toString()}`);
  }

  public async getScreeningById(id: string): Promise<{ screening: Screening }> {
    return this.request<{ screening: Screening }>(`/screenings/${id}`);
  }

  public async createScreening(data: {
    patientId: string;
    facilityId?: string;
    eye: 'left' | 'right';
    notes?: string;
    imageStorageUrl?: string;
    originalFilename?: string;
    deviceId?: string;
  }): Promise<{ screening: Screening }> {
    return this.request<{ screening: Screening }>('/screenings', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async runAnalysis(screeningId: string): Promise<{ message: string; screening: Screening }> {
    return this.request<{ message: string; screening: Screening }>(`/screenings/${screeningId}/analyze`, {
      method: 'POST'
    });
  }

  public async updateReferralAction(screeningId: string, data: {
    action_taken: 'referral_pending' | 'referral_completed' | 'patient_advised' | 'followup_scheduled';
    action_notes?: string;
  }): Promise<{ referral: any; message: string }> {
    return this.request<{ referral: any; message: string }>(`/screenings/${screeningId}/referral`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async uploadImage(file: File): Promise<{ storageUrl: string; originalFilename: string }> {
    const formData = new FormData();
    formData.append('image', file);

    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    if (this.demoRole) {
      headers['X-Demo-Role'] = this.demoRole;
    }

    const res = await fetch(`${API_BASE}/screenings/upload`, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Failed to upload image');
    }

    return res.json();
  }

  // --- Analytics ---
  public async getAnalyticsOverview(facilityId?: string): Promise<any> {
    const query = facilityId ? `?facilityId=${facilityId}` : '';
    return this.request<any>(`/analytics/overview${query}`);
  }

  // --- Simulation ---
  public async runSimulation(params: SimulationParameters): Promise<{ simulationRun: SimulationRun; result: SimulationResultData }> {
    return this.request<{ simulationRun: SimulationRun; result: SimulationResultData }>('/simulation/run', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  public async getSimulationRuns(): Promise<{ runs: SimulationRun[] }> {
    return this.request<{ runs: SimulationRun[] }>('/simulation/runs');
  }

  public async getSimulationRunById(id: string): Promise<{ simulationRun: SimulationRun }> {
    return this.request<{ simulationRun: SimulationRun }>(`/simulation/runs/${id}`);
  }

  // --- Model Status ---
  public async getModelStatus(): Promise<{ system: string; aiServiceType: string; simulationServiceType: string; modules: ModuleStatus[] }> {
    return this.request<any>('/model-status');
  }
}

export const api = new ApiClient();
