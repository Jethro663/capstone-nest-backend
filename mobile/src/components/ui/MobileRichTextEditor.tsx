import { AssessmentRichTextEditor } from "./AssessmentRichTextEditor";

export type MobileRichTextEditorProps = {
  label: string;
  value: string;
  onChange(value: string): void;
  disabled?: boolean;
  extendedFormatting?: boolean;
};

/** Shared rich-text editing surface used by assessment and lesson authoring. */
export function MobileRichTextEditor(props: MobileRichTextEditorProps) {
  return <AssessmentRichTextEditor {...props} extendedFormatting={props.extendedFormatting ?? true} />;
}
