import { AcademicWorkbook } from "../academic/AcademicWorkbook";
export function TeacherClassRecordBoard(props: {
  classId: string;
  registerRefetch?: (refetch: () => Promise<unknown>) => void;
}) {
  return <AcademicWorkbook {...props} />;
}
