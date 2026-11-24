import type {
  ScheduleActionData,
  ScheduleActionRunResult,
} from "@/lib/api/schedule-action-types";
import { isAppRole } from "@/lib/auth/schedule-identity";
import {
  addCourse,
  approveSchedule,
  assignTeacherCourse,
  authorizeScheduleReopen,
  completeOnboarding,
  createCourse,
  importCourses,
  observeSchedule,
  removeCourse,
  requestScheduleReopen,
  setAcademicTerm,
  setAvailability,
  setContract,
  setCourseActive,
  setPeriodClosed,
  setUserAccess,
  submitSchedule,
  unassignTeacherCourse,
  validateUserAccessChange,
} from "@/lib/data/schedule-db";
import { type ContractKey, contractRules } from "@/lib/domain/schedule-data";
import type { ScheduleIdentity } from "@/lib/domain/types";
import { ScheduleError } from "@/lib/domain/types";

export async function runScheduleAction(
  identity: ScheduleIdentity,
  body: Record<string, unknown>,
): Promise<ScheduleActionRunResult> {
  try {
    return { ok: true, data: await runAction(identity, body) };
  } catch (error) {
    if (error instanceof ScheduleError) {
      return { ok: false, error: error.message, status: error.status };
    }
    throw error;
  }
}

async function runAction(
  identity: ScheduleIdentity,
  body: Record<string, unknown>,
): Promise<ScheduleActionData> {
  if (body.action === "completeOnboarding") {
    const departmentOrSchool =
      typeof body.department === "string"
        ? body.department
        : typeof body.school === "string"
          ? body.school
          : "";
    if (
      !isAppRole(body.role) ||
      !departmentOrSchool ||
      typeof body.code !== "string"
    ) {
      throw new ScheduleError("Perfil no válido.", 400);
    }
    return completeOnboarding(identity, {
      role: body.role,
      school: departmentOrSchool,
      code: body.code,
    });
  }
  if (body.action === "setContract") {
    if (!isContractKey(body.contract)) {
      throw new ScheduleError("Clase docente no válida.", 400);
    }
    return setContract(identity, body.contract);
  }
  if (body.action === "setAvailability") {
    const availability = Array.isArray(body.availability)
      ? body.availability.filter(
          (value: unknown): value is string => typeof value === "string",
        )
      : [];
    return setAvailability(identity, availability);
  }
  if (body.action === "addCourse") {
    if (typeof body.courseId !== "string") {
      throw new ScheduleError("Curso no válido.", 400);
    }
    return addCourse(identity, body.courseId);
  }
  if (body.action === "removeCourse") {
    if (typeof body.courseId !== "string") {
      throw new ScheduleError("Curso no válido.", 400);
    }
    return removeCourse(identity, body.courseId);
  }
  if (body.action === "assignTeacherCourse") {
    if (
      typeof body.teacherId !== "string" ||
      typeof body.courseId !== "string"
    ) {
      throw new ScheduleError("Curso no válido.", 400);
    }
    return assignTeacherCourse(identity, body.teacherId, body.courseId);
  }
  if (body.action === "unassignTeacherCourse") {
    if (
      typeof body.teacherId !== "string" ||
      typeof body.courseId !== "string"
    ) {
      throw new ScheduleError("Curso no válido.", 400);
    }
    return unassignTeacherCourse(identity, body.teacherId, body.courseId);
  }
  if (body.action === "observe") {
    if (typeof body.teacherId !== "string" || typeof body.note !== "string") {
      throw new ScheduleError("Revisión no válida.", 400);
    }
    return observeSchedule(identity, body.teacherId, body.note);
  }
  if (body.action === "approve") {
    if (typeof body.teacherId !== "string") {
      throw new ScheduleError("Revisión no válida.", 400);
    }
    return approveSchedule(identity, body.teacherId);
  }
  if (body.action === "createCourse") {
    if (typeof body.name !== "string" || typeof body.school !== "string") {
      throw new ScheduleError("Curso no válido.", 400);
    }
    return createCourse(identity, {
      name: body.name,
      school: body.school,
      isThesis: Boolean(body.isThesis),
    });
  }
  if (body.action === "setCourseActive") {
    if (typeof body.courseId !== "string") {
      throw new ScheduleError("Curso no válido.", 400);
    }
    return setCourseActive(identity, body.courseId, Boolean(body.active));
  }
  if (body.action === "setAcademicTerm") {
    if (typeof body.academicTerm !== "string") {
      throw new ScheduleError("Periodo académico no válido.", 400);
    }
    return setAcademicTerm(identity, body.academicTerm);
  }
  if (body.action === "setUserAccess") {
    const departmentOrSchool =
      typeof body.department === "string"
        ? body.department
        : typeof body.school === "string"
          ? body.school
          : "";
    if (
      typeof body.userId !== "string" ||
      !isAppRole(body.role) ||
      !departmentOrSchool
    ) {
      throw new ScheduleError("Usuario no válido.", 400);
    }
    if (!identity.preview) {
      await validateUserAccessChange(
        identity,
        body.userId,
        body.role,
        departmentOrSchool,
      );
    }
    return setUserAccess(identity, body.userId, body.role, departmentOrSchool);
  }
  if (body.action === "setPeriodClosed") {
    return setPeriodClosed(identity, Boolean(body.closed));
  }
  if (body.action === "importCourses") {
    if (!Array.isArray(body.files)) {
      throw new ScheduleError("Archivos no válidos.", 400);
    }
    return importCourses(identity, {
      apply: Boolean(body.apply),
      files: body.files,
    });
  }
  if (body.action === "requestReopen") {
    return requestScheduleReopen(identity);
  }
  if (body.action === "authorizeReopen") {
    if (typeof body.teacherId !== "string") {
      throw new ScheduleError("Docente no válido.", 400);
    }
    return authorizeScheduleReopen(identity, body.teacherId);
  }
  if (body.action === "submit") {
    return submitSchedule(identity);
  }
  throw new ScheduleError("Acción no válida.", 400);
}

function isContractKey(value: unknown): value is ContractKey {
  return typeof value === "string" && value in contractRules;
}
