import type { SchoolCode } from "@/lib/domain/schedule-data";

export const validSchoolCodes: readonly SchoolCode[] = [
  "EPIS",
  "EPISW",
  "EPCC",
  "EPIA",
  "Transversal",
] as const;

export type ValidatedCourse = {
  id: string;
  name: string;
  school: SchoolCode;
  isThesis: boolean;
  code: string;
  cycle: number;
  credits: number;
  courseType: string;
  curriculum: string;
};

export type CourseImportRecord = {
  filename: string;
  rowNumber: number;
  values: Record<string, string>;
};

export type CourseImportFileInput = {
  filename: string;
  content: string;
};

export type CourseImportResult = {
  ok: boolean;
  totalRows: number;
  filesCount: number;
  newCoursesCount: number;
  updatedCoursesCount: number;
  consolidatedCoursesCount: number;
  errors: string[];
  warnings: string[];
  preview: ValidatedCourse[];
  coursesToUpsert: ValidatedCourse[];
};

export const REQUIRED_COLUMNS = [
  "name",
  "school",
  "is_thesis",
  "code",
  "cycle",
  "credits",
  "course_type",
  "curriculum",
] as const;

export function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function buildCourseId(school: string, code: string): string {
  const cleanSchool = slug(school);
  const cleanCode = slug(code);
  return `${cleanSchool}-${cleanCode}`.toLowerCase();
}

export function normalizeCourseName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export function normalizeSchoolCode(value: string): SchoolCode | null {
  const clean = value.trim();
  const found = validSchoolCodes.find(
    (code) => code.toLowerCase() === clean.toLowerCase(),
  );
  return found ?? null;
}

export function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function parseCourseCsv(
  body: string,
  filename = "archivo.csv",
): {
  records: CourseImportRecord[];
  missingHeaders: string[];
  parseError?: string;
} {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    const next = body[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  if (!rows.length || (rows.length === 1 && rows[0]?.every((c) => !c.trim()))) {
    return { records: [], missingHeaders: [...REQUIRED_COLUMNS], parseError: "El archivo CSV está vacío." };
  }

  const rawHeader = rows[0] ?? [];
  const header = rawHeader.map(normalizeHeader);
  const missingHeaders = REQUIRED_COLUMNS.filter((col) => !header.includes(col));

  if (missingHeaders.length > 0) {
    return { records: [], missingHeaders };
  }

  const records: CourseImportRecord[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const values = rows[i] ?? [];
    if (values.every((v) => !v.trim())) {
      continue;
    }
    const recordValues: Record<string, string> = {};
    for (let h = 0; h < header.length; h += 1) {
      const colName = header[h];
      if (colName) {
        recordValues[colName] = (values[h] ?? "").trim();
      }
    }
    records.push({
      filename,
      rowNumber: i + 1,
      values: recordValues,
    });
  }

  return { records, missingHeaders: [] };
}

export function buildCourseImport({
  files,
  existingCourseIds = new Set<string>(),
}: {
  files: CourseImportFileInput[];
  existingCourseIds?: Set<string> | string[];
}): CourseImportResult {
  const existingSet =
    existingCourseIds instanceof Set
      ? existingCourseIds
      : new Set(existingCourseIds);

  const errors: string[] = [];
  const warnings: string[] = [];
  let totalRows = 0;

  const validatedCoursesMap = new Map<string, ValidatedCourse>();
  let duplicateCount = 0;

  for (const file of files) {
    const { records, missingHeaders, parseError } = parseCourseCsv(
      file.content,
      file.filename,
    );

    if (parseError) {
      errors.push(`[${file.filename}] ${parseError}`);
      continue;
    }

    if (missingHeaders.length > 0) {
      errors.push(
        `[${file.filename}] Faltan columnas obligatorias: ${missingHeaders.join(", ")}.`,
      );
      continue;
    }

    totalRows += records.length;

    for (const record of records) {
      const rawName = record.values.name ?? "";
      const rawSchool = record.values.school ?? "";
      const rawIsThesis = record.values.is_thesis?.toLowerCase() ?? "";
      const rawCode = record.values.code ?? "";
      const rawCycle = record.values.cycle ?? "";
      const rawCredits = record.values.credits ?? "";
      const rawCourseType = record.values.course_type ?? "";
      const rawCurriculum = record.values.curriculum ?? "";

      const rowPrefix = `[${record.filename}] Fila ${record.rowNumber}`;

      if (!rawName) {
        errors.push(`${rowPrefix}: El nombre del curso es obligatorio.`);
      }
      if (!rawCode) {
        errors.push(`${rowPrefix}: El código del curso es obligatorio.`);
      }

      const schoolCode = normalizeSchoolCode(rawSchool);
      if (!schoolCode) {
        errors.push(
          `${rowPrefix}: Escuela no válida '${rawSchool}'. Permitidas: ${validSchoolCodes.join(", ")}.`,
        );
      }

      if (rawIsThesis !== "true" && rawIsThesis !== "false") {
        errors.push(
          `${rowPrefix}: 'is_thesis' debe ser 'true' o 'false' (recibido: '${record.values.is_thesis}').`,
        );
      }

      const cycleNum = Number.parseInt(rawCycle, 10);
      if (Number.isNaN(cycleNum) || cycleNum < 1 || cycleNum > 10) {
        errors.push(
          `${rowPrefix}: 'cycle' debe ser un número entero entre 1 y 10 (recibido: '${rawCycle}').`,
        );
      }

      const creditsNum = Number.parseInt(rawCredits, 10);
      if (Number.isNaN(creditsNum) || creditsNum <= 0) {
        errors.push(
          `${rowPrefix}: 'credits' debe ser un número entero positivo (recibido: '${rawCredits}').`,
        );
      }

      if (!rawCourseType) {
        errors.push(`${rowPrefix}: 'course_type' es obligatorio.`);
      }

      if (!rawCurriculum) {
        errors.push(`${rowPrefix}: 'curriculum' es obligatorio.`);
      }

      if (
        !rawName ||
        !rawCode ||
        !schoolCode ||
        (rawIsThesis !== "true" && rawIsThesis !== "false") ||
        Number.isNaN(cycleNum) ||
        cycleNum < 1 ||
        cycleNum > 10 ||
        Number.isNaN(creditsNum) ||
        creditsNum <= 0 ||
        !rawCourseType ||
        !rawCurriculum
      ) {
        continue;
      }

      const id = buildCourseId(schoolCode, rawCode);
      const normalizedName = normalizeCourseName(rawName);

      const course: ValidatedCourse = {
        id,
        name: normalizedName,
        school: schoolCode,
        isThesis: rawIsThesis === "true",
        code: rawCode.trim().toUpperCase(),
        cycle: cycleNum,
        credits: creditsNum,
        courseType: rawCourseType.trim(),
        curriculum: rawCurriculum.trim(),
      };

      if (validatedCoursesMap.has(id)) {
        duplicateCount += 1;
        const existing = validatedCoursesMap.get(id);
        if (existing && existing.name !== normalizedName) {
          warnings.push(
            `Curso duplicado '${id}': consolidando '${normalizedName}' sobre '${existing.name}'.`,
          );
        }
      }

      validatedCoursesMap.set(id, course);
    }
  }

  const coursesToUpsert = Array.from(validatedCoursesMap.values());
  let newCoursesCount = 0;
  let updatedCoursesCount = 0;

  for (const course of coursesToUpsert) {
    if (existingSet.has(course.id)) {
      updatedCoursesCount += 1;
    } else {
      newCoursesCount += 1;
    }
  }

  return {
    ok: errors.length === 0,
    totalRows,
    filesCount: files.length,
    newCoursesCount,
    updatedCoursesCount,
    consolidatedCoursesCount: coursesToUpsert.length,
    errors,
    warnings,
    preview: coursesToUpsert.slice(0, 15),
    coursesToUpsert,
  };
}
