import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StudentClassDetailContent } from "./ClassDetailScreen";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "ClassWorkspace">;

export function SubjectLessonsScreen({ route, navigation }: Props) {
  return <StudentClassDetailContent classId={route.params.classId} navigation={navigation} />;
}
