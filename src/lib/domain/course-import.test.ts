import { describe, expect, it } from "bun:test";
import {
  buildCourseId,
  buildCourseImport,
  normalizeCourseName,
  parseCourseCsv,
} from "./course-import";

describe("course-import domain", () => {
  it("normalizes course name to uppercase without diacritics", () => {
    expect(
      normalizeCourseName("Redacción y Técnicas de Comunicación Efectiva I"),
    ).toBe("REDACCION Y TECNICAS DE COMUNICACION EFECTIVA I");
    expect(normalizeCourseName("  cálculo  i  ")).toBe("CALCULO I");
    expect(normalizeCourseName("BIOLOGÍA PARA CIENCIAS E INGENIERÌA")).toBe(
      "BIOLOGIA PARA CIENCIAS E INGENIERIA",
    );
    expect(normalizeCourseName("ÁLGEBRA Y GEOMETRÍA ANALÍTICA")).toBe(
      "ALGEBRA Y GEOMETRIA ANALITICA",
    );
  });

  it("builds deterministic lowercase course ID from school and code", () => {
    expect(buildCourseId("Transversal", "INO101")).toBe("transversal-ino101");
    expect(buildCourseId("EPIS", "201230301")).toBe("epis-201230301");
    expect(buildCourseId("EPISW", "202SW0101")).toBe("episw-202sw0101");
    expect(buildCourseId("Ciencias de la Computacion", "CC101")).toBe(
      "ciencias-de-la-computacion-cc101",
    );
  });

  it("parses valid CSV with all 8 required columns", () => {
    const csv = `name,school,is_thesis,code,cycle,credits,course_type,curriculum
REDACCIÓN Y TÉCNICAS DE COMUNICACIÓN EFECTIVA I,Transversal,false,INO101,1,3,Obligatorio,2023
CÁLCULO I,Transversal,false,INO104,1,4,Obligatorio,2023`;

    const { records, missingHeaders } = parseCourseCsv(csv, "epis.csv");
    expect(missingHeaders).toHaveLength(0);
    expect(records).toHaveLength(2);
    expect(records[0]?.values.name).toBe(
      "REDACCIÓN Y TÉCNICAS DE COMUNICACIÓN EFECTIVA I",
    );
    expect(records[0]?.values.school).toBe("Transversal");
    expect(records[0]?.values.code).toBe("INO101");
  });

  it("fails parsing if required headers are missing", () => {
    const csv = `name,school,code
ALGORITMOS,EPIS,ALG101`;

    const { records, missingHeaders } = parseCourseCsv(csv, "invalid.csv");
    expect(records).toHaveLength(0);
    expect(missingHeaders).toContain("is_thesis");
    expect(missingHeaders).toContain("cycle");
    expect(missingHeaders).toContain("credits");
    expect(missingHeaders).toContain("course_type");
    expect(missingHeaders).toContain("curriculum");
  });

  it("validates data types and collects errors for invalid values", () => {
    const csv = `name,school,is_thesis,code,cycle,credits,course_type,curriculum
,InvalidSchool,not_boolean,BAD101,15,-3,,`;

    const result = buildCourseImport({
      files: [{ filename: "test.csv", content: csv }],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("nombre del curso es obligatorio"))).toBe(
      true,
    );
    expect(result.errors.some((e) => e.includes("Escuela no válida"))).toBe(true);
    expect(result.errors.some((e) => e.includes("is_thesis"))).toBe(true);
    expect(result.errors.some((e) => e.includes("cycle"))).toBe(true);
    expect(result.errors.some((e) => e.includes("credits"))).toBe(true);
    expect(result.errors.some((e) => e.includes("course_type"))).toBe(true);
    expect(result.errors.some((e) => e.includes("curriculum"))).toBe(true);
  });

  it("consolidates duplicate transversal courses across multiple CSV files", () => {
    const fileEpis = {
      filename: "cursos_epis_2023.csv",
      content: `name,school,is_thesis,code,cycle,credits,course_type,curriculum
REDACCIÓN Y TÉCNICAS DE COMUNICACIÓN EFECTIVA I,Transversal,false,INO101,1,3,Obligatorio,2023
INTRODUCCIÓN A LA COMPUTACIÓN,EPIS,false,201230301,3,4,Obligatorio,2023`,
    };

    const fileEpcc = {
      filename: "cursos_epcc_2023.csv",
      content: `name,school,is_thesis,code,cycle,credits,course_type,curriculum
REDACCION Y TECNICAS DE COMUNICACION EFECTIVA I,Transversal,false,INO101,1,3,Obligatorio,2023
ESTRUCTURAS DISCRETAS I,EPCC,false,203230301,3,4,Obligatorio,2023`,
    };

    const existingCourseIds = new Set(["transversal-ino101"]);

    const result = buildCourseImport({
      files: [fileEpis, fileEpcc],
      existingCourseIds,
    });

    expect(result.ok).toBe(true);
    expect(result.totalRows).toBe(4);
    expect(result.filesCount).toBe(2);
    // 3 distinct courses: transversal-ino101, epis-201230301, epcc-203230301
    expect(result.consolidatedCoursesCount).toBe(3);
    // transversal-ino101 is already in DB -> updated
    expect(result.updatedCoursesCount).toBe(1);
    // epis-201230301 and epcc-203230301 are new
    expect(result.newCoursesCount).toBe(2);

    const transversal = result.coursesToUpsert.find(
      (c) => c.id === "transversal-ino101",
    );
    expect(transversal).toBeDefined();
    expect(transversal?.name).toBe(
      "REDACCION Y TECNICAS DE COMUNICACION EFECTIVA I",
    );
    expect(transversal?.school).toBe("Transversal");
  });
});
