import React, { useState, useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import teacherService from "@/services/teacherService";

const CreateLessonModal = ({ isOpen, onClose, classes, onLessonCreated }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    classId: "",
    contentType: "video"
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (!value.trim()) setErrors((prev) => ({ ...prev, [name]: "This field is required" }));
    else setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (!value) setErrors((prev) => ({ ...prev, [name]: "This field is required" }));
    else setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const isFormValid = useMemo(() => {
    return formData.title.trim() && formData.classId && formData.contentType;
  }, [formData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    try {
      setLoading(true);
      await teacherService.createLesson(formData);
      toast.success("Lesson created successfully");
      onLessonCreated();
      onClose();
      setFormData({
        title: "",
        description: "",
        classId: "",
        contentType: "video"
      });
      setErrors({});
    } catch (error) {
      console.error("Error creating lesson:", error);
      toast.error(error.message || "Failed to create lesson");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null; // do not render if closed

  return (
    <div style={{ width: "100%", height: "100%", padding: 32, overflowY: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 40 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Create New Lesson</h2>
          <p style={{ fontSize: 14, color: "#6b7280" }}>Fill out the form below to add a new lesson</p>
        </div>
        <Button onClick={onClose} disabled={loading} style={{ padding: 8, borderRadius: "50%" }}>
          <X size={28} />
        </Button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <InputField
          label="Lesson Title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          error={errors.title}
          placeholder="Enter lesson title"
          disabled={loading}
        />

        <InputField
          label="Description / Instructions"
          name="description"
          value={formData.description}
          onChange={handleChange}
          as="textarea"
          error={errors.description}
          placeholder="Enter instructions"
          disabled={loading}
        />

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <SelectField
            label="Class"
            value={formData.classId}
            onChange={(v) => handleSelectChange("classId", v)}
            options={classes.map((c) => ({ value: c.id, label: `${c.subjectCode} - ${c.sectionName}` }))}
            error={errors.classId}
            disabled={loading}
          />

          <SelectField
            label="Content Type"
            value={formData.contentType}
            onChange={(v) => handleSelectChange("contentType", v)}
            options={[
              { value: "video", label: "Video" },
              { value: "document", label: "Document" },
              { value: "quiz", label: "Quiz Reference" },
              { value: "link", label: "External Link" }
            ]}
            error={errors.contentType}
            disabled={loading}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, flexWrap: "wrap", marginTop: 16 }}>
          <Button type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            style={{ background: "#dc2626", color: "white", padding: "12px 24px" }}
            disabled={loading || !isFormValid}
          >
            {loading ? "Creating..." : "Create Lesson"}
          </Button>
        </div>
      </form>
    </div>
  );
};

// InputField Component
const InputField = ({ label, error, as = "input", style = {}, ...props }) => {
  const Tag = as;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
      <label style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>{label}</label>
      <Tag
        {...props}
        style={{
          width: "100%",
          padding: 12,
          fontSize: 14,
          borderRadius: 12,
          border: error ? "1px solid #ef4444" : "1px solid #d1d5db",
          outline: "none",
          resize: as === "textarea" ? "vertical" : "none",
          minHeight: as === "textarea" ? 80 : "auto",
          ...style
        }}
      />
      {error && <p style={{ color: "#ef4444", fontSize: 12 }}>{error}</p>}
    </div>
  );
};

// SelectField Component
const SelectField = ({ label, value, onChange, options = [], error, disabled }) => (
  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
    <label style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{
        width: "100%",
        padding: 12,
        fontSize: 14,
        borderRadius: 12,
        border: error ? "1px solid #ef4444" : "1px solid #d1d5db",
        appearance: "none",
        background: "white"
      }}
    >
      <option value="">Select {label}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && <p style={{ color: "#ef4444", fontSize: 12 }}>{error}</p>}
  </div>
);

export default CreateLessonModal;
