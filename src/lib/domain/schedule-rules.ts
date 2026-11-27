import {
  ALLOWED_AVAILABILITY_BLOCKS,
  type Course,
  contractRules,
  type DayKey,
  days,
  type TeacherProfile,
} from "@/lib/domain/schedule-data";

export type ScheduleValidation = {
  selectedHours: number;
  countedCourses: number;
  blockDays: number;
  missingDailyBlockDays: number;
  complete: boolean;
};

export type CourseAssignmentState = {
  alreadyAssigned: boolean;
  countedCourses: number;
  limitReached: boolean;
  canAssign: boolean;
};

export function validateTeacherRules(
  profile: Pick<TeacherProfile, "availability" | "contract" | "courses">,
): ScheduleValidation {
  const rule = contractRules[profile.contract];
  const byDay = new Map<DayKey, number[]>();
  for (const day of days) {
    byDay.set(day.key, []);
  }
  for (const key of profile.availability) {
    const [day, hour] = key.split("-");
    const values = byDay.get(day as DayKey);
    if (values) {
      values.push(Number(hour));
    }
  }
  const blockDays = Array.from(byDay.values()).filter(
    (dayHours) =>
      new Set(dayHours).size >= rule.requiredDailyHours &&
      countFourHourBlocks(dayHours) >= rule.requiredDailyBlockCount,
  ).length;
  const countedCourses = profile.courses.filter(
    (course) => !course.isThesis,
  ).length;
  const missingDailyBlockDays = Math.max(0, rule.requiredBlockDays - blockDays);
  return {
    selectedHours: profile.availability.length,
    countedCourses,
    blockDays,
    missingDailyBlockDays,
    complete:
      profile.availability.length >= rule.requiredHours &&
      blockDays >= rule.requiredBlockDays &&
      countedCourses > 0,
  };
}

export function completionForRules(
  profile: Pick<TeacherProfile, "contract">,
  validation: ScheduleValidation,
) {
  return Math.min(
    100,
    Math.round(
      (validation.selectedHours /
        contractRules[profile.contract].requiredHours) *
        70 +
        (validation.blockDays /
          contractRules[profile.contract].requiredBlockDays) *
          20 +
        (validation.countedCourses >= 1 ? 10 : 0),
    ),
  );
}

export function courseAssignmentState(
  profile: Pick<TeacherProfile, "contract" | "courses">,
  course?: Course | null,
): CourseAssignmentState {
  const alreadyAssigned = course
    ? profile.courses.some((item) => item.id === course.id)
    : false;
  const countedCourses = profile.courses.filter(
    (item) => !item.isThesis,
  ).length;
  return {
    alreadyAssigned,
    countedCourses,
    limitReached: false,
    canAssign: Boolean(course && !alreadyAssigned),
  };
}

function countFourHourBlocks(values: number[]) {
  const hourSet = new Set(values);
  let blocks = 0;
  for (const block of ALLOWED_AVAILABILITY_BLOCKS) {
    if (block.every((hour) => hourSet.has(hour))) {
      blocks += 1;
    }
  }
  return blocks;
}
