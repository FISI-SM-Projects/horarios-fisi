import type { Course } from "@/lib/domain/schedule-data";

export function normalizeSchoolName(school: string) {
  const normalized = school.trim().toLowerCase();
  if (
    normalized === "epis" ||
    normalized === "ing. de sistemas" ||
    normalized === "ingeniería de sistemas" ||
    normalized === "ingenieria de sistemas"
  ) {
    return "Ingeniería de Sistemas";
  }
  if (
    normalized === "episw" ||
    normalized === "ing. de software" ||
    normalized === "ingeniería de software" ||
    normalized === "ingenieria de software"
  ) {
    return "Ingeniería de Software";
  }
  if (
    normalized === "epcc" ||
    normalized === "ciencias de la computación" ||
    normalized === "ciencias de la computacion" ||
    normalized === "cc"
  ) {
    return "Ciencias de la Computación";
  }
  if (
    normalized === "epia" ||
    normalized === "ingeniería de inteligencia artificial" ||
    normalized === "ingenieria de inteligencia artificial" ||
    normalized === "inteligencia artificial" ||
    normalized === "ia"
  ) {
    return "Ingeniería de Inteligencia Artificial";
  }
  return school;
}

export function courseBelongsToSchool(course: Course, schoolName: string) {
  if (course.school === "Transversal") {
    return true;
  }
  return normalizeSchoolName(course.school) === normalizeSchoolName(schoolName);
}

export function visibleCoursesForSchool(courses: Course[], schoolName: string) {
  return courses
    .filter((course) => course.active !== false)
    .filter((course) => courseBelongsToSchool(course, schoolName));
}

export function curriculaForSchool(
  courses: Course[],
  schoolName: string,
): string[] {
  const visible = visibleCoursesForSchool(courses, schoolName);
  const curricula = new Set<string>();
  for (const course of visible) {
    if (course.curriculum?.trim()) {
      curricula.add(course.curriculum.trim());
    }
  }
  return Array.from(curricula).sort();
}

export function visibleCoursesForSchoolAndCurriculum(
  courses: Course[],
  schoolName: string,
  curriculum?: string | null,
) {
  const visible = visibleCoursesForSchool(courses, schoolName);
  if (!curriculum || curriculum === "all") {
    return visible;
  }
  return visible.filter(
    (course) =>
      course.school === "Transversal" || course.curriculum === curriculum,
  );
}
