import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./types";

type StudentDetailRouteName = "ClassDetail" | "ModuleDetail" | "LessonDetail" | "AssessmentDetail";
type StudentDetailParams<RouteName extends StudentDetailRouteName> = RootStackParamList[RouteName];

type StudentDetailBackTarget =
  | { name: "MainTabs"; params: NonNullable<RootStackParamList["MainTabs"]> }
  | { name: "ClassDetail"; params: RootStackParamList["ClassDetail"] }
  | { name: "ModuleDetail"; params: RootStackParamList["ModuleDetail"] }
  | { name: "Courses"; params: RootStackParamList["Courses"] }
  | { name: "Calendar"; params: RootStackParamList["Calendar"] }
  | { name: "AssessmentHistory"; params: RootStackParamList["AssessmentHistory"] };

export function resolveStudentDetailBackTarget<RouteName extends StudentDetailRouteName>(
  routeName: RouteName,
  params: StudentDetailParams<RouteName>,
): StudentDetailBackTarget {
  switch (routeName) {
    case "ClassDetail": {
      const value = params as RootStackParamList["ClassDetail"];
      if (value.source === "home") return { name: "MainTabs", params: { screen: "Dashboard" } };
      if (value.source === "calendar") return { name: "Calendar", params: undefined };
      if (value.source === "courses") return { name: "Courses", params: undefined };
      return { name: "MainTabs", params: { screen: "Classes" } };
    }
    case "ModuleDetail": {
      const value = params as RootStackParamList["ModuleDetail"];
      return { name: "ClassDetail", params: { classId: value.classId, initialTab: "modules" } };
    }
    case "LessonDetail": {
      const value = params as RootStackParamList["LessonDetail"];
      if (value.source === "home") return { name: "MainTabs", params: { screen: "Dashboard" } };
      if (value.source === "ja") return { name: "MainTabs", params: { screen: "JA" } };
      if (value.classId && value.moduleId) {
        return { name: "ModuleDetail", params: { classId: value.classId, moduleId: value.moduleId, source: "class" } };
      }
      if (value.classId) return { name: "ClassDetail", params: { classId: value.classId, initialTab: "modules" } };
      return { name: "MainTabs", params: { screen: "Classes" } };
    }
    case "AssessmentDetail": {
      const value = params as RootStackParamList["AssessmentDetail"];
      if (value.source === "class") return { name: "ClassDetail", params: { classId: value.classId, initialTab: "assignments" } };
      if (value.source === "home") return { name: "MainTabs", params: { screen: "Dashboard" } };
      if (value.source === "calendar") return { name: "Calendar", params: undefined };
      if (value.source === "history") return { name: "AssessmentHistory", params: { assessmentId: value.assessmentId, classId: value.classId } };
      return { name: "MainTabs", params: { screen: "Assessments" } };
    }
  }
}

export function navigateStudentDetailBack<RouteName extends StudentDetailRouteName>(
  navigation: NativeStackNavigationProp<RootStackParamList>,
  routeName: RouteName,
  params: StudentDetailParams<RouteName>,
) {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }
  const target = resolveStudentDetailBackTarget(routeName, params);
  const navigate = navigation.navigate as unknown as (name: StudentDetailBackTarget["name"], params: StudentDetailBackTarget["params"]) => void;
  navigate(target.name, target.params);
}
