import React, { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ApiErrorModal from "@/components/modals/ApiErrorModal";

const CreateSectionModal = ({ section, onClose, onAddSection }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // 🔴 API ERROR STATE (GENERIC)
  const [apiError, setApiError] = useState(null);
  const [showApiError, setShowApiError] = useState(false);

  const [formData, setFormData] = useState({
    sectionName: "",
    gradeLevel: "",
    schoolYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    assignedTeacher: "",
    studentCapacity: "",
    roomNumber: "",
  });

  const [schoolYearRange, setSchoolYearRange] = useState({
    startYear: new Date().getFullYear().toString(),
    endYear: (new Date().getFullYear() + 1).toString(),
  });

  /* ------------------------- */
  /* 1. POPULATE FORM (EDIT)   */
  /* ------------------------- */
  useEffect(() => {
    if (section) {
      const [startYear, endYear] = section.schoolYear?.split('-') || ['', ''];
      setSchoolYearRange({
        startYear: startYear || new Date().getFullYear().toString(),
        endYear: endYear || (new Date().getFullYear() + 1).toString(),
      });
      setFormData({
        sectionName: section.sectionName || "",
        gradeLevel: section.gradeLevel || "",
        schoolYear: section.schoolYear || "",
        assignedTeacher: section.assignedTeacher || "",
        studentCapacity: String(section.studentCapacity || ""),
        roomNumber: section.roomNumber || "",
      });
    }
  }, [section]);

  const handleSchoolYearChange = (field, value) => {
    const newRange = {
      ...schoolYearRange,
      [field]: value,
    };
    setSchoolYearRange(newRange);
    const formattedYear = `${newRange.startYear}-${newRange.endYear}`;
    setFormData((prev) => ({
      ...prev,
      schoolYear: formattedYear,
    }));
    setErrors((errs) => ({
      ...errs,
      schoolYear: formattedYear.length > 0 ? "" : "School year is required",
    }));
  };

  /* ------------------------- */
  /* 2. VALIDATION LOGIC       */
  /* ------------------------- */
  const getFieldError = (name, value) => {
    if (!value.trim()) return `${FIELD_LABELS[name]} is required`;

    if (name === "studentCapacity") {
      if (!/^\d+$/.test(value) || Number(value) <= 0) {
        return "Student Capacity must be a positive number";
      }
    }

    if (name === "assignedTeacher" && /\d/.test(value)) {
      return "Teacher name cannot contain numbers";
    }

    return "";
  };

  /* ------------------------- */
  /* 3. HANDLE INPUT CHANGES   */
  /* ------------------------- */
  const handleChange = (e) => {
    const { name, value } = e.target;
    let sanitized = value;

    if (name !== "gradeLevel") {
      sanitized = value.replace(/[^a-zA-Z0-9\s.,-]/g, "");
    }

    if (name === "assignedTeacher") {
      sanitized = sanitized.replace(/[^a-zA-Z\s.]/g, "");
    }

    if (name === "studentCapacity") {
      sanitized = sanitized.replace(/\D/g, "");
    }

    if (FIELD_MAX_LENGTHS[name]) {
      sanitized = sanitized.slice(0, FIELD_MAX_LENGTHS[name]);
    }

    setFormData((prev) => {
      const next = { ...prev, [name]: sanitized };
      setErrors((errs) => ({
        ...errs,
        [name]: getFieldError(name, sanitized),
      }));
      return next;
    });
  };

  /* ------------------------- */
  /* 4. FORM VALIDITY          */
  /* ------------------------- */
  const isFormValid = useMemo(() => {
    return (
      Object.values(formData).every((v) => v.trim()) &&
      !Object.values(errors).some(Boolean)
    );
  }, [formData, errors]);

  /* ------------------------- */
  /* 5. SUBMIT                 */
  /* ------------------------- */
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
        assignedTeacher: formData.assignedTeacher.trim(),
        studentCapacity: Number(formData.studentCapacity),
        roomNumber: formData.roomNumber.trim(),
      };

      /**
       * BACKEND INTEGRATION (FUTURE)
       * await fetch("/api/sections", {
       *   method: section ? "PUT" : "POST",
       *   headers: { "Content-Type": "application/json" },
       *   body: JSON.stringify(payload),
       * });
       */

      await onAddSection(payload);

      toast.success(
        section ? "Section updated successfully" : "Section added successfully"
      );
      onClose();
    } catch (err) {
      /**
       * EXPECTED BACKEND ERROR FORMAT:
       * {
       *   error: {
       *     message: "Section name already exists",
       *     source: "SectionController.create",
       *     field: "sectionName",
       *     code: 409,
       *     requestId: "REQ-20260204-02"
       *   }
       * }
       */

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
    <>
      <div className="w-full h-full bg-white animate-in fade-in slide-in-from-right-5 duration-300 p-8 lg:p-12 overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              {section ? "Edit Section" : "Add New Section"}
            </h2>
            <p className="text-gray-500 mt-1">Manage section information</p>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            className="p-2 rounded-full"
            disabled={loading}
          >
            <X size={28} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <YearRangePicker
            label="School Year"
            startYear={schoolYearRange.startYear}
            endYear={schoolYearRange.endYear}
            onStartYearChange={(value) => handleSchoolYearChange('startYear', value)}
            onEndYearChange={(value) => handleSchoolYearChange('endYear', value)}
            error={errors.schoolYear}
            disabled={loading}
          />

          <InputField
            label="Section Name"
            name="sectionName"
            value={formData.sectionName}
            onChange={handleChange}
            error={errors.sectionName}
            disabled={loading}
            placeholder="Section A"
          />

          <SelectField
          label="Grade Level"
          name="gradeLevel"
          value={formData.gradeLevel}
          onChange={handleChange}
          error={errors.gradeLevel}
          disabled={loading}
          options={["Grade 7", "Grade 8", "Grade 9", "Grade 10"]}
        />

        

        <InputField
          label="Assigned Teacher"
          name="assignedTeacher"
          value={formData.assignedTeacher}
          onChange={handleChange}
          error={errors.assignedTeacher}
          disabled={loading}
          placeholder="Mr. Juan Dela Cruz"
        />

        <InputField
          label="Student Capacity"
          name="studentCapacity"
          value={formData.studentCapacity}
          onChange={handleChange}
          error={errors.studentCapacity}
          disabled={loading}
          placeholder="30"
        />

        <InputField
          label="Room Number"
          name="roomNumber"
          value={formData.roomNumber}
          onChange={handleChange}
          error={errors.roomNumber}
          disabled={loading}
          placeholder="Room 101"
        />

        <div className="flex flex-col sm:flex-row justify-end gap-4 mt-6">
          <Button type="button" onClick={onClose} variant="outline" disabled={loading}>
            Go Back
          </Button>

          <Button
            type="submit"
            variant="destructive"
            className="text-white px-6 py-3 min-w-[160px] text-center"
            disabled={loading || !isFormValid}
          >
            {loading ? "Saving..." : section ? "Save Changes" : "Add Section"}
          </Button>
        </div>
      </form>
    </div>

    {/* 🔴 GENERIC API ERROR MODAL */}
    <ApiErrorModal
      isOpen={showApiError}
      error={apiError}
      onClose={() => setShowApiError(false)}
    />
  </>
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

const InputField = ({ label, error, className = "", ...props }) => (
  <div className="space-y-2">
    <label className="block text-sm font-bold text-slate-800 uppercase tracking-wide">
      {label}
    </label>
    <input
      {...props}
      className={`w-full px-4 py-3 text-base rounded-xl border ${error ? "border-red-500" : "border-gray-200"
        } focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all placeholder:text-gray-300 disabled:bg-gray-50 disabled:text-gray-400 ${className}`}
    />
    {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
  </div>
);

const SelectField = ({ label, error, options, className = "", ...props }) => (
  <div className="space-y-2">
    <label className="block text-sm font-bold text-slate-800 uppercase tracking-wide">
      {label}
    </label>
    <select
      {...props}
      className={`w-full px-4 py-3 text-base rounded-xl border ${error ? "border-red-500" : "border-gray-200"
        } bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400 ${className}`}
    >
      <option value="" disabled>
        Select grade level
      </option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
    {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
  </div>
);

const YearRangePicker = ({
  label,
  startYear,
  endYear,
  onStartYearChange,
  onEndYearChange,
  error,
  disabled,
}) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 16 }, (_, i) => currentYear - 5 + i).map(
    (year) => year.toString()
  );

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-slate-800 uppercase tracking-wide">
        {label}
      </label>
      <div className="flex gap-3 items-center">
        <div className="flex-1">
          <select
            value={startYear}
            onChange={(e) => onStartYearChange(e.target.value)}
            disabled={disabled}
            className={`w-full px-4 py-3 text-base rounded-xl border ${error ? "border-red-500" : "border-gray-200"
              } bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400`}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        <span className="text-slate-600 font-semibold">-</span>
        <div className="flex-1">
          <select
            value={endYear}
            onChange={(e) => onEndYearChange(e.target.value)}
            disabled={disabled}
            className={`w-full px-4 py-3 text-base rounded-xl border ${error ? "border-red-500" : "border-gray-200"
              } bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400`}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
    </div>
  );
};

export default CreateSectionModal;
