import { sanitizeRichTextHtml } from '../../common/utils/rich-text-sanitizer';

export type PublicationIssue = { field: string; message: string };
type Question = {
  content?: string | null;
  imageUrl?: string | null;
  type: string;
  points?: number | null;
  options?: {
    text?: string | null;
    imageUrl?: string | null;
    isCorrect?: boolean | null;
  }[];
};
export type PublishableAssessment = {
  title?: string | null;
  type?: string;
  passingScore?: number | null;
  questions?: Question[];
  fileUploadInstructions?: string | null;
  allowedUploadExtensions?: string[] | null;
  allowedUploadMimeTypes?: string[] | null;
  maxUploadSizeBytes?: number | null;
};

export function hasRichTextContent(value?: string | null): boolean {
  return Boolean(
    sanitizeRichTextHtml(value ?? '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;|&#160;|&#x0*a0;/gi, ' ')
      .replace(/[\s\u200B-\u200D\uFEFF]/g, '')
      .trim(),
  );
}

export function assessmentPublicationIssues(
  assessment: PublishableAssessment,
): PublicationIssue[] {
  const issues: PublicationIssue[] = [];
  const add = (field: string, message: string) =>
    issues.push({ field, message });
  if (
    !assessment.title?.trim() ||
    assessment.title.trim() === 'Untitled assessment'
  )
    add('title', 'Title is required');
  if (!assessment.type) add('type', 'Assessment type is required');
  if (assessment.passingScore == null)
    add('passingScore', 'Passing score is required');
  const upload = assessment.type === 'file_upload';
  if (upload) {
    if (!hasRichTextContent(assessment.fileUploadInstructions))
      add('fileUploadInstructions', 'File upload instructions are required');
    if (!assessment.allowedUploadExtensions?.length)
      add(
        'allowedUploadExtensions',
        'At least one allowed file extension is required',
      );
    if (!assessment.allowedUploadMimeTypes?.length)
      add(
        'allowedUploadMimeTypes',
        'At least one allowed mime type is required',
      );
    if (
      !assessment.maxUploadSizeBytes ||
      assessment.maxUploadSizeBytes < 1 ||
      assessment.maxUploadSizeBytes > 104857600
    )
      add(
        'maxUploadSizeBytes',
        'Max upload size must be between 1 and 104857600 bytes',
      );
  } else {
    if (!assessment.questions?.length)
      add('questions', 'At least one question is required');
    assessment.questions?.forEach((question, index) => {
      const field = `questions.${index}`;
      const label = `Question ${index + 1}: `;
      if (!hasRichTextContent(question.content) && !question.imageUrl)
        add(`${field}.content`, `${label}Content is required`);
      if (
        question.points != null &&
        (!Number.isInteger(question.points) || question.points < 1)
      )
        add(`${field}.points`, `${label}Points must be a positive integer`);
      const options = question.options ?? [];
      if (
        [
          'multiple_choice',
          'multiple_select',
          'true_false',
          'dropdown',
        ].includes(question.type)
      ) {
        if (options.length < 2)
          add(
            `${field}.options`,
            `${label}Choice questions need at least 2 options`,
          );
        if (
          options.some(
            (option) => !hasRichTextContent(option.text) && !option.imageUrl,
          )
        )
          add(`${field}.options`, `${label}Answer choices cannot be blank`);
        if (!options.some((option) => option.isCorrect))
          add(
            `${field}.options`,
            `${label}At least one option must be marked correct`,
          );
        if (
          question.type !== 'multiple_select' &&
          options.filter((option) => option.isCorrect).length > 1
        )
          add(`${field}.options`, `${label}Select exactly one correct answer`);
      } else if (
        question.type === 'fill_blank' &&
        !options.some(
          (option) => option.isCorrect && hasRichTextContent(option.text),
        )
      ) {
        add(
          `${field}.options`,
          `${label}Fill in the blank needs at least one correct answer`,
        );
      }
    });
  }
  return issues;
}
