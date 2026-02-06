import React, { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ApiErrorModal from "@/components/modals/ApiErrorModal";

const CreateSubjectModal = ({ subject, onClose, onAddSubject }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // API ERROR STATE (GENERIC)
  const [apiError, setApiError] = useState(null);
  const [showApiError, setShowApiError] = useState(false);

  const [formData, setFormData] = useState({
    gradeLevel: "",
    subjectName: "",
    subjectCode: "",
  });

  /* ------------------------- */
  /* 1. POPULATE FORM (EDIT)   */
  /* ------------------------- */
  useEffect(() => {
    if (subject) {
      setFormData({
        gradeLevel: subject.gradeLevel || "",
        subjectName: subject.subjectName || "",
        subjectCode: subject.subjectCode || "",
      });
    }
  }, [subject]);

  /* ------------------------- */
  /* 2. HANDLE CHANGES         */
  /* ------------------------- */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      let next = { ...prev, [name]: value };

      if (name === "gradeLevel") {
        next.subjectName = "";
        next.subjectCode = "";
      }

      if (name === "subjectName") {
        next.subjectCode = SUBJECT_MAP[prev.gradeLevel]?.[value] || "";
      }

      setErrors((errs) => ({
        ...errs,
        [name]: value ? "" : `${FIELD_LABELS[name]} is required`,
      }));

      return next;
    });
  };

  /* ------------------------- */
  /* 3. FORM VALIDITY          */
  /* ------------------------- */
  const isFormValid = useMemo(() => {
    return (
      formData.gradeLevel &&
      formData.subjectName &&
      formData.subjectCode &&
      !Object.values(errors).some(Boolean)
    );
  }, [formData, errors]);

  /* ------------------------- */
  /* 4. SUBMIT                 */
  /* ------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);

    try {
      const payload = {
        id: subject?.id || crypto.randomUUID(),
        gradeLevel: formData.gradeLevel,
        subjectName: formData.subjectName,
        subjectCode: formData.subjectCode,
      };

      /**
       * BACKEND INTEGRATION (FUTURE)
       * await fetch("/api/subjects", {
       *   method: subject ? "PUT" : "POST",
       *   headers: { "Content-Type": "application/json" },
       *   body: JSON.stringify(payload),
       * });
       */

      await onAddSubject(payload);

      toast.success(
        subject ? "Subject updated successfully" : "Subject added successfully"
      );
      onClose();
    } catch (err) {
      /**
       * EXPECTED BACKEND ERROR FORMAT:
       * {
       *   error: {
       *     message: "Subject code already exists",
       *     source: "SubjectController.create",
       *     field: "subjectCode",
       *     code: 409,
       *     requestId: "REQ-20260204-01"
       *   }
       * }
       */

      const backendError = err?.response?.data?.error;

      setApiError({
        title: subject ? "Update Subject Failed" : "Create Subject Failed",
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

  const availableSubjects = SUBJECT_MAP[formData.gradeLevel] || {};

  return (
    <>
      <div className="w-full h-full bg-white p-8 lg:p-12 overflow-y-auto animate-in fade-in slide-in-from-right-5 duration-300">
        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">
              {subject ? "Edit Subject" : "Add New Subject"}
            </h2>
            <p className="text-gray-500 mt-1">Manage subject information</p>
          </div>
          <Button onClick={onClose} variant="ghost" className="p-2" disabled={loading}>
            <X size={28} />
          </Button>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <SelectField
            label="Grade Level"
            name="gradeLevel"
            value={formData.gradeLevel}
            onChange={handleChange}
            error={errors.gradeLevel}
            disabled={loading}
            options={["Grade 7", "Grade 8", "Grade 9", "Grade 10"]}
          />

          <SelectField
            label="Subject Name"
            name="subjectName"
            value={formData.subjectName}
            onChange={handleChange}
            error={errors.subjectName}
            disabled={!formData.gradeLevel || loading}
            options={Object.keys(availableSubjects)}
          />

          <InputField
            label="Subject Code"
            name="subjectCode"
            value={formData.subjectCode}
            disabled
            placeholder="Subject Code"
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
              {loading ? "Saving..." : subject ? "Save Changes" : "Add Subject"}
            </Button>
          </div>
        </form>
      </div>

      {/* GENERIC API ERROR MODAL */}
      <ApiErrorModal
        isOpen={showApiError}
        error={apiError}
        onClose={() => setShowApiError(false)}
      />
    </>
  );
};

export default CreateSubjectModal;

/* ------------------------- */
/* Subject Mapping (TEMP)    */
/* ------------------------- */

const SUBJECT_MAP = {
  "Grade 7": {
    Mathematics: "MATH7",
    English: "ENG7",
    Science: "SCI7",
    Filipino: "FLP7",
    Mapeh: "MPH7",
    Music: "MSC7",
  },
  "Grade 8": {
    Mathematics: "MATH8",
    English: "ENG8",
    Science: "SCI8",
    Filipino: "FLP8",
    PhysicalEducation: "PHY8",
  },
  "Grade 9": {
    Mathematics: "MATH9",
    English: "ENG9",
    Science: "SCI9",
    Algebra: "ALG9",
  },
  "Grade 10": {
    Mathematics: "MATH10",
    English: "ENG10",
    Science: "SCI10",
    Calculus: "CAC10",
  },
};

/* ------------------------- */
/* Constants                 */
/* ------------------------- */

const FIELD_LABELS = {
  gradeLevel: "Grade Level",
  subjectName: "Subject Name",
  subjectCode: "Subject Code",
};

/* ------------------------- */
/* Reusable Inputs           */
/* ------------------------- */

const InputField = ({ label, className = "", ...props }) => (
  <div className="space-y-2">
    <label className="block text-sm font-bold text-slate-800 uppercase tracking-wide">
      {label}
    </label>
    <input
      {...props}
      className={`w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed ${className}`}
    />
  </div>
);

const SelectField = ({ label, error, options, hint, className = "", ...props }) => {
  const isDisabled = props.disabled;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-slate-800 uppercase tracking-wide">
        {label}
      </label>

      <select
        {...props}
        className={`w-full px-4 py-3 rounded-xl border ${
          error ? "border-red-500" : "border-gray-200"
        } ${
          isDisabled
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-white"
        } focus:ring-2 focus:ring-red-500 outline-none transition-all ${className}`}
      >
        <option value="" disabled>
          {isDisabled ? "Select grade level first" : "Select option"}
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>

      {hint && !error && (
        <p className="text-xs text-gray-400 font-medium">{hint}</p>
      )}
      {error && (
        <p className="text-red-500 text-xs font-medium">{error}</p>
      )}
    </div>
  );
};
