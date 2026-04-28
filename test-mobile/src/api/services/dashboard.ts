import { announcementsApi } from "./announcements";
import { assessmentsApi } from "./assessments";
import { classesApi } from "./classes";
import { lessonsApi } from "./lessons";
import { schoolEventsApi } from "./school-events";
import type { SchoolEventQuery } from "../../types/school-event";

export const dashboardApi = {
  async getSchoolEvents(query?: SchoolEventQuery) {
    return schoolEventsApi.getAll(query);
  },

  async getStudentHomeData(studentId: string, schoolYear?: string) {
    const classes = await classesApi.getStudentClasses(studentId);
    const enrolledClasses = classes ?? [];
    const classIds = enrolledClasses.map((classItem) => classItem.id).slice(0, 10);

    const [lessonGroups, assessmentGroups, announcementGroups, schoolEvents] = await Promise.all([
      Promise.all(classIds.map((classId) => lessonsApi.getByClass(classId).catch(() => []))),
      Promise.all(classIds.map((classId) => assessmentsApi.getByClass(classId).catch(() => []))),
      Promise.all(classIds.map((classId) => announcementsApi.getByClass(classId).catch(() => []))),
      schoolEventsApi.getAll(schoolYear ? { schoolYear } : undefined).catch(() => []),
    ]);

    return {
      classes: enrolledClasses,
      lessons: lessonGroups.flat(),
      assessments: assessmentGroups.flat(),
      announcementsByClass: Object.fromEntries(
        classIds.map((classId, index) => [classId, announcementGroups[index] ?? []]),
      ),
      schoolEvents,
    };
  },
};
