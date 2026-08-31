import { useEffect } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";

/** Compatibility entry point: all assessment authoring uses the same editor. */
export function TeacherCreateAssessmentScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, "TeacherCreateAssessment">) {
  useEffect(() => {
    navigation.replace("TeacherAssessmentEditor", {
      classId: route.params.classId,
    });
  }, [navigation, route.params.classId]);
  return null;
}
