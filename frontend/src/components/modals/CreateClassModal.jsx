import React, { useState, useEffect, useMemo } from "react";
import { X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ApiErrorModal from "@/components/modals/ApiErrorModal";
import api from "@/services/api";
import { motion, AnimatePresence } from "framer-motion";

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
    subjectCode: "",
    subjectName: "",
    subjectGradeLevel: "",
    sectionId: "",
    teacherId: "",
    schoolYear: "",
    schedule: { days: [], startTime: "", endTime: "" },
    room: "",
  });

  useEffect(() => { fetchOptions(); }, []);

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
        const teachersList = usersRes.data.users.filter(u => u.roles?.some(r => r?.name === "teacher"));
        console.log("Fetched teachers:", teachersList);
        setTeachers(teachersList);
      }
    } catch (err) { toast.error("Failed to load form options"); }
    finally { setLoadingOptions(false); }
  };

  useEffect(() => {
    if (classItem) {
      const scheduleData = classItem.schedule ? parseSchedule(classItem.schedule) : { days: [], startTime: "", endTime: "" };
      setFormData({
        subjectCode: classItem.subjectCode || classItem.subjectId || "",
        subjectName: classItem.subjectName || "",
        subjectGradeLevel: classItem.subjectGradeLevel || "",
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
    // If subjectCode selected, also populate subjectName/grade from options
    if (name === 'subjectCode') {
      const subj = subjects.find(s => s.code === value || s.code === value.toUpperCase());
      setFormData(prev => ({ ...prev, subjectCode: value, subjectName: subj?.name || '', subjectGradeLevel: subj?.gradeLevel || '' }));
      if (value) setErrors(prev => ({ ...prev, subjectCode: '' }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    if (value) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const parseSchedule = (scheduleStr) => {
    if (!scheduleStr) return { days: [], startTime: "", endTime: "" };
    const match = scheduleStr.match(/([A-Z,]+)\s+(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
    if (!match) return { days: [], startTime: "", endTime: "" };
    const daysStr = match[1].split(",").map(d => d.trim());
    return { days: daysStr, startTime: match[2], endTime: match[3] };
  };

  const formatSchedule = (schedule) =>
    schedule.days.length && schedule.startTime && schedule.endTime
      ? `${schedule.days.join(",").toUpperCase()} ${schedule.startTime} - ${schedule.endTime}`
      : null;

  const generateAvailableYears = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => `${currentYear + i}-${currentYear + i + 1}`);
  };

  const daysOfWeek = ["M", "T", "W", "Th", "F", "Sa", "Su"];
  const daysOfWeekFull = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

  const toggleDay = day => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        days: prev.schedule.days.includes(day) ? prev.schedule.days.filter(d => d !== day) : [...prev.schedule.days, day]
      }
    }));
  };

  const updateScheduleTime = (field, value) => {
    setFormData(prev => ({ ...prev, schedule: { ...prev.schedule, [field]: value } }));
  };

  const isFormValid = useMemo(() =>
    formData.subjectCode && formData.subjectName && formData.sectionId && formData.teacherId && formData.schoolYear && !Object.values(errors).some(Boolean),
    [formData, errors]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.subjectName) newErrors.subjectName = "Subject name required";
    if (!formData.subjectCode) newErrors.subjectCode = "Subject code required";
    if (!formData.sectionId) newErrors.sectionId = "Section required";
    if (!formData.teacherId) newErrors.teacherId = "Teacher required";
    if (!formData.schoolYear) newErrors.schoolYear = "School year required";
    if (Object.keys(newErrors).length) return setErrors(newErrors);

    setLoading(true);
    try {
      // Build payload expected by backend (denormalized subject fields)
      const payload = {
        subjectName: formData.subjectName,
        subjectCode: formData.subjectCode.toUpperCase(),
        subjectGradeLevel: formData.subjectGradeLevel || undefined,
        sectionId: formData.sectionId,
        teacherId: formData.teacherId,
        schoolYear: formData.schoolYear,
        schedule: formatSchedule(formData.schedule),
        room: formData.room || null,
      };

      await onAddClass(payload);
      onClose();
    } catch (err) {
      setApiError(err.response?.data?.message || "Failed to save class");
      setShowApiError(true);
    } finally { setLoading(false); }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        transition={{ duration: 0.3 }}
        style={{ width: "100%", height: "100%", background: "white", padding: "32px", overflowY: "auto", position: "relative" }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "40px" }}>
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "4px" }}>
              {classItem ? "Edit Class" : "Add New Class"}
            </h2>
            <p style={{ fontSize: "14px", color: "#6b7280" }}>Update or create a new class in the system</p>
          </div>
          <Button onClick={onClose} disabled={loading} style={{ padding: "8px", borderRadius: "50%" }}>
            <X size={28} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <InputField label="Subject Name" name="subjectName" value={formData.subjectName} onChange={handleChange} error={errors.subjectName} disabled={loading || loadingOptions} />
            <InputField label="Subject Code" name="subjectCode" value={formData.subjectCode} onChange={handleChange} error={errors.subjectCode} disabled={loading || loadingOptions} />
            <SelectField label="Section" name="sectionId" value={formData.sectionId} onChange={handleChange} options={sections.map(s => ({ value: s.id, label: `${s.name} - ${s.gradeLevel}` }))} error={errors.sectionId} disabled={loading || loadingOptions} />
            <SelectField label="Teacher" name="teacherId" value={formData.teacherId} onChange={handleChange} options={teachers.map(t => ({ value: t.id || t._id, label: `${t.firstName || t.fullName} ${t.lastName || ""}` }))} error={errors.teacherId} disabled={loading || loadingOptions} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "16px" }}>
            <SelectField label="Grade Level" name="subjectGradeLevel" value={formData.subjectGradeLevel} onChange={handleChange} options={[{value:'7',label:'7'},{value:'8',label:'8'},{value:'9',label:'9'},{value:'10',label:'10'}]} error={errors.subjectGradeLevel} disabled={loading} />
            <div />
          </div>

          <SelectField label="School Year" name="schoolYear" value={formData.schoolYear} onChange={handleChange} options={generateAvailableYears().map(y => ({ value: y, label: y }))} error={errors.schoolYear} disabled={loading} />

          {/* Schedule */}
          <div style={{ background: "#f9fafb", borderRadius: "12px", padding: "16px", border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, color: "#374151" }}><Clock size={16}/> Schedule (Optional)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {daysOfWeek.map((d, i) => {
                const selected = formData.schedule.days.includes(d);
                return (
                  <button key={d} type="button" onClick={() => toggleDay(d)} title={daysOfWeekFull[i]} style={{
                    padding: "6px 12px",
                    borderRadius: "12px",
                    fontWeight: 500,
                    fontSize: "14px",
                    border: selected ? "1px solid #b91c1c" : "1px solid #d1d5db",
                    background: selected ? "#ef4444" : "#fff",
                    color: selected ? "#111827" : "#374151",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}>{d}</button>
                );
              })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "8px" }}>
              <InputField label="Start Time" type="time" value={formData.schedule.startTime} onChange={(e) => updateScheduleTime("startTime", e.target.value)} disabled={loading} />
              <InputField label="End Time" type="time" value={formData.schedule.endTime} onChange={(e) => updateScheduleTime("endTime", e.target.value)} disabled={loading} />
            </div>
          </div>

          <InputField label="Room" name="room" value={formData.room} onChange={handleChange} disabled={loading} />

          {/* Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "16px", flexWrap: "wrap", marginTop: "24px" }}>
            <Button type="button" onClick={onClose} disabled={loading}>Go Back</Button>
            <Button type="submit" style={{ background: "#dc2626", color: "white", padding: "12px 24px" }} disabled={loading || !isFormValid}>
              {loading ? "Saving..." : classItem ? "Save Changes" : "Add Class"}
            </Button>
          </div>
        </form>

        <ApiErrorModal isOpen={showApiError} onClose={() => setShowApiError(false)} error={apiError} />
      </motion.div>
    </AnimatePresence>
  );
};

/* ----------------- Inputs ----------------- */
const InputField = ({ label, error, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
    <label style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>{label}</label>
    <input {...props} style={{
      width: "100%",
      padding: "12px",
      fontSize: "14px",
      borderRadius: "12px",
      border: error ? "1px solid #ef4444" : "1px solid #d1d5db",
      outline: "none",
    }}/>
    {error && <p style={{ color: "#ef4444", fontSize: "12px" }}>{error}</p>}
  </div>
);

const SelectField = ({ label, options, error, disabled, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
    <label style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>{label}</label>
    <select {...props} disabled={disabled} style={{
      width: "100%",
      padding: "12px",
      fontSize: "14px",
      borderRadius: "12px",
      border: error ? "1px solid #ef4444" : "1px solid #d1d5db",
      outline: "none",
      background: "#fff",
    }}>
      <option value="">Select {label}</option>
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
    {error && <p style={{ color: "#ef4444", fontSize: "12px" }}>{error}</p>}
  </div>
);

export default CreateClassModal;
