export interface ResultMetrics {
  testsCount?: number;
  warningCount?: number;
}

export interface ActionRecord {
  startedTime: Date;
  endedTime: Date;
  title: string;
  schemeCommandName: string;
  schemeTaskName: string;
  actionResult?: ActionResult;
  buildResult?: ActionResult;
  runDestination?: ActionRunDestinationRecord;
}

export interface IssueSummary {
  issueType: string;
  message: string;
  documentLocationInCreatingWorkspace?: DocumentLocation;
}

export interface ResultIssueSummaries {
  warningSummaries?: IssueSummary[];
}

export interface ActivityLogSection {
  domainType:
    | 'Xcode.IDEActivityLogDomainType.BuildLog'
    | 'com.apple.dt.IDE.BuildLogSection'
    | 'com.apple.dt.IDE.BuildLogTimingSummarySection'
    | 'com.apple.dt.IDE.timing.aggregate'
    | string;
  /** 32.782150983810425 */
  duration: number;
  messages: ActivityLogMessage[];
  result: 'succeeded' | string;
  startTime: Date;
  normalizedStartTime?: number;
  nodeModuleName?: string;
  endTime?: Date;
  nativeTargetName?: string;
  subsections: ActivityLogCommandInvocationSection[];
  title: string;
}

export interface ActivityLogMajorSection extends ActivityLogSection {
  domainType: 'com.apple.dt.IDE.BuildLogTimingSummarySection';
  location?: DocumentLocation;
  subtitle?: string;
}

export interface ActivityLogMessage {
  category:
    | 'Notice'
    | 'Nullability Issue'
    | 'Swift Compiler Notice'
    | 'Swift Compiler Warning'
    | 'Target Integrity'
    | string;
  /** Using new build system */
  title?: string;
  shortTitle: string;
  type: 'notice' | 'warning' | string;
  location?: DocumentLocation;
}

export interface ActivityLogCommandInvocationSection extends ActivityLogSection {
  commandDetails?: string;
  exitCode?: number;
  emittedOutput?: string;
  location?: DocumentLocation;
  subtitle?: string;
}

export interface ActionsInvocationRecord {
  actions?: ActionRecord[];
  issues?: ResultIssueSummaries;
  metadataRef?: Ref;
  metrics?: ResultMetrics;
}

type Status = 'succeeded' | string;

export interface ActionResult {
  coverage: CodeCoverageInfo;
  issues: ResultIssueSummaries;
  metrics: ResultMetrics;
  resultName: string | 'build';
  status: Status;
  logRef?: Ref;
}

export interface CodeCoverageInfo {}

export interface WarningSummary {
  documentLocationInCreatingWorkspace: DocumentLocation;
  issueType: string;
  message: string;
}

export interface DocumentLocation {
  concreteTypeName:
    | 'DVTDocumentLocation'
    | 'DVTTextDocumentLocation'
    | 'Xcode3ProjectDocumentLocation'
    | string;
  url: string;
}

export interface Ref {
  id: string;
  targetType: TargetType;
}

export interface TargetType {
  name: string;
}

export interface ActionRunDestinationRecord {
  displayName: string;
  localComputerRecord: XRecord;
  targetArchitecture: string | 'x86_64';
  targetDeviceRecord: XRecord;
  targetSDKRecord: TargetSDKRecord;
}

export interface XRecord {
  busSpeedInMHz: number;
  cpuCount: number;
  cpuKind?: string;
  cpuSpeedInMHz: number;
  identifier: string;
  isConcreteDevice: boolean;
  logicalCPUCoresPerPackage: number;
  modelCode: string;
  modelName: string;
  modelUTI: string;
  name: string;
  nativeArchitecture: string;
  operatingSystemVersion: string;
  operatingSystemVersionWithBuildNumber: string;
  physicalCPUCoresPerPackage: number;
  platformRecord: PlatformRecord;
  ramSizeInMegabytes: number;
}

export interface PlatformRecord {
  identifier: string;
  userDescription: string;
}

export interface TargetSDKRecord {
  identifier: string;
  /** Simulator - iOS 15.0 */
  name: string;
  /** 15.0 */
  operatingSystemVersion: string;
}
