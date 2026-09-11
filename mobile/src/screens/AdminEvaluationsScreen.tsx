import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import {
  evaluationsApi,
  type SystemEvaluationAudienceRole,
  type SystemEvaluationCampaignStatus,
  type SystemEvaluationFormType,
  type SystemEvaluationTargetModule,
} from "../api/services/evaluations";
import { classesApi } from "../api/services/classes";
import { toAppError } from "../api/http";
import {
  AdminButton,
  AdminChip,
  AdminDataRow,
  AdminEmpty,
  AdminField,
  AdminMetricStrip,
  AdminNotice,
  AdminScreen,
  AdminSection,
  adminTheme as theme,
} from "../components/admin/AdminMobilePrimitives";
import type { MainTabParamList } from "../navigation/types";

type Props = BottomTabScreenProps<MainTabParamList, "AdminEvaluations">;
type PickerField = "startsAt" | "endsAt" | "responseFrom" | "responseTo";
const modules: Array<{
  key: "all" | SystemEvaluationTargetModule;
  label: string;
}> = [
  { key: "all", label: "All" },
  { key: "lms", label: "LMS" },
  { key: "lxp", label: "Learners Path" },
  { key: "ai_mentor", label: "AI Mentor" },
  { key: "intervention", label: "Intervention" },
  { key: "overall", label: "Overall" },
];
const tomorrow = () => new Date(Date.now() + 86_400_000);
const nextWeek = () => new Date(Date.now() + 7 * 86_400_000);

export function AdminEvaluationsScreen(_props: Props) {
  const queryClient = useQueryClient();
  const [targetModule, setTargetModule] = useState<
    "all" | SystemEvaluationTargetModule
  >("all");
  const [responseAudience, setResponseAudience] = useState<
    "all" | SystemEvaluationAudienceRole
  >("all");
  const [responseCampaignId, setResponseCampaignId] = useState("");
  const [responseFrom, setResponseFrom] = useState<Date | null>(null);
  const [responseTo, setResponseTo] = useState<Date | null>(null);
  const [audienceRole, setAudienceRole] =
    useState<SystemEvaluationAudienceRole>("student");
  const [formType, setFormType] = useState<SystemEvaluationFormType>("system");
  const [campaignStatus, setCampaignStatus] =
    useState<SystemEvaluationCampaignStatus>("active");
  const [classId, setClassId] = useState("");
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState(tomorrow);
  const [endsAt, setEndsAt] = useState(nextWeek);
  const [campaignSearch, setCampaignSearch] = useState("");
  const [debouncedCampaignSearch, setDebouncedCampaignSearch] = useState("");
  const [campaignPage, setCampaignPage] = useState(1);
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(
    null,
  );
  const [showCreate, setShowCreate] = useState(false);
  const [picker, setPicker] = useState<{
    field: PickerField;
    mode: "date" | "time";
  } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCampaignSearch(campaignSearch.trim());
      setCampaignPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [campaignSearch]);
  const campaigns = useQuery({
    queryKey: [
      "admin-evaluation-campaigns",
      campaignPage,
      debouncedCampaignSearch,
    ],
    queryFn: () =>
      evaluationsApi.getCampaigns({
        page: campaignPage,
        limit: 10,
        search: debouncedCampaignSearch || undefined,
      }),
  });
  const classes = useQuery({
    queryKey: ["admin-evaluation-class-options"],
    queryFn: () => classesApi.getPage({ page: 1, limit: 100 }),
    enabled: showCreate,
  });
  const responses = useQuery({
    queryKey: [
      "admin-evaluation-responses",
      targetModule,
      responseAudience,
      responseCampaignId,
      responseFrom?.toISOString(),
      responseTo?.toISOString(),
    ],
    queryFn: () =>
      evaluationsApi.getEvaluations({
        ...(targetModule !== "all" ? { targetModule } : {}),
        ...(responseAudience !== "all"
          ? { audienceRole: responseAudience }
          : {}),
        ...(responseCampaignId ? { campaignId: responseCampaignId } : {}),
        ...(responseFrom
          ? {
              from: new Date(
                responseFrom.getFullYear(),
                responseFrom.getMonth(),
                responseFrom.getDate(),
              ).toISOString(),
            }
          : {}),
        ...(responseTo
          ? {
              to: new Date(
                responseTo.getFullYear(),
                responseTo.getMonth(),
                responseTo.getDate(),
                23,
                59,
                59,
                999,
              ).toISOString(),
            }
          : {}),
      }),
  });
  const summary = responses.data?.summary;
  const changeDate = (_event: DateTimePickerEvent, value?: Date) => {
    if (!picker || !value) {
      setPicker(null);
      return;
    }
    if (picker.field === "responseFrom") setResponseFrom(value);
    else if (picker.field === "responseTo") setResponseTo(value);
    else {
      const current = picker.field === "startsAt" ? startsAt : endsAt;
      const next = new Date(current);
      if (picker.mode === "date")
        next.setFullYear(
          value.getFullYear(),
          value.getMonth(),
          value.getDate(),
        );
      else next.setHours(value.getHours(), value.getMinutes(), 0, 0);
      if (picker.field === "startsAt") setStartsAt(next);
      else setEndsAt(next);
    }
    setPicker(null);
  };
  const pickerValue =
    picker?.field === "startsAt"
      ? startsAt
      : picker?.field === "endsAt"
        ? endsAt
        : picker?.field === "responseFrom"
          ? (responseFrom ?? new Date())
          : (responseTo ?? new Date());
  const create = async () => {
    if (!title.trim() || endsAt <= startsAt) {
      Alert.alert(
        "Campaign not ready",
        "Enter a title and choose an end time after the start time.",
      );
      return;
    }
    try {
      setBusy(true);
      await evaluationsApi.createCampaign({
        formType,
        audienceRole,
        classId: classId || undefined,
        title: title.trim(),
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        status: campaignStatus,
      });
      setShowCreate(false);
      setTitle("");
      setClassId("");
      setStartsAt(tomorrow());
      setEndsAt(nextWeek());
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-evaluation-campaigns"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["admin-evaluation-responses"],
        }),
      ]);
    } catch (error) {
      Alert.alert("Campaign not created", toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminScreen
      title="Evaluations"
      subtitle="Campaign configuration and response evidence"
      refreshing={campaigns.isRefetching || responses.isRefetching}
      onRefresh={() =>
        void Promise.all([campaigns.refetch(), responses.refetch()])
      }
      rightAction={
        <AdminButton
          label={showCreate ? "Close" : "New campaign"}
          icon={showCreate ? "close" : "plus"}
          onPress={() => setShowCreate((value) => !value)}
        />
      }
    >
      {responses.isError || campaigns.isError ? (
        <AdminNotice
          title="Evaluation data is incomplete"
          description={toAppError(responses.error ?? campaigns.error).message}
          tone="red"
        />
      ) : null}
      {showCreate ? (
        <AdminSection
          title="Campaign builder"
          subtitle="Matches the web form type, audience, title, readable dates, optional class scope, and status"
        >
          <View style={{ padding: 16, gap: 10 }}>
            <Text style={{ fontWeight: "900", color: theme.text }}>
              Form type
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <AdminChip
                label="System"
                active={formType === "system"}
                onPress={() => setFormType("system")}
              />
              <AdminChip
                label="JA Hub"
                active={formType === "ja_hub"}
                onPress={() => {
                  setFormType("ja_hub");
                  setAudienceRole("student");
                }}
              />
            </View>
            <Text style={{ fontWeight: "900", color: theme.text }}>
              Audience
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <AdminChip
                label="Students"
                active={audienceRole === "student"}
                onPress={() => setAudienceRole("student")}
              />
              <AdminChip
                label="Teachers"
                active={audienceRole === "teacher"}
                disabled={formType === "ja_hub"}
                onPress={() => setAudienceRole("teacher")}
              />
            </View>
            <AdminField
              label="Campaign title"
              value={title}
              onChangeText={setTitle}
            />
            <Text style={{ fontWeight: "900", color: theme.text }}>
              Optional class scope
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <AdminChip
                label="Role-wide"
                active={!classId}
                onPress={() => setClassId("")}
              />
              {(classes.data?.data ?? []).map((entry) => (
                <AdminChip
                  key={entry.id}
                  label={`${entry.subjectCode} · ${entry.section?.name ?? "No section"}`}
                  active={classId === entry.id}
                  onPress={() => setClassId(entry.id)}
                />
              ))}
            </View>
            <Text style={{ color: theme.text, fontWeight: "800" }}>
              Starts: {startsAt.toLocaleString()}
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <AdminButton
                label="Start date"
                onPress={() => setPicker({ field: "startsAt", mode: "date" })}
              />
              <AdminButton
                label="Start time"
                onPress={() => setPicker({ field: "startsAt", mode: "time" })}
              />
            </View>
            <Text style={{ color: theme.text, fontWeight: "800" }}>
              Ends: {endsAt.toLocaleString()}
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <AdminButton
                label="End date"
                onPress={() => setPicker({ field: "endsAt", mode: "date" })}
              />
              <AdminButton
                label="End time"
                onPress={() => setPicker({ field: "endsAt", mode: "time" })}
              />
            </View>
            <Text style={{ fontWeight: "900", color: theme.text }}>
              Initial status
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <AdminChip
                label="Draft"
                active={campaignStatus === "draft"}
                onPress={() => setCampaignStatus("draft")}
              />
              <AdminChip
                label="Active"
                active={campaignStatus === "active"}
                onPress={() => setCampaignStatus("active")}
              />
            </View>
            <AdminButton
              label={
                busy
                  ? "Creating…"
                  : campaignStatus === "active"
                    ? "Create and activate"
                    : "Save draft campaign"
              }
              tone="green"
              variant="solid"
              disabled={busy}
              onPress={() => void create()}
            />
          </View>
        </AdminSection>
      ) : null}
      {picker ? (
        <DateTimePicker
          value={pickerValue}
          mode={picker.mode}
          onChange={changeDate}
        />
      ) : null}
      <AdminSection
        title="Campaigns"
        subtitle={`${campaigns.data?.total ?? campaigns.data?.count ?? 0} matching campaigns · server page ${campaignPage}`}
      >
        <View style={{ padding: 16 }}>
          <AdminField
            label="Search campaigns"
            value={campaignSearch}
            onChangeText={setCampaignSearch}
          />
        </View>
        {(campaigns.data?.campaigns ?? []).map((campaign) => (
          <View
            key={campaign.id}
            style={{ borderBottomWidth: 1, borderBottomColor: theme.border }}
          >
            <AdminDataRow
              title={campaign.title}
              subtitle={`${campaign.formType} · ${campaign.audienceRole} · ${campaign.submittedCount}/${campaign.assignmentCount} submitted`}
              meta={`${new Date(campaign.startsAt).toLocaleString()} – ${new Date(campaign.endsAt).toLocaleString()}`}
              status={campaign.status}
              statusTone={
                campaign.status === "active"
                  ? "green"
                  : campaign.status === "draft"
                    ? "amber"
                    : "neutral"
              }
            />
            <View
              style={{
                paddingHorizontal: 12,
                paddingBottom: 10,
                flexDirection: "row",
                gap: 8,
              }}
            >
              <AdminButton
                label={campaign.status === "active" ? "Close" : "Activate"}
                tone={campaign.status === "active" ? "amber" : "green"}
                variant="text"
                onPress={() =>
                  void evaluationsApi
                    .updateCampaignStatus(
                      campaign.id,
                      campaign.status === "active" ? "closed" : "active",
                    )
                    .then(() => campaigns.refetch())
                    .catch((error) =>
                      Alert.alert("Status rejected", toAppError(error).message),
                    )
                }
              />
              <AdminButton
                label="Filter responses"
                variant="text"
                onPress={() => setResponseCampaignId(campaign.id)}
              />
            </View>
          </View>
        ))}
        {!campaigns.isLoading && !campaigns.data?.campaigns.length ? (
          <AdminEmpty
            title={
              campaignSearch.trim() ? "No matching campaigns" : "No campaigns"
            }
            subtitle={
              campaignSearch.trim()
                ? "Clear the campaign search to see all records."
                : "Create a draft or active evaluation window."
            }
            actionLabel={campaignSearch.trim() ? "Clear search" : undefined}
            onAction={
              campaignSearch.trim() ? () => setCampaignSearch("") : undefined
            }
          />
        ) : null}
        <View
          style={{
            padding: 16,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <AdminButton
            label="Previous"
            disabled={campaignPage <= 1}
            onPress={() => setCampaignPage((value) => Math.max(1, value - 1))}
          />
          <Text style={{ color: theme.subtext }}>
            Page {campaignPage} of {campaigns.data?.totalPages ?? 1}
          </Text>
          <AdminButton
            label="Next"
            disabled={campaignPage >= (campaigns.data?.totalPages ?? 1)}
            onPress={() => setCampaignPage((value) => value + 1)}
          />
        </View>
      </AdminSection>
      <AdminSection
        title="Response filters"
        subtitle="Module, audience, campaign, and readable date boundaries"
      >
        <View style={{ padding: 16, gap: 10 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {modules.map((module) => (
              <AdminChip
                key={module.key}
                label={module.label}
                active={targetModule === module.key}
                onPress={() => setTargetModule(module.key)}
              />
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <AdminChip
              label="All audiences"
              active={responseAudience === "all"}
              onPress={() => setResponseAudience("all")}
            />
            <AdminChip
              label="Students"
              active={responseAudience === "student"}
              onPress={() => setResponseAudience("student")}
            />
            <AdminChip
              label="Teachers"
              active={responseAudience === "teacher"}
              onPress={() => setResponseAudience("teacher")}
            />
          </View>
          <Text style={{ color: theme.text, fontWeight: "800" }}>
            From: {responseFrom?.toLocaleDateString() ?? "Any date"}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <AdminButton
              label="Choose from date"
              onPress={() => setPicker({ field: "responseFrom", mode: "date" })}
            />
            <AdminButton
              label="Clear from"
              disabled={!responseFrom}
              onPress={() => setResponseFrom(null)}
            />
          </View>
          <Text style={{ color: theme.text, fontWeight: "800" }}>
            To: {responseTo?.toLocaleDateString() ?? "Any date"}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <AdminButton
              label="Choose to date"
              onPress={() => setPicker({ field: "responseTo", mode: "date" })}
            />
            <AdminButton
              label="Clear to"
              disabled={!responseTo}
              onPress={() => setResponseTo(null)}
            />
          </View>
          {responseCampaignId ? (
            <AdminNotice
              title="Campaign filter active"
              description={
                campaigns.data?.campaigns.find(
                  (entry) => entry.id === responseCampaignId,
                )?.title ?? responseCampaignId
              }
              tone="primary"
            />
          ) : null}
          {responseCampaignId ? (
            <AdminButton
              label="Clear campaign filter"
              onPress={() => setResponseCampaignId("")}
            />
          ) : null}
        </View>
      </AdminSection>
      <AdminMetricStrip
        items={[
          { label: "Responses", value: responses.data?.count ?? 0 },
          {
            label: "Satisfaction",
            value: summary
              ? Number(summary.averages.satisfactionScore).toFixed(1)
              : "—",
            tone: "green",
          },
          {
            label: "Usability",
            value: summary
              ? Number(summary.averages.usabilityScore).toFixed(1)
              : "—",
          },
          {
            label: "Feedback",
            value: summary?.feedbackCount ?? 0,
            tone: "amber",
          },
        ]}
      />
      <AdminSection
        title="Responses"
        subtitle="Scores, comments, submitter, campaign, and target module"
      >
        {(responses.data?.rows ?? []).map((row) => (
          <View key={row.id}>
            <AdminDataRow
              title={
                [row.submitter?.firstName, row.submitter?.lastName]
                  .filter(Boolean)
                  .join(" ") ||
                row.submitter?.email ||
                row.submittedBy
              }
              subtitle={`${row.campaign?.title ?? "Direct evaluation"} · ${row.targetModule}`}
              meta={`Overall ${row.overallScore ?? row.satisfactionScore}/5${row.feedback ? ` · ${row.feedback}` : ""}`}
              status={
                selectedResponseId === row.id
                  ? "Open"
                  : new Date(row.createdAt).toLocaleDateString()
              }
              statusTone={selectedResponseId === row.id ? "primary" : "neutral"}
              onPress={() =>
                setSelectedResponseId((current) =>
                  current === row.id ? null : row.id,
                )
              }
            />
            {selectedResponseId === row.id ? (
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingBottom: 14,
                  gap: 5,
                  backgroundColor: theme.surfaceMuted,
                }}
              >
                <Text selectable style={{ color: theme.text, fontSize: 12 }}>
                  Response {row.id} · Campaign {row.campaignId ?? "Direct"}
                </Text>
                <Text style={{ color: theme.subtext, fontSize: 12 }}>
                  Usability {row.usabilityScore}/5 · Functionality{" "}
                  {row.functionalityScore}/5 · Performance{" "}
                  {row.performanceScore}/5 · Satisfaction{" "}
                  {row.satisfactionScore}/5
                </Text>
                <Text selectable style={{ color: theme.subtext, fontSize: 12 }}>
                  Feedback: {row.feedback || "None"}
                </Text>
                {Object.entries(row.questionRatingsJson ?? {}).map(
                  ([key, value]) => (
                    <Text
                      key={key}
                      style={{ color: theme.subtext, fontSize: 12 }}
                    >
                      {key}: {value}/5
                    </Text>
                  ),
                )}
                {Object.entries(row.aiContextMetadata ?? {}).map(
                  ([key, value]) => (
                    <Text
                      key={key}
                      selectable
                      style={{ color: theme.muted, fontSize: 11 }}
                    >
                      AI context {key}: {String(value)}
                    </Text>
                  ),
                )}
              </View>
            ) : null}
          </View>
        ))}
        {!responses.isLoading && !responses.data?.rows.length ? (
          <AdminEmpty
            title="No evaluation responses"
            subtitle="No respondents match the selected module, audience, campaign, and date filters."
          />
        ) : null}
      </AdminSection>
    </AdminScreen>
  );
}
