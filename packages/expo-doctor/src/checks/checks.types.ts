export interface DoctorCheck {
  description: string;
  runAsync: (params: DoctorCheckParams) => Promise<DoctorCheckResult>;
}

export interface DoctorCheckResult {
  isSuccessful: boolean;
  issues: string[];
}

export interface DoctorCheckParams {
  projectRoot: string;
  exp: any;
  pkg: any;
}
