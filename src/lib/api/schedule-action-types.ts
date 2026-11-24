import type { ContractKey } from "@/lib/domain/schedule-data";
import type {
  AppRole,
  CourseImportResponse,
  SchedulePayload,
} from "@/lib/domain/types";
import type { CourseImportFileInput } from "@/lib/domain/course-import";

export type CompleteOnboardingAction = {
  action: "completeOnboarding";
  role: AppRole;
  school: string;
  code: string;
};

export type ScheduleMutationAction =
  | { action: "setContract"; contract: ContractKey }
  | { action: "setAvailability"; availability: string[] }
  | { action: "addCourse"; courseId: string }
  | { action: "removeCourse"; courseId: string }
  | { action: "assignTeacherCourse"; teacherId: string; courseId: string }
  | { action: "unassignTeacherCourse"; teacherId: string; courseId: string }
  | { action: "observe"; teacherId: string; note: string }
  | { action: "approve"; teacherId: string }
  | { action: "createCourse"; name: string; school: string; isThesis: boolean }
  | { action: "setCourseActive"; courseId: string; active: boolean }
  | { action: "setAcademicTerm"; academicTerm: string }
  | {
      action: "setUserAccess";
      userId: string;
      role: AppRole;
      school: string;
    }
  | { action: "setPeriodClosed"; closed: boolean }
  | { action: "requestReopen" }
  | { action: "authorizeReopen"; teacherId: string }
  | { action: "submit" };

export type CourseImportAction = {
  action: "importCourses";
  apply: boolean;
  files: CourseImportFileInput[];
};

export type ScheduleAction =
  | CompleteOnboardingAction
  | ScheduleMutationAction
  | CourseImportAction;

export type ScheduleActionData = SchedulePayload | CourseImportResponse;

export type ScheduleActionRunResult =
  | { ok: true; data: ScheduleActionData }
  | { ok: false; error: string; status: number };

export type SchedulePayloadActionResponse =
  | { ok: true; payload: SchedulePayload }
  | { ok: false; error: string };

export type CourseImportActionResponse =
  | { ok: true; result: CourseImportResponse }
  | { ok: false; error: string };
