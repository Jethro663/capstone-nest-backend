import React, { useState, useEffect, useMemo } from "react";
import { X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ApiErrorModal from "@/components/modals/ApiErrorModal";
import api from "@/services/api";

const CreateClassModal = ({ classItem, onClose, onAddClass }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [showApiError, setShowApiError] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [formData, setFormData] = useState({
    subjectId: "",
    sectionId: "",
    teacherId: "",
    schoolYear: "",
    schedule: { days: [], startTime: "", endTime: "" },
    room: "",
  });

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    setLoadingOptions(true);
    try {
      const [subjectsRes, sectionsRes, usersRes] = await Promise.all([
        api.get("/subjects/all"),
        api.get("/sections/all"),
        api.get("/users/all"),
      ]);

      if (subjectsRes.data.success) setSubjects(subjectsRes.data.data || []);
      if (sectionsRes.data.success) setSections(sectionsRes.data.data || []);
      if (usersRes.data.success) {
        const teachersList = usersRes.data.users.filter(
          (u) => u.roles?.some((role) => role?.name === "teacher")
        );
        setTeachers(teachersList);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load form options");
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    if (classItem) {
      const scheduleData = classItem.schedule ? parseSchedule(classItem.schedule) : { days: [], startTime: "", endTime: "" };
      setFormData({
        subjectId: classItem.subjectId || "",
        sectionId: classItem.sectionId || "",
        teacherId: classItem.teacherId || "",
        schoolYear: classItem.schoolYear || "",
        schedule: scheduleData,
        room: classItem.room || "",
      });
    }
  }, [classItem]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (value) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const parseSchedule = (scheduleStr) => {
    if (!scheduleStr) return { days: [], startTime: "", endTime: "" };
    const match = scheduleStr.match(/([A-Z,]+)\s+(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
    if (!match) return { days: [], startTime: "", endTime: "" };
    const daysStr = match[1].split(",").map((d) => d.trim());
    return { days: daysStr, startTime: match[2], endTime: match[3] };
  };

  const formatSchedule = (schedule) =>
    schedule.days.length && schedule.startTime && schedule.endTime
      ? `${schedule.days.join(",").toUpperCase()} ${schedule.startTime} - ${schedule.endTime}`
      : null;

  const generateAvailableYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i <= currentYear + 5; i++) years.push(`${i}-${i + 1}`);
    return years;
  };

  const daysOfWeek = ["M", "T", "W", "Th", "F", "Sa", "Su"];
  const daysOfWeekFull = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const toggleDay = (day) => {
    setFormData((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        days: prev.schedule.days.includes(day)
          ? prev.schedule.days.filter((d) => d !== day)
          : [...prev.schedule.days, day],
      },
    }));
  };

  const updateScheduleTime = (field, value) => {
    setFormData((prev) => ({ ...prev, schedule: { ...prev.schedule, [field]: value } }));
  };

  const isFormValid = useMemo(
    () =>
      formData.subjectId &&
      formData.sectionId &&
      formData.teacherId &&
      formData.schoolYear &&
      !Object.values(errors).some(Boolean),
    [formData, errors]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.subjectId) newErrors.subjectId = "Subject required";
    if (!formData.sectionId) newErrors.sectionId = "Section required";
    if (!formData.teacherId) newErrors.teacherId = "Teacher required";
    if (!formData.schoolYear) newErrors.schoolYear = "School year required";
    if (Object.keys(newErrors).length) return setErrors(newErrors);

    setLoading(true);
    try {
      const payload = {
        ...formData,
        schedule: formatSchedule(formData.schedule),
        room: formData.room || null,
      };
      await onAddClass(payload);
      onClose();
    } catch (err) {
      console.error(err);
      setApiError(err.response?.data?.message || "Failed to save class");
      setShowApiError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full bg-white animate-in fade-in slide-in-from-right-5 duration-300 p-8 lg:p-12 overflow-y-auto">
      <div className="flex justify-between items-start mb-10">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            {classItem ? "Edit Class" : "Add New Class"}
          </h2>
          <p className="text-gray-500 mt-1">Update or create a new class in the system</p>
        </div>
        <Button onClick={onClose} variant="ghost" className="p-2 rounded-full" disabled={loading}>
          <X size={28} />
        </Button>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SelectField label="Subject" name="subjectId" value={formData.subjectId} onChange={handleChange} options={subjects.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))} error={errors.subjectId} disabled={loading || loadingOptions} />
          <SelectField label="Section" name="sectionId" value={formData.sectionId} onChange={handleChange} options={sections.map((s) => ({ value: s.id, label: `${s.name} - ${s.gradeLevel}` }))} error={errors.sectionId} disabled={loading || loadingOptions} />
          <SelectField label="Teacher" name="teacherId" value={formData.teacherId} onChange={handleChange} options={teachers.map((t) => ({ value: t.id || t._id, label: `${t.firstName || t.fullName} ${t.lastName || ""}` }))} error={errors.teacherId} disabled={loading || loadingOptions} />
        </div>

        <SelectField label="School Year" name="schoolYear" value={formData.schoolYear} onChange={handleChange} options={generateAvailableYears().map((y) => ({ value: y, label: y }))} error={errors.schoolYear} disabled={loading} />

        {/* Schedule */}
        <div className="bg-gray-50 rounded-xl p-4 md:p-6 border border-gray-200 space-y-4">
          <div className="flex items-center gap-2 text-gray-700 font-semibold text-sm md:text-base">
            <Clock size={16} /> Schedule (Optional)
          </div>
          <div className="flex flex-wrap gap-2">
            {daysOfWeek.map((d, i) => {
              const selected = formData.schedule.days.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  title={daysOfWeekFull[i]}
                  className={`px-3 py-1.5 rounded-xl font-medium text-sm transition-all duration-200 border ${
                    selected
                      ? "bg-red-500 border-red-600 text-gray-900 shadow-md scale-105"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <InputField label="Start Time" type="time" value={formData.schedule.startTime} onChange={(e) => updateScheduleTime("startTime", e.target.value)} disabled={loading} />
            <InputField label="End Time" type="time" value={formData.schedule.endTime} onChange={(e) => updateScheduleTime("endTime", e.target.value)} disabled={loading} />
          </div>
        </div>

        {/* Room */}
        <InputField label="Room" name="room" value={formData.room} onChange={handleChange} disabled={loading} />

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-4 mt-6">
          <Button type="button" onClick={onClose} variant="outline" disabled={loading}>
            Go Back
          </Button>
          <Button type="submit" variant="destructive" className="text-white px-6 py-3 min-w-[160px]" disabled={loading || !isFormValid}>
            {loading ? "Saving..." : classItem ? "Save Changes" : "Add Class"}
          </Button>
        </div>
      </form>

      <ApiErrorModal isOpen={showApiError} onClose={() => setShowApiError(false)} error={apiError} />
    </div>
  );
};

const InputField = ({ label, error, className = "", ...props }) => (
  <div className="space-y-2 flex-1">
    <label className="block text-sm font-bold text-slate-800 uppercase tracking-wide">{label}</label>
    <input
      {...props}
      className={`w-full px-4 py-3 text-base rounded-xl border ${error ? "border-red-500" : "border-gray-200"} focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all placeholder:text-gray-300 disabled:bg-gray-50 disabled:text-gray-400 ${className}`}
    />
    {error && <p className="text-red-500 text-xs font-medium mt-1">{error}</p>}
  </div>
);

const SelectField = ({ label, options, error, className = "", disabled = false, ...props }) => (
  <div className="space-y-2 flex-1">
    <label className="block text-sm font-bold text-slate-800 uppercase tracking-wide">{label}</label>
    <select
      {...props}
      disabled={disabled}
      className={`w-full px-4 py-3 text-base rounded-xl border ${error ? "border-red-500" : "border-gray-200"} focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all bg-white ${className}`}
    >
      <option value="">Select {label}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && <p className="text-red-500 text-xs font-medium mt-1">{error}</p>}
  </div>
);

export default CreateClassModal;
