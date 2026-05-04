'use client';

import {
  Document,
  Page,
  StyleSheet,
  Svg,
  Path,
  Rect,
  Text,
  View,
  pdf,
} from '@react-pdf/renderer';
import type { LessonPlanStructuredOutput } from '@/types/ai';

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 36,
    paddingHorizontal: 36,
    fontSize: 10,
    lineHeight: 1.45,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 12,
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    marginLeft: 10,
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: 700,
  },
  brandSubtitle: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  metaGrid: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metaItem: {
    width: '50%',
    paddingRight: 12,
    marginTop: 8,
  },
  metaLabel: {
    fontSize: 8,
    textTransform: 'uppercase',
    color: '#64748b',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 10,
    fontWeight: 600,
  },
  section: {
    marginBottom: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
    color: '#b91c1c',
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.5,
  },
  sectionLead: {
    marginTop: 4,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bullet: {
    width: 10,
    fontSize: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.45,
  },
  metaNote: {
    marginTop: 6,
    fontSize: 9,
    color: '#475569',
  },
  procedureBlock: {
    marginBottom: 8,
  },
  procedureLabel: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#334155',
    marginBottom: 3,
  },
});

function NexoraPdfMark() {
  return (
    <Svg width={30} height={30} viewBox="0 0 30 30">
      <Rect x={2} y={2} width={26} height={26} rx={7} fill="#fff1f2" />
      <Path
        d="M8 21V9h3.2l7.6 8.8V9H22v12h-3.1l-7.7-8.9V21H8Z"
        fill="#dc2626"
      />
    </Svg>
  );
}

function renderBullets(items: string[]) {
  return items
    .filter((item) => item.trim().length > 0)
    .map((item, index) => (
      <View key={`${item}-${index}`} style={styles.bulletItem}>
        <Text style={styles.bullet}>*</Text>
        <Text style={styles.bulletText}>{item}</Text>
      </View>
    ));
}

function LessonPlanPdfDocument({
  plan,
}: {
  plan: LessonPlanStructuredOutput;
}) {
  const header = plan.header ?? {};
  const procedures = plan.procedures;
  const differentiation = plan.differentiation;
  const procedureSections: Array<{ label: string; items: string[] }> = [
    { label: 'Review', items: procedures.review },
    { label: 'Purpose', items: procedures.purpose },
    { label: 'Examples', items: procedures.examples },
    { label: 'Guided Practice', items: procedures.guidedPractice },
    { label: 'Mastery', items: procedures.mastery },
    { label: 'Application', items: procedures.application },
    { label: 'Generalization', items: procedures.generalization },
    { label: 'Evaluation', items: procedures.evaluation },
    {
      label: 'Remediation / Enrichment',
      items: procedures.remediationOrEnrichment,
    },
  ];

  return (
    <Document title={header.lessonTitle || 'Lesson Plan'}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} wrap={false}>
          <View style={styles.brandRow}>
            <NexoraPdfMark />
            <View style={styles.brandText}>
              <Text style={styles.brandTitle}>Nexora Lesson Plan</Text>
              <Text style={styles.brandSubtitle}>
                {header.instructionalFormat || 'Detailed Lesson Plan'}
              </Text>
            </View>
          </View>
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>School</Text>
              <Text style={styles.metaValue}>
                {header.schoolName || 'Nexora LMS'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Teacher</Text>
              <Text style={styles.metaValue}>
                {header.teacherName || '--'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Learning Area</Text>
              <Text style={styles.metaValue}>
                {header.learningArea || '--'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Section / Grade</Text>
              <Text style={styles.metaValue}>
                {[header.sectionName, header.gradeLevel]
                  .filter(Boolean)
                  .join(' / ') || '--'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Module / Lesson</Text>
              <Text style={styles.metaValue}>
                {[header.moduleTitle, header.lessonTitle]
                  .filter(Boolean)
                  .join(' / ') || '--'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Date / Time</Text>
              <Text style={styles.metaValue}>
                {[header.date, header.startTime, header.endTime]
                  .filter(Boolean)
                  .join(' ') || '--'}
              </Text>
            </View>
          </View>
          <Text style={styles.metaNote}>
            Class profile: {plan.classProfile}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Evidence Summary</Text>
          <Text style={[styles.paragraph, styles.sectionLead]}>{plan.evidenceSummary}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Objectives</Text>
          {renderBullets(plan.objectives)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content / Subject Matter</Text>
          <Text style={styles.paragraph}>{plan.contentOrSubjectMatter}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learning Resources</Text>
          {renderBullets(plan.learningResources)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Procedures</Text>
          {procedureSections.map((section) => (
            <View key={section.label} style={styles.procedureBlock}>
              <Text style={styles.procedureLabel}>{section.label}</Text>
              {renderBullets(section.items)}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assessment</Text>
          {renderBullets(plan.assessment)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Differentiation</Text>
          <View style={styles.procedureBlock}>
            <Text style={styles.procedureLabel}>Support</Text>
            {renderBullets(differentiation.support)}
          </View>
          <View style={styles.procedureBlock}>
            <Text style={styles.procedureLabel}>Core</Text>
            {renderBullets(differentiation.core)}
          </View>
          <View style={styles.procedureBlock}>
            <Text style={styles.procedureLabel}>Enrichment</Text>
            {renderBullets(differentiation.enrichment)}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Remarks</Text>
          <Text style={styles.paragraph}>{plan.remarks || 'None'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reflection</Text>
          <Text style={styles.paragraph}>{plan.reflection}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assignment / Home Extension</Text>
          <Text style={styles.paragraph}>{plan.assignmentOrHomeExtension}</Text>
        </View>

        <View style={{ marginBottom: 0 }}>
          <Text style={styles.sectionTitle}>Safeguards</Text>
          {renderBullets(plan.safeguards)}
        </View>
      </Page>
    </Document>
  );
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export async function downloadLessonPlanPdf(
  plan: LessonPlanStructuredOutput,
  filename: string,
) {
  const blob = await pdf(<LessonPlanPdfDocument plan={plan} />).toBlob();
  triggerBrowserDownload(blob, filename);
}

