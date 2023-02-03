export interface DoctorCheck {
  // description that will appear as each check is run
  description: string;
  runAsync: (params: DoctorCheckParams) => Promise<DoctorCheckResult>;
}

export interface DoctorCheckResult {
  isSuccessful: boolean;
  /** many checks currently output their own issues, no need to duplicate */
  issues: string[];
  // should include at least one bit of actionable advice to fix the issue(s)
  advice: string[];
}

export interface DoctorCheckParams {
  projectRoot: string;
  exp: any;
  pkg: any;
}
