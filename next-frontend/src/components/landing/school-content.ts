export type SchoolPhoto = {
  src: string;
  alt: string;
  caption: string;
};

export type MissionCommitment = {
  audience: string;
  statement: string;
};

export type NexoraFeature = {
  title: string;
  description: string;
};

export const schoolPhotos: readonly SchoolPhoto[] = [
  {
    src: '/school/791933621_2895773317474311_1497442847657673928_n.jpg',
    alt: 'GABHS student volunteers at a registration table in a red campus corridor',
    caption: 'Student volunteers support a campus registration activity.',
  },
  {
    src: '/school/790791551_2397252354140478_2788241879294808784_n.jpg',
    alt: 'GABHS students assembling with flags in the school courtyard',
    caption: 'Student participants assemble in the GABHS courtyard.',
  },
  {
    src: '/school/791659648_4480649085487709_555155170102525242_n.jpg',
    alt: 'GABHS learners and educators holding certificates during a recognition program',
    caption: 'Learners and educators celebrate student recognition.',
  },
  {
    src: '/school/790754735_1043238498707177_3077974279066001279_n.jpg',
    alt: 'School and community partners attending a GABHS campus program',
    caption: 'School and community partners gather during a campus program.',
  },
  {
    src: '/school/792716438_1489088019919698_3972716468245332950_n.jpg',
    alt: 'Student participants gathered near the Andres Bonifacio monument at GABHS',
    caption: 'Student participants gather around the Andres Bonifacio monument.',
  },
  {
    src: '/school/792863248_2386684421863518_6685557380348622118_n.jpg',
    alt: 'GABHS learners and families gathered for a moving-up ceremony',
    caption: 'The school community comes together for a moving-up ceremony.',
  },
  {
    src: '/school/794018061_2189444998651885_4570970805706270825_n.jpg',
    alt: 'GABHS learners holding certificates at a local athletics venue',
    caption: 'Learners mark an achievement beyond the campus.',
  },
  {
    src: '/school/795696845_1043597941814715_2691900178015014022_n.jpg',
    alt: 'Families, learners, and staff attending a community session in a GABHS corridor',
    caption: 'Families, learners, and staff take part in a campus community session.',
  },
] as const;

export const depedVision = [
  'We dream of Filipinos who passionately love their country and whose values and competencies enable them to realize their full potential and contribute meaningfully to building the nation.',
  'As a learner-centered public institution, the Department of Education continuously improves itself to better serve its stakeholders.',
] as const;

export const depedMissionIntro =
  'To protect and promote the right of every Filipino to quality, equitable, culture-based, and complete basic education where:';

export const depedMissionCommitments: readonly MissionCommitment[] = [
  {
    audience: 'Students',
    statement:
      'Students learn in a child-friendly, gender-sensitive, safe, and motivating environment.',
  },
  {
    audience: 'Teachers',
    statement: 'Teachers facilitate learning and constantly nurture every learner.',
  },
  {
    audience: 'Administrators and staff',
    statement:
      'Administrators and staff, as stewards of the institution, ensure an enabling and supportive environment for effective learning to happen.',
  },
  {
    audience: 'Family, community, and other stakeholders',
    statement:
      'Family, community, and other stakeholders are actively engaged and share responsibility for developing life-long learners.',
  },
] as const;

export const coreValues = [
  'Maka-Diyos',
  'Maka-tao',
  'Makakalikasan',
  'Makabansa',
] as const;

export const nexoraFeatures: readonly NexoraFeature[] = [
  {
    title: 'Lessons and learning materials',
    description: 'Find class resources and learning activities in one school-managed space.',
  },
  {
    title: 'Assessments and progress',
    description: 'Complete assigned work and keep classroom progress easier to follow.',
  },
  {
    title: 'Announcements and communication',
    description: 'Keep school and class updates close to the learning experience.',
  },
  {
    title: 'Teacher-guided learning support',
    description: 'Use supportive tools within workflows led and reviewed by teachers.',
  },
] as const;
