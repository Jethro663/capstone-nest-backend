import React, { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ApiErrorModal from "@/components/modals/ApiErrorModal";
import { motion, AnimatePresence } from "framer-motion";
import api from '@/services/api';


const CreateSectionModal = ({ section, onClose, onAddSection }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [showApiError, setShowApiError] = useState(false);

  const [formData, setFormData] = useState({
    sectionName: "",
    gradeLevel: "",
    schoolYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    adviserId: "",
    assignedTeacher: "",
    studentCapacity: "",
    roomNumber: "",
  });

  const [teachers, setTeachers] = useState([]);
  const [teachersLoading, setTeachersLoading] = useState(false);


  const [schoolYearRange, setSchoolYearRange] = useState({
    startYear: new Date().getFullYear().toString(),
    endYear: (new Date().getFullYear() + 1).toString(),
  });

  // Fetch teachers list (for assigned teacher dropdown)
  useEffect(() => {
    let mounted = true;
    const fetchTeachers = async () => {
      setTeachersLoading(true);
      try {
        const res = await api.get('/users/all', { params: { role: 'teacher', limit: 500 } });
        if (!mounted) return;
        if (res?.data?.users) setTeachers(res.data.users);
      } catch (err) {
        console.error('Failed to load teachers', err);
      } finally {
        if (mounted) setTeachersLoading(false);
      }
    };

    fetchTeachers();

    return () => { mounted = false; };
  }, []);

  // Populate form for editing
  useEffect(() => {
    if (section) {
      const [startYear, endYear] = section.schoolYear?.split("-") || ["", ""];
      setSchoolYearRange({
        startYear: startYear || new Date().getFullYear().toString(),
        endYear: endYear || (new Date().getFullYear() + 1).toString(),
      });
      setFormData({
        sectionName: section.sectionName || "",
        gradeLevel: section.gradeLevel || "",
        schoolYear: section.schoolYear || "",
        adviserId: section.adviserId || section.adviserId || "",
        assignedTeacher: section.assignedTeacher || "",
        studentCapacity: String(section.studentCapacity || ""),
        roomNumber: section.roomNumber || "",
      });
    }
  }, [section]);

  const handleSchoolYearChange = (field, value) => {
    const newRange = { ...schoolYearRange, [field]: value };
    setSchoolYearRange(newRange);
    const formattedYear = `${newRange.startYear}-${newRange.endYear}`;
    setFormData((prev) => ({ ...prev, schoolYear: formattedYear }));
    setErrors((errs) => ({
      ...errs,
      schoolYear: formattedYear.length > 0 ? "" : "School year is required",
    }));
  };

  const getFieldError = (name, value) => {
    // Assigned teacher is optional (the adviserId select is optional as well),
    // so only validate it when the user provides a manual teacher name.
    if (name === "assignedTeacher") {
      if (!value.trim()) return ""; // optional
      if (/\d/.test(value)) return "Teacher name cannot contain numbers";
      return "";
    }

    if (!value.trim()) return `${FIELD_LABELS[name]} is required`;

    if (name === "studentCapacity") {
      if (!/^\d+$/.test(value) || Number(value) <= 0)
        return "Student Capacity must be a positive number";
    }

    return "";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let sanitized = value;

    if (name !== "gradeLevel") sanitized = value.replace(/[^a-zA-Z0-9\s.,-]/g, "");
    if (name === "assignedTeacher") sanitized = sanitized.replace(/[^a-zA-Z\s.]/g, "");
    if (name === "studentCapacity") sanitized = sanitized.replace(/\D/g, "");
    if (FIELD_MAX_LENGTHS[name]) sanitized = sanitized.slice(0, FIELD_MAX_LENGTHS[name]);

    setFormData((prev) => {
      const next = { ...prev, [name]: sanitized };
      setErrors((errs) => ({ ...errs, [name]: getFieldError(name, sanitized) }));
      return next;
    });
  };

  const isFormValid = useMemo(() => {
    // Teacher (adviserId / assignedTeacher) is optional, so only check truly required fields
    const requiredFields = ["sectionName", "gradeLevel", "schoolYear", "studentCapacity", "roomNumber"];
    const allRequiredFilled = requiredFields.every((name) => String(formData[name] ?? "").trim());
    return allRequiredFilled && !Object.values(errors).some(Boolean);
  }, [formData, errors]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    try {
      const payload = {
        id: section?.id || crypto.randomUUID(),
        sectionName: formData.sectionName.trim(),
        gradeLevel: formData.gradeLevel,
        schoolYear: formData.schoolYear.trim(),
        adviserId: formData.adviserId || null,
        assignedTeacher: teachers.find(t => t.id === formData.adviserId)
          ? `${teachers.find(t => t.id === formData.adviserId).firstName} ${teachers.find(t => t.id === formData.adviserId).lastName}`
          : formData.assignedTeacher.trim(),
        studentCapacity: Number(formData.studentCapacity),
        roomNumber: formData.roomNumber.trim(),
      };

      await onAddSection(payload);

      toast.success(section ? "Section updated successfully" : "Section added successfully");
      onClose();
    } catch (err) {
      const backendError = err?.response?.data?.error;
      setApiError({
        title: section ? "Update Section Failed" : "Create Section Failed",
        message: backendError?.message || "Unexpected server error",
        source: backendError?.source || "Unknown backend source",
        field: backendError?.field || null,
        code: backendError?.code || null,
        requestId: backendError?.requestId || null,
      });
      setShowApiError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        transition={{ duration: 0.3 }}
        style={{
          width: "100%",
          height: "100%",
          background: "white",
          padding: "32px",
          overflowY: "auto",
          position: "relative",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "40px" }}>
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "4px" }}>
              {section ? "Edit Section" : "Add New Section"}
            </h2>
            <p style={{ fontSize: "14px", color: "#6b7280" }}>Manage section information</p>
          </div>
          <Button onClick={onClose} disabled={loading} style={{ padding: "8px", borderRadius: "50%" }}>
            <X size={28} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <YearRangePicker
            label="School Year"
            startYear={schoolYearRange.startYear}
            endYear={schoolYearRange.endYear}
            onStartYearChange={(value) => handleSchoolYearChange("startYear", value)}
            onEndYearChange={(value) => handleSchoolYearChange("endYear", value)}
            error={errors.schoolYear}
            disabled={loading}
          />

          <InputField label="Section Name" name="sectionName" value={formData.sectionName} onChange={handleChange} error={errors.sectionName} disabled={loading} placeholder="Section A" />

          <SelectField
            label="Grade Level"
            name="gradeLevel"
            value={formData.gradeLevel}
            onChange={handleChange}
            error={errors.gradeLevel}
            disabled={loading}
            options={["Grade 7", "Grade 8", "Grade 9", "Grade 10"]}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>Assigned Teacher</label>
            <select
              name="adviserId"
              value={formData.adviserId}
              onChange={(e) => setFormData(prev => ({ ...prev, adviserId: e.target.value }))}
              disabled={loading || teachersLoading}
              style={{ width: "100%", padding: "12px", fontSize: "14px", borderRadius: "12px", border: errors.assignedTeacher ? "1px solid #ef4444" : "1px solid #d1d5db", outline: "none", background: "white" }}
            >
              <option value="">(Optional) Select a teacher</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.firstName} {t.lastName} {t.email ? `(${t.email})` : ''}</option>
              ))}
            </select>
            {teachersLoading && <p style={{ fontSize: 12, color: '#6b7280' }}>Loading teachers...</p>}
          </div>

          <InputField label="Student Capacity" name="studentCapacity" value={formData.studentCapacity} onChange={handleChange} error={errors.studentCapacity} disabled={loading} placeholder="30" />

          <InputField label="Room Number" name="roomNumber" value={formData.roomNumber} onChange={handleChange} error={errors.roomNumber} disabled={loading} placeholder="Room 101" />

          {/* Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "16px", flexWrap: "wrap", marginTop: "24px" }}>
            <Button type="button" onClick={onClose} disabled={loading}>Go Back</Button>
            <Button type="submit" style={{ background: "#dc2626", color: "white", padding: "12px 24px" }} disabled={loading || !isFormValid}>
              {loading ? "Saving..." : section ? "Save Changes" : "Add Section"}
            </Button>
          </div>
        </form>

        {/* API Error Modal */}
        <ApiErrorModal isOpen={showApiError} error={apiError} onClose={() => setShowApiError(false)} />
      </motion.div>
    </AnimatePresence>
  );
};

/* ------------------------- */
/* Constants                 */
/* ------------------------- */
const FIELD_LABELS = {
  sectionName: "Section Name",
  gradeLevel: "Grade Level",
  schoolYear: "School Year",
  assignedTeacher: "Assigned Teacher",
  studentCapacity: "Student Capacity",
  roomNumber: "Room Number",
};

const FIELD_MAX_LENGTHS = {
  sectionName: 30,
  schoolYear: 10,
  assignedTeacher: 50,
  studentCapacity: 3,
  roomNumber: 15,
};

/* ------------------------- */
/* Reusable Inputs           */
/* ------------------------- */
const InputField = ({ label, error, style = {}, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
    <label style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>{label}</label>
    <input
      {...props}
      style={{
        width: "100%",
        padding: "12px",
        fontSize: "14px",
        borderRadius: "12px",
        border: error ? "1px solid #ef4444" : "1px solid #d1d5db",
        outline: "none",
        ...style,
      }}
    />
    {error && <p style={{ color: "#ef4444", fontSize: "12px" }}>{error}</p>}
  </div>
);

const SelectField = ({ label, error, options, style = {}, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
    <label style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>{label}</label>
    <select
      {...props}
      style={{
        width: "100%",
        padding: "12px",
        fontSize: "14px",
        borderRadius: "12px",
        border: error ? "1px solid #ef4444" : "1px solid #d1d5db",
        outline: "none",
        background: "white",
        ...style,
      }}
    >
      <option value="" disabled>Select grade level</option>
      {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
    {error && <p style={{ color: "#ef4444", fontSize: "12px" }}>{error}</p>}
  </div>
);

const YearRangePicker = ({ label, startYear, endYear, onStartYearChange, onEndYearChange, error, disabled }) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 16 }, (_, i) => currentYear - 5 + i).map(String);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>{label}</label>
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <select value={startYear} onChange={(e) => onStartYearChange(e.target.value)} disabled={disabled} style={{ flex: 1, padding: "12px", fontSize: "14px", borderRadius: "12px", border: error ? "1px solid #ef4444" : "1px solid #d1d5db", outline: "none", background: "white" }}>
          {years.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
        <span style={{ fontWeight: "600", color: "#4b5563" }}>-</span>
        <select value={endYear} onChange={(e) => onEndYearChange(e.target.value)} disabled={disabled} style={{ flex: 1, padding: "12px", fontSize: "14px", borderRadius: "12px", border: error ? "1px solid #ef4444" : "1px solid #d1d5db", outline: "none", background: "white" }}>
          {years.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
      </div>
      {error && <p style={{ color: "#ef4444", fontSize: "12px" }}>{error}</p>}
    </div>
  );
};

export default CreateSectionModal;
