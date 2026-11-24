import { describe, expect, test } from "bun:test";
import {
  courseBelongsToSchool,
  curriculaForSchool,
  visibleCoursesForSchool,
  visibleCoursesForSchoolAndCurriculum,
} from "@/lib/domain/schedule-courses";
import { courseCatalog } from "@/lib/domain/schedule-data";

describe("schedule courses", () => {
  test("filters courses strictly by school, including transversal when selected", () => {
    expect(courseBelongsToSchool(courseCatalog[9], "Transversal")).toBe(true);
    expect(courseBelongsToSchool(courseCatalog[9], "Ing. de Sistemas")).toBe(
      false,
    );
    expect(courseBelongsToSchool(courseCatalog[9], "Contabilidad")).toBe(false);
  });

  test("filters active courses strictly to the selected school", () => {
    const visible = visibleCoursesForSchool(
      [
        ...courseCatalog,
        {
          id: "suspendido",
          name: "Curso suspendido",
          school: "Ing. de Sistemas",
          active: false,
        },
      ],
      "Contabilidad",
    );

    expect(visible.map((course) => course.id)).toEqual([
      "contabilidad-general",
      "costos",
    ]);
  });

  test("extracts distinct curricula for a school and filters courses by curriculum", () => {
    const sampleCatalog = [
      {
        id: "c1",
        name: "Algoritmos",
        school: "Ingeniería de Sistemas",
        curriculum: "2018",
      },
      {
        id: "c2",
        name: "IA Avanzada",
        school: "Ingeniería de Sistemas",
        curriculum: "2023",
      },
      { id: "c3", name: "Tesis", school: "Transversal", isThesis: true },
    ];

    expect(curriculaForSchool(sampleCatalog, "Ingeniería de Sistemas")).toEqual(
      ["2018", "2023"],
    );

    const plan2018 = visibleCoursesForSchoolAndCurriculum(
      sampleCatalog,
      "Ingeniería de Sistemas",
      "2018",
    );
    expect(plan2018.map((c) => c.id)).toEqual(["c1"]);

    const plan2023 = visibleCoursesForSchoolAndCurriculum(
      sampleCatalog,
      "Ingeniería de Sistemas",
      "2023",
    );
    expect(plan2023.map((c) => c.id)).toEqual(["c2"]);
  });
});
