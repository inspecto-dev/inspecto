export { apply } from './commands/apply.js'
export { detect } from './commands/detect.js'
export { init } from './commands/init.js'
export { collectDoctorResult, doctor } from './commands/doctor.js'
export { plan } from './commands/plan.js'
export { teardown } from './commands/teardown.js'
export { writeCommandOutput, reportCommandError } from './utils/output.js'
export type {
  InitOptions,
  BuildTool,
  PackageManager,
  InstallLock,
  DoctorDiagnostic,
  DoctorResult,
} from './types.js'
export type { Framework } from './detect/framework.js'
