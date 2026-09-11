import { useState } from "react";
import { Alert, Text, View } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { schoolEventsApi } from "../api/services/school-events";
import { toAppError } from "../api/http";
import type { MainTabParamList } from "../navigation/types";
import type { SchoolEvent, SchoolEventType } from "../types/school-event";
import {
  AdminButton,
  AdminChip,
  AdminDataRow,
  AdminField,
  AdminNotice,
  AdminScreen,
  AdminSection,
  adminTheme as theme,
} from "../components/admin/AdminMobilePrimitives";

type Props = BottomTabScreenProps<MainTabParamList, "AdminCalendar">;
type Picker = { field: "start" | "end"; mode: "date" | "time" } | null;

export function AdminCalendarScreen(_props: Props) {
  const queryClient = useQueryClient();
  const events = useQuery({
    queryKey: ["admin-school-events"],
    queryFn: () => schoolEventsApi.getAll(),
  });
  const [editing, setEditing] = useState<SchoolEvent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [eventType, setEventType] = useState<SchoolEventType>("school_event");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [schoolYear, setSchoolYear] = useState(
    `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  );
  const [startsAt, setStartsAt] = useState(
    () => new Date(Date.now() + 86400000),
  );
  const [endsAt, setEndsAt] = useState(() => new Date(Date.now() + 90000000));
  const [picker, setPicker] = useState<Picker>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reset = () => {
    setEditing(null);
    setShowForm(false);
    setEventType("school_event");
    setTitle("");
    setDescription("");
    setLocation("");
    setStartsAt(new Date(Date.now() + 86400000));
    setEndsAt(new Date(Date.now() + 90000000));
    setPicker(null);
    setError(null);
  };
  const edit = (event: SchoolEvent) => {
    setEditing(event);
    setEventType(event.eventType);
    setTitle(event.title);
    setDescription(event.description ?? "");
    setLocation(event.location ?? "");
    setSchoolYear(event.schoolYear);
    setStartsAt(new Date(event.startsAt));
    setEndsAt(new Date(event.endsAt));
    setShowForm(true);
  };
  const changeDate = (_event: DateTimePickerEvent, value?: Date) => {
    if (!picker || !value) {
      setPicker(null);
      return;
    }
    const current = picker.field === "start" ? startsAt : endsAt;
    const next = new Date(current);
    if (picker.mode === "date")
      next.setFullYear(value.getFullYear(), value.getMonth(), value.getDate());
    else next.setHours(value.getHours(), value.getMinutes(), 0, 0);
    if (picker.field === "start") setStartsAt(next);
    else setEndsAt(next);
    setPicker(null);
  };
  const save = async () => {
    if (
      !title.trim() ||
      !schoolYear.trim() ||
      endsAt <= startsAt ||
      (eventType === "school_event" && !location.trim())
    ) {
      setError(
        "Enter a title, school year, location when required, and an end time after the start.",
      );
      return;
    }
    try {
      setBusy(true);
      setError(null);
      const payload = {
        eventType,
        schoolYear: schoolYear.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        location: eventType === "school_event" ? location.trim() : undefined,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        allDay: eventType === "holiday_break",
      };
      if (editing) await schoolEventsApi.update(editing.id, payload);
      else await schoolEventsApi.create(payload);
      reset();
      await queryClient.invalidateQueries({
        queryKey: ["admin-school-events"],
      });
    } catch (nextError) {
      setError(toAppError(nextError).message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    try {
      setBusy(true);
      await schoolEventsApi.remove(id);
      await queryClient.invalidateQueries({
        queryKey: ["admin-school-events"],
      });
    } catch (nextError) {
      Alert.alert("Delete rejected", toAppError(nextError).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <AdminScreen
      title="School Calendar"
      subtitle="Readable local dates; ISO transport stays inside the service request"
      refreshing={events.isRefetching}
      onRefresh={() => void events.refetch()}
      rightAction={
        <AdminButton
          label={showForm ? "Close" : "New event"}
          icon={showForm ? "close" : "calendar-plus"}
          variant="solid"
          onPress={() => (showForm ? reset() : setShowForm(true))}
        />
      }
    >
      {error ? (
        <AdminNotice
          title="Event was not saved"
          description={error}
          tone="red"
        />
      ) : null}
      {showForm ? (
        <AdminSection
          title={editing ? "Edit event" : "Create event"}
          subtitle="Times are shown in the device timezone"
        >
          <View style={{ padding: 16, gap: 10 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <AdminChip
                label="School event"
                active={eventType === "school_event"}
                onPress={() => setEventType("school_event")}
              />
              <AdminChip
                label="Holiday break"
                active={eventType === "holiday_break"}
                onPress={() => setEventType("holiday_break")}
              />
            </View>
            <AdminField label="Title" value={title} onChangeText={setTitle} />
            <AdminField
              label="Description"
              value={description}
              onChangeText={setDescription}
              multiline
            />
            <AdminField
              label="School year"
              value={schoolYear}
              onChangeText={setSchoolYear}
            />
            {eventType === "school_event" ? (
              <AdminField
                label="Location"
                value={location}
                onChangeText={setLocation}
              />
            ) : null}
            <Text style={{ color: theme.text, fontWeight: "800" }}>
              Starts: {startsAt.toLocaleString()}
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <AdminButton
                label="Start date"
                onPress={() => setPicker({ field: "start", mode: "date" })}
              />
              <AdminButton
                label="Start time"
                onPress={() => setPicker({ field: "start", mode: "time" })}
              />
            </View>
            <Text style={{ color: theme.text, fontWeight: "800" }}>
              Ends: {endsAt.toLocaleString()}
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <AdminButton
                label="End date"
                onPress={() => setPicker({ field: "end", mode: "date" })}
              />
              <AdminButton
                label="End time"
                onPress={() => setPicker({ field: "end", mode: "time" })}
              />
            </View>
            {picker ? (
              <DateTimePicker
                value={picker.field === "start" ? startsAt : endsAt}
                mode={picker.mode}
                onChange={changeDate}
              />
            ) : null}
            <AdminButton
              label={busy ? "Saving…" : editing ? "Save event" : "Create event"}
              icon="content-save"
              tone="green"
              variant="solid"
              disabled={busy}
              onPress={() => void save()}
            />
          </View>
        </AdminSection>
      ) : null}
      <AdminSection
        title="Events"
        subtitle={`${events.data?.length ?? 0} scheduled records`}
      >
        {(events.data ?? []).map((event) => (
          <View
            key={event.id}
            style={{ borderBottomWidth: 1, borderBottomColor: theme.border }}
          >
            <AdminDataRow
              title={event.title}
              subtitle={`${new Date(event.startsAt).toLocaleString()} – ${new Date(event.endsAt).toLocaleString()}`}
              meta={
                event.location ??
                (event.allDay ? "All-day break" : "No location")
              }
              status={
                Date.parse(event.endsAt) >= Date.now() ? "Upcoming" : "Past"
              }
              statusTone={
                Date.parse(event.endsAt) >= Date.now() ? "green" : "neutral"
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
                label="Edit"
                variant="text"
                onPress={() => edit(event)}
              />
              <AdminButton
                label="Delete"
                variant="text"
                tone="red"
                disabled={busy}
                onPress={() =>
                  Alert.alert(
                    "Delete this event?",
                    "This calendar record will be removed.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => void remove(event.id),
                      },
                    ],
                  )
                }
              />
            </View>
          </View>
        ))}
      </AdminSection>
    </AdminScreen>
  );
}
