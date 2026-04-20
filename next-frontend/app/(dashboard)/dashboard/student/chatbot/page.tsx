import { redirect } from "next/navigation";

export default function StudentChatbotRedirectPage() {
  redirect("/dashboard/student/lxp?tab=ja&mode=ask");
}
