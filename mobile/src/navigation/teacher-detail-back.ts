import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./types";

type TeacherDetailRouteName =
  | "TeacherClassDetail"
  | "TeacherModuleDetail"
  | "TeacherLessonDetail"
  | "TeacherClassAddStudents"
  | "TeacherAiDraft";

type TeacherDetailParams<RouteName extends TeacherDetailRouteName> =
  RootStackParamList[RouteName];

type TeacherDetailBackTarget =
  | {
      name: "TeacherDrawer";
      params: NonNullable<RootStackParamList["TeacherDrawer"]>;
    }
  | {
      name: "TeacherClassDetail";
      params: RootStackParamList["TeacherClassDetail"];
    }
  | {
      name: "TeacherModuleDetail";
      params: RootStackParamList["TeacherModuleDetail"];
    };

const classSourceScreens = {
  classes: "Classes",
  home: "Home",
  announcements: "TeacherAnnouncements",
  calendar: "TeacherCalendar",
} as const;

export function resolveTeacherDetailBackTarget<RouteName extends TeacherDetailRouteName>(
  routeName: RouteName,
  params: TeacherDetailParams<RouteName>,
): TeacherDetailBackTarget {
  switch (routeName) {
    case "TeacherClassDetail": {
      const classParams = params as RootStackParamList["TeacherClassDetail"];
      return {
        name: "TeacherDrawer",
        params: { screen: classSourceScreens[classParams.source ?? "classes"] },
      };
    }
    case "TeacherModuleDetail": {
      const moduleParams = params as RootStackParamList["TeacherModuleDetail"];
      if (moduleParams.source === "library") {
        return {
          name: "TeacherDrawer",
          params: { screen: "TeacherLibrary" },
        };
      }
      return {
        name: "TeacherClassDetail",
        params: { classId: moduleParams.classId, initialTab: "modules" },
      };
    }
    case "TeacherLessonDetail": {
      const lessonParams = params as RootStackParamList["TeacherLessonDetail"];
      if (lessonParams.source === "lessons") {
        return {
          name: "TeacherDrawer",
          params: { screen: "TeacherLessons" },
        };
      }
      if (lessonParams.classId && lessonParams.moduleId) {
        return {
          name: "TeacherModuleDetail",
          params: {
            classId: lessonParams.classId,
            moduleId: lessonParams.moduleId,
            source: lessonParams.moduleSource ?? "class",
          },
        };
      }
      if (lessonParams.classId) {
        return {
          name: "TeacherClassDetail",
          params: { classId: lessonParams.classId, initialTab: "modules" },
        };
      }
      return {
        name: "TeacherDrawer",
        params: { screen: "TeacherLessons" },
      };
    }
    case "TeacherClassAddStudents": {
      const studentParams = params as RootStackParamList["TeacherClassAddStudents"];
      return {
        name: "TeacherClassDetail",
        params: {
          classId: studentParams.classId,
          initialTab: studentParams.sourceTab ?? "students",
        },
      };
    }
    case "TeacherAiDraft": {
      const aiParams = params as RootStackParamList["TeacherAiDraft"];
      if (aiParams.source === "assessments") {
        return {
          name: "TeacherDrawer",
          params: { screen: "Assessments" },
        };
      }
      return {
        name: "TeacherClassDetail",
        params: {
          classId: aiParams.classId,
          initialTab: aiParams.sourceTab ?? "assessments",
        },
      };
    }
  }
}

export function navigateTeacherDetailBack<RouteName extends TeacherDetailRouteName>(
  navigation: NativeStackNavigationProp<RootStackParamList>,
  routeName: RouteName,
  params: TeacherDetailParams<RouteName>,
) {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }

  const target = resolveTeacherDetailBackTarget(routeName, params);
  const navigate = navigation.navigate as unknown as (
    name: TeacherDetailBackTarget["name"],
    params: TeacherDetailBackTarget["params"],
  ) => void;
  navigate(target.name, target.params);
}
