import type { DemoQuestion, DemoSubjectTrack } from '@/types/demo';

function q(
  id: string,
  prompt: string,
  options: string[],
  correctIndex: number,
  explanation: string,
): DemoQuestion {
  return { id, prompt, options, correctIndex, explanation };
}

const rawDemoSubjects: DemoSubjectTrack[] = [
  {
    id: 'english',
    label: 'English',
    overview: 'Grade 7 communication skills, reading comprehension, and structured writing.',
    modules: [
      {
        id: 'eng-module-1',
        title: 'Module 1: Reading for Main Idea and Supporting Details',
        lessons: [
          {
            id: 'eng-m1-l1',
            title: 'Lesson 1: Spotting the Main Idea',
            summary: 'The main idea is the central message the author wants readers to understand.',
            keyPoints: [
              'Look for repeated words and ideas in the paragraph.',
              'Ask: what is this paragraph mostly about?',
              'Main ideas are broader than individual details.',
            ],
          },
          {
            id: 'eng-m1-l2',
            title: 'Lesson 2: Finding Supporting Details',
            summary: 'Supporting details explain, prove, or describe the main idea.',
            keyPoints: [
              'Details answer how, why, when, or where.',
              'Examples and facts usually function as support.',
              'If removed, the main message still remains.',
            ],
          },
          {
            id: 'eng-m1-l3',
            title: 'Lesson 3: Summarizing a Paragraph',
            summary: 'A summary combines the main idea with key supports in concise language.',
            keyPoints: [
              'Use your own words instead of copying long lines.',
              'Keep only essential ideas.',
              'Avoid adding personal opinions in a summary.',
            ],
          },
        ],
        assessment: {
          id: 'eng-m1-assessment',
          title: 'Module 1 Assessment',
          questions: [
            q('eng-m1-q1', 'What is the best definition of a main idea?', ['A specific date in the text', 'The central point of the paragraph', 'A quotation from the author', 'A personal reaction of the reader'], 1, 'The main idea tells what the paragraph is mostly about.'),
            q('eng-m1-q2', 'Which sentence is most likely a supporting detail?', ['The story is about friendship.', 'Friendship matters because it builds trust over time.', 'I like this story best.', 'This paragraph has four sentences.'], 1, 'The statement explains why the broader claim is true.'),
            q('eng-m1-q3', 'When writing a summary, what should you avoid?', ['Using your own words', 'Including key details', 'Adding unrelated opinions', 'Keeping it concise'], 2, 'Summaries should stay objective and focused on the source.'),
            q('eng-m1-q4', 'Which clue helps identify a paragraph main idea?', ['Repeated key terms', 'The longest word', 'The first comma', 'The paragraph color'], 0, 'Repeated concepts often signal the central topic.'),
            q('eng-m1-q5', 'A supporting detail should primarily...', ['Restate the title only', 'Explain or prove the main idea', 'Replace the main idea', 'Ignore the topic'], 1, 'Support details strengthen the main idea.'),
          ],
        },
      },
      {
        id: 'eng-module-2',
        title: 'Module 2: Context Clues and Vocabulary',
        lessons: [
          {
            id: 'eng-m2-l1',
            title: 'Lesson 1: Definition Clues',
            summary: 'Authors sometimes define a difficult word directly in a sentence.',
            keyPoints: [
              'Look for appositives and phrases like "means" or "that is".',
              'Nearby punctuation can signal definitions.',
              'Use the sentence around the word, not just the word itself.',
            ],
          },
          {
            id: 'eng-m2-l2',
            title: 'Lesson 2: Synonym and Antonym Clues',
            summary: 'Known words near an unknown word can reveal meaning.',
            keyPoints: [
              'Synonyms point to similar meaning.',
              'Antonyms can reveal the opposite.',
              'Contrast markers include but, however, unlike.',
            ],
          },
          {
            id: 'eng-m2-l3',
            title: 'Lesson 3: Word Parts (Prefix, Root, Suffix)',
            summary: 'Breaking words into parts helps infer meaning of unfamiliar vocabulary.',
            keyPoints: [
              'Prefixes appear at the start and modify meaning.',
              'Roots carry the core meaning.',
              'Suffixes can change function or tense.',
            ],
          },
        ],
        assessment: {
          id: 'eng-m2-assessment',
          title: 'Module 2 Assessment',
          questions: [
            q('eng-m2-q1', 'Which phrase usually introduces a definition clue?', ['In contrast', 'That is', 'Meanwhile', 'In my opinion'], 1, '"That is" often signals a direct explanation.'),
            q('eng-m2-q2', 'If a sentence says "calm, not frantic," what clue type is used?', ['Example clue', 'Antonym clue', 'Cause clue', 'Title clue'], 1, 'The opposite word helps infer meaning.'),
            q('eng-m2-q3', 'In the word "preview," what does the prefix "pre-" suggest?', ['After', 'Before', 'Again', 'Without'], 1, 'The prefix pre- means before.'),
            q('eng-m2-q4', 'Why are context clues useful?', ['They eliminate all ambiguity instantly', 'They help infer meaning without a dictionary first', 'They replace reading comprehension', 'They only work in poetry'], 1, 'Context clues provide likely meaning during reading.'),
            q('eng-m2-q5', 'A synonym clue works by giving...', ['A similar meaning nearby', 'A rhyme pattern', 'A grammar rule', 'A page number'], 0, 'Synonym clues restate an unknown word in known language.'),
          ],
        },
      },
      {
        id: 'eng-module-3',
        title: 'Module 3: Paragraph Writing and Coherence',
        lessons: [
          {
            id: 'eng-m3-l1',
            title: 'Lesson 1: Topic Sentence',
            summary: 'A strong paragraph begins with a clear topic sentence.',
            keyPoints: [
              'The topic sentence introduces the paragraph focus.',
              'It should be specific enough to guide supporting details.',
              'Avoid overly broad claims.',
            ],
          },
          {
            id: 'eng-m3-l2',
            title: 'Lesson 2: Coherence with Transitions',
            summary: 'Transitions help ideas flow logically from sentence to sentence.',
            keyPoints: [
              'Use sequence words for ordered steps.',
              'Use contrast words for opposing ideas.',
              'Coherence improves readability and understanding.',
            ],
          },
          {
            id: 'eng-m3-l3',
            title: 'Lesson 3: Concluding Sentence',
            summary: 'A conclusion wraps up the paragraph and reinforces the main thought.',
            keyPoints: [
              'Restate the main idea in fresh wording.',
              'Avoid introducing brand-new unrelated claims.',
              'Keep the ending concise and purposeful.',
            ],
          },
        ],
        assessment: {
          id: 'eng-m3-assessment',
          title: 'Module 3 Assessment',
          questions: [
            q('eng-m3-q1', 'What is the main role of a topic sentence?', ['Add decoration', 'Introduce the paragraph focus', 'Summarize the whole book', 'Give citations only'], 1, 'Topic sentences frame the paragraph direction.'),
            q('eng-m3-q2', 'Which transition shows contrast?', ['Furthermore', 'Similarly', 'However', 'Next'], 2, '"However" signals contrast between ideas.'),
            q('eng-m3-q3', 'A coherent paragraph should...', ['Jump between unrelated points', 'Follow a logical flow of ideas', 'Use random transitions', 'Repeat the same sentence'], 1, 'Coherence is logical connection between sentences.'),
            q('eng-m3-q4', 'A concluding sentence should usually...', ['Introduce a new unrelated argument', 'Ignore the topic sentence', 'Reinforce the paragraph main idea', 'List references'], 2, 'Conclusions close and reinforce the central point.'),
            q('eng-m3-q5', 'Which is strongest for paragraph organization?', ['Topic sentence + details + conclusion', 'Details only', 'Conclusion first then unrelated points', 'One very long sentence'], 0, 'This structure is the standard coherent paragraph pattern.'),
          ],
        },
      },
    ],
    quarterExam: {
      id: 'eng-quarter-exam',
      title: 'Quarter Exam: Integrated English Skills',
      questions: [
        q('eng-exam-q1', 'A paragraph claims school gardens improve learning. Which sentence best supports this claim?', ['Some students like the color green.', 'A class report shows students in gardening projects scored higher in science tasks.', 'Gardens are hard to maintain.', 'The paragraph has six lines.'], 1, 'Evidence-based detail strongly supports the claim.'),
        q('eng-exam-q2', 'If "meticulous" appears next to "careful and precise," which context clue is used?', ['Cause-effect', 'Definition or synonym', 'Sequence', 'Comparison of dates'], 1, 'Nearby explanatory wording provides meaning.'),
        q('eng-exam-q3', 'Which revision best improves coherence?', ['Adding unrelated examples between key points', 'Using transitions that match idea relationships', 'Removing all transitions', 'Repeating the topic sentence after every line'], 1, 'Appropriate transitions improve logical flow.'),
        q('eng-exam-q4', 'A student writes a summary with personal opinions. What is the main issue?', ['Too short', 'Too objective', 'It mixes summary with subjective commentary', 'No punctuation'], 2, 'Summaries should primarily preserve source meaning without opinion.'),
        q('eng-exam-q5', 'In "The climate is arid, meaning very dry," the clue type is...', ['Antonym', 'Definition', 'Example', 'Inference only'], 1, 'The phrase "meaning very dry" defines arid.'),
        q('eng-exam-q6', 'Which topic sentence is most focused?', ['Many things are interesting in school.', 'School life includes many activities and details.', 'Regular reading habits improve vocabulary and comprehension among Grade 7 learners.', 'Students are different.'], 2, 'It presents a specific, arguable focus for the paragraph.'),
        q('eng-exam-q7', 'What makes a supporting detail weak?', ['It directly explains the claim', 'It is specific and relevant', 'It is unrelated to the paragraph topic', 'It provides factual context'], 2, 'Irrelevant details do not support the main idea.'),
        q('eng-exam-q8', 'Choose the best concluding sentence for a paragraph on healthy routines:', ['I like basketball.', 'In conclusion, consistent sleep and hydration help students stay alert and ready to learn.', 'There are many sports around the world.', 'My cousin lives far away.'], 1, 'It closes the idea and reinforces the topic clearly.'),
        q('eng-exam-q9', 'Which word pair best indicates contrast?', ['Also / moreover', 'Because / therefore', 'However / although', 'First / next'], 2, 'Both terms commonly signal contrast.'),
        q('eng-exam-q10', 'When using context clues, first step should be to...', ['Ignore surrounding text', 'Read words and sentences around the unfamiliar term', 'Guess randomly and move on', 'Look only at punctuation marks'], 1, 'Local context provides immediate semantic hints.'),
        q('eng-exam-q11', 'Why is "copying long lines" discouraged in summaries?', ['It always causes grammar errors', 'It may skip key details and fails to show understanding', 'It makes summaries longer and less original', 'It is never allowed in any writing'], 2, 'Summaries should condense and rephrase core meaning.'),
        q('eng-exam-q12', 'Which transition best fits cause-effect?', ['For example', 'As a result', 'In contrast', 'Likewise'], 1, '"As a result" marks consequence.'),
        q('eng-exam-q13', 'A paragraph has strong details but no clear topic sentence. Main risk?', ['Too many verbs', 'Readers may not know the central point', 'No adjectives used', 'Punctuation is invalid'], 1, 'Without a clear topic sentence, structure loses focus.'),
        q('eng-exam-q14', 'Which option best demonstrates antonym clue usage?', ['She was jubilant, that is, very happy.', 'Unlike his timid brother, Marco is bold in class discussions.', 'The robot moved quickly.', 'The chapter has three pages.'], 1, 'Timid vs bold gives opposite-meaning contrast clue.'),
        q('eng-exam-q15', 'Best revision for unity in a paragraph about study habits?', ['Add a sentence about holiday travel', 'Keep details about planning, review, and focus time', 'Replace all transitions with emojis', 'Switch topic sentence halfway'], 1, 'Unity requires all details to support one controlling idea.'),
      ],
    },
  },
  {
    id: 'science',
    label: 'Science',
    overview: 'Grade 7 foundational science: scientific method, ecosystems, and cell biology.',
    modules: [
      {
        id: 'sci-module-1',
        title: 'Module 1: Scientific Inquiry and Variables',
        lessons: [
          {
            id: 'sci-m1-l1',
            title: 'Lesson 1: Steps of the Scientific Method',
            summary: 'Scientific investigations follow organized steps from question to conclusion.',
            keyPoints: [
              'A testable question starts an investigation.',
              'Hypothesis predicts an expected outcome.',
              'Conclusions use collected evidence.',
            ],
          },
          {
            id: 'sci-m1-l2',
            title: 'Lesson 2: Independent, Dependent, and Controlled Variables',
            summary: 'Variables help isolate what is being changed and measured.',
            keyPoints: [
              'Independent variable is what you change.',
              'Dependent variable is what you measure.',
              'Controlled variables stay the same for fair testing.',
            ],
          },
          {
            id: 'sci-m1-l3',
            title: 'Lesson 3: Data Collection and Reliability',
            summary: 'Reliable investigations use repeated trials and careful measurements.',
            keyPoints: [
              'Multiple trials reduce random error.',
              'Consistent measurement tools improve reliability.',
              'Clear records help explain conclusions.',
            ],
          },
        ],
        assessment: {
          id: 'sci-m1-assessment',
          title: 'Module 1 Assessment',
          questions: [
            q('sci-m1-q1', 'Which variable is measured as the outcome?', ['Independent', 'Dependent', 'Controlled', 'Constant error'], 1, 'Dependent variable reflects the result of the test.'),
            q('sci-m1-q2', 'A hypothesis should be...', ['Untestable opinion only', 'A prediction that can be tested', 'A final result statement', 'A list of materials'], 1, 'Hypotheses are testable predictions.'),
            q('sci-m1-q3', 'Why are controlled variables important?', ['They speed up grading', 'They keep tests fair and comparable', 'They change every trial', 'They replace data tables'], 1, 'Controls prevent unrelated factors from distorting results.'),
            q('sci-m1-q4', 'Which action improves reliability?', ['One trial only', 'Repeated trials with consistent method', 'Changing procedure each run', 'Ignoring outliers without review'], 1, 'Replication and consistency improve trust in data.'),
            q('sci-m1-q5', 'The independent variable is...', ['What is changed by the investigator', 'What is measured at the end', 'The same value in every group', 'An accidental mistake'], 0, 'The independent variable is manipulated intentionally.'),
          ],
        },
      },
      {
        id: 'sci-module-2',
        title: 'Module 2: Ecosystems and Energy Flow',
        lessons: [
          {
            id: 'sci-m2-l1',
            title: 'Lesson 1: Biotic and Abiotic Factors',
            summary: 'Ecosystems include living organisms and nonliving environmental conditions.',
            keyPoints: [
              'Biotic factors are living components.',
              'Abiotic factors include sunlight, water, and temperature.',
              'Both interact to shape ecosystem balance.',
            ],
          },
          {
            id: 'sci-m2-l2',
            title: 'Lesson 2: Food Chains and Food Webs',
            summary: 'Energy moves through organisms starting from producers.',
            keyPoints: [
              'Producers convert sunlight into food.',
              'Consumers obtain energy by eating other organisms.',
              'Food webs show interconnected feeding relationships.',
            ],
          },
          {
            id: 'sci-m2-l3',
            title: 'Lesson 3: Ecological Balance and Human Impact',
            summary: 'Changes in one population can affect many others.',
            keyPoints: [
              'Population shifts can destabilize food webs.',
              'Pollution and habitat loss impact biodiversity.',
              'Conservation practices support ecosystem health.',
            ],
          },
        ],
        assessment: {
          id: 'sci-m2-assessment',
          title: 'Module 2 Assessment',
          questions: [
            q('sci-m2-q1', 'Which is an abiotic factor?', ['Grass', 'Rabbit', 'Sunlight', 'Fungus'], 2, 'Sunlight is a nonliving ecosystem component.'),
            q('sci-m2-q2', 'In a food chain, producers are important because they...', ['Eat all organisms', 'Create energy from sunlight', 'Decompose dead animals', 'Reduce oxygen'], 1, 'Producers begin the energy pathway.'),
            q('sci-m2-q3', 'A food web differs from a food chain because it...', ['Has only one organism', 'Shows many interconnected feeding paths', 'Ignores consumers', 'Only includes plants'], 1, 'Food webs map multiple linked feeding relationships.'),
            q('sci-m2-q4', 'What may happen if a key predator disappears?', ['Nothing changes', 'Prey population may increase and affect balance', 'Plants stop photosynthesis', 'Only abiotic factors change'], 1, 'Trophic imbalance often follows predator loss.'),
            q('sci-m2-q5', 'Which action supports ecosystem conservation?', ['Dumping waste in rivers', 'Protecting habitats and reducing pollution', 'Removing all predators', 'Introducing invasive species'], 1, 'Habitat protection and pollution control support biodiversity.'),
          ],
        },
      },
      {
        id: 'sci-module-3',
        title: 'Module 3: Cells and Organisms',
        lessons: [
          {
            id: 'sci-m3-l1',
            title: 'Lesson 1: Cell Theory Basics',
            summary: 'Cell theory explains that cells are the basic units of life.',
            keyPoints: [
              'All living things are made of cells.',
              'Cells come from pre-existing cells.',
              'Cells are the smallest functional unit of life.',
            ],
          },
          {
            id: 'sci-m3-l2',
            title: 'Lesson 2: Cell Organelles and Functions',
            summary: 'Different organelles perform specific tasks for cell survival.',
            keyPoints: [
              'Nucleus stores genetic material and directs activities.',
              'Cell membrane controls movement in and out.',
              'Mitochondria release usable energy.',
            ],
          },
          {
            id: 'sci-m3-l3',
            title: 'Lesson 3: Plant and Animal Cell Differences',
            summary: 'Plant and animal cells share many organelles but also differ in structure.',
            keyPoints: [
              'Plant cells have cell walls and chloroplasts.',
              'Animal cells do not have chloroplasts.',
              'Both have nucleus, membrane, and cytoplasm.',
            ],
          },
        ],
        assessment: {
          id: 'sci-m3-assessment',
          title: 'Module 3 Assessment',
          questions: [
            q('sci-m3-q1', 'Which organelle directs cell activities?', ['Nucleus', 'Cell wall', 'Ribosome', 'Vacuole'], 0, 'The nucleus contains DNA and control functions.'),
            q('sci-m3-q2', 'A structure found in plant cells but not animal cells is...', ['Cell membrane', 'Nucleus', 'Chloroplast', 'Cytoplasm'], 2, 'Chloroplasts are unique to plant cells for photosynthesis.'),
            q('sci-m3-q3', 'Cell theory states that cells come from...', ['Spontaneous generation', 'Pre-existing cells', 'Rock minerals', 'Sunlight directly'], 1, 'Modern cell theory rejects spontaneous generation.'),
            q('sci-m3-q4', 'What is a key function of the cell membrane?', ['Store DNA', 'Control entry and exit of substances', 'Produce chlorophyll', 'Break bones'], 1, 'Membrane regulates transport to maintain homeostasis.'),
            q('sci-m3-q5', 'Mitochondria are mainly associated with...', ['Energy release for cell processes', 'Cell division instructions', 'Photosynthesis pigments', 'Cell wall rigidity'], 0, 'Mitochondria generate usable cellular energy.'),
          ],
        },
      },
    ],
    quarterExam: {
      id: 'sci-quarter-exam',
      title: 'Quarter Exam: Integrated Science Reasoning',
      questions: [
        q('sci-exam-q1', 'A student changes only fertilizer amount and measures plant height. What is the dependent variable?', ['Fertilizer amount', 'Plant height', 'Type of pot', 'Amount of sunlight'], 1, 'The measured outcome is plant height.'),
        q('sci-exam-q2', 'Why are repeated trials important in experiments?', ['They guarantee desired results', 'They improve reliability and reduce random error', 'They remove the need for data tables', 'They make controls unnecessary'], 1, 'Replication increases confidence in findings.'),
        q('sci-exam-q3', 'Which statement best describes a food web?', ['A single feeding relationship', 'Interconnected feeding relationships among many organisms', 'Only producers and decomposers', 'A list of abiotic factors'], 1, 'Food webs represent multiple energy paths.'),
        q('sci-exam-q4', 'If a polluted river reduces fish population, a likely ecosystem effect is...', ['No effect on predators', 'Predators depending on fish may decline', 'More oxygen in all habitats', 'Immediate increase in biodiversity'], 1, 'Reduced prey can lower predator populations.'),
        q('sci-exam-q5', 'Which pair correctly matches organelle and function?', ['Nucleus - photosynthesis', 'Cell membrane - transport regulation', 'Chloroplast - digestion', 'Mitochondria - DNA storage'], 1, 'Membranes regulate material movement in/out of cells.'),
        q('sci-exam-q6', 'A fair test requires controlled variables to...', ['Change each trial', 'Stay constant while testing one factor', 'Be ignored in conclusions', 'Replace the dependent variable'], 1, 'Controls keep comparisons valid.'),
        q('sci-exam-q7', 'In ecosystem terms, sunlight is classified as...', ['Biotic', 'Abiotic', 'Consumer', 'Decomposer'], 1, 'Sunlight is a nonliving environmental factor.'),
        q('sci-exam-q8', 'Which sequence correctly shows energy flow in a simple chain?', ['Consumer -> Producer -> Sun', 'Sun -> Producer -> Consumer', 'Producer -> Sun -> Consumer', 'Decomposer -> Sun -> Producer'], 1, 'Energy starts from the sun, captured by producers.'),
        q('sci-exam-q9', 'What would be the best hypothesis format?', ['Plants are nice.', 'If fertilizer amount increases within a safe range, then average plant height will increase after two weeks.', 'Experiments are hard.', 'Data collection is important.'], 1, 'It is specific, measurable, and testable.'),
        q('sci-exam-q10', 'Which structure helps plant cells maintain rigid shape?', ['Cell wall', 'Nucleus', 'Mitochondria', 'Ribosome'], 0, 'Cell walls provide support and rigidity in plants.'),
        q('sci-exam-q11', 'If results contradict a hypothesis, best scientific action is to...', ['Delete the data', 'Revise explanation and test again with evidence', 'Change results to match hypothesis', 'End investigation immediately'], 1, 'Science relies on evidence-based revision and retesting.'),
        q('sci-exam-q12', 'A decrease in producer population most directly affects...', ['Availability of energy for higher trophic levels', 'Earth rotation', 'Atomic number of elements', 'Cell membrane thickness'], 0, 'Less producer biomass limits ecosystem energy supply.'),
        q('sci-exam-q13', 'Which is true of both plant and animal cells?', ['Both contain chloroplasts', 'Both contain nuclei and cell membranes', 'Both have cell walls', 'Both cannot reproduce'], 1, 'Nucleus and membrane are shared in both types.'),
        q('sci-exam-q14', 'A variable accidentally changing between groups is called...', ['Independent variable', 'Dependent variable', 'Confounding/uncontrolled factor', 'Reliable constant'], 2, 'Uncontrolled changes can bias experimental outcomes.'),
        q('sci-exam-q15', 'Which conclusion best matches scientific reasoning?', ['The first trial proves everything permanently.', 'Evidence from repeated trials supports the claim within tested conditions.', 'If one data point fits, all future conditions will match.', 'Conclusions are based on opinion and preference.'], 1, 'Scientific conclusions are bounded by evidence and conditions.'),
      ],
    },
  },
];

const englishCitations = [
  {
    title: 'Topic sentence (Wikipedia)',
    url: 'https://en.wikipedia.org/wiki/Topic_sentence',
    license: 'CC BY-SA 4.0',
  },
  {
    title: 'Paragraph structure (Wikipedia)',
    url: 'https://en.wikipedia.org/wiki/Paragraph',
    license: 'CC BY-SA 4.0',
  },
  {
    title: 'English Grammar (Wikibooks)',
    url: 'https://en.wikibooks.org/wiki/English_Grammar',
    license: 'CC BY-SA 4.0',
  },
];

const scienceCitations = [
  {
    title: 'Scientific method (Wikipedia)',
    url: 'https://en.wikipedia.org/wiki/Scientific_method',
    license: 'CC BY-SA 4.0',
  },
  {
    title: 'Ecosystem (Wikipedia)',
    url: 'https://en.wikipedia.org/wiki/Ecosystem',
    license: 'CC BY-SA 4.0',
  },
  {
    title: 'Cell (biology) (Wikipedia)',
    url: 'https://en.wikipedia.org/wiki/Cell_(biology)',
    license: 'CC BY-SA 4.0',
  },
  {
    title: 'OpenStax Biology 2e',
    url: 'https://openstax.org/details/books/biology-2e',
    license: 'CC BY 4.0',
  },
];

function lessonMedia(subjectId: DemoSubjectTrack['id'], lessonId: string) {
  if (subjectId === 'science') {
    if (lessonId.includes('m1')) {
      return [
        {
          src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/The_Scientific_Method.svg/640px-The_Scientific_Method.svg.png',
          alt: 'Scientific method flow diagram',
          caption: 'Standard iterative scientific method workflow.',
          sourceTitle: 'Wikimedia Commons - The Scientific Method',
          sourceUrl:
            'https://commons.wikimedia.org/wiki/File:The_Scientific_Method.svg',
          license: 'CC BY-SA 3.0',
        },
      ];
    }
    if (lessonId.includes('m2')) {
      return [
        {
          src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Food_web_example.svg/640px-Food_web_example.svg.png',
          alt: 'Food web illustration',
          caption: 'Energy transfer between producers and consumers in a food web.',
          sourceTitle: 'Wikimedia Commons - Food web example',
          sourceUrl:
            'https://commons.wikimedia.org/wiki/File:Food_web_example.svg',
          license: 'CC BY-SA 3.0',
        },
      ];
    }
    return [
      {
        src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Plant_cell_structure-en.svg/640px-Plant_cell_structure-en.svg.png',
        alt: 'Plant cell structure diagram',
        caption: 'Major organelles commonly discussed in Grade 7 cell biology.',
        sourceTitle: 'Wikimedia Commons - Plant cell structure',
        sourceUrl:
          'https://commons.wikimedia.org/wiki/File:Plant_cell_structure-en.svg',
        license: 'CC BY-SA 3.0',
      },
    ];
  }

  if (lessonId.includes('m2')) {
    return [
      {
        src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Dictionary_open.svg/512px-Dictionary_open.svg.png',
        alt: 'Open dictionary icon',
        caption: 'Context clue strategies often begin with close reading around unfamiliar words.',
        sourceTitle: 'Wikimedia Commons - Dictionary open icon',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Dictionary_open.svg',
        license: 'CC BY-SA 4.0',
      },
    ];
  }
  return [
    {
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Book-icon.svg/512px-Book-icon.svg.png',
      alt: 'Book icon',
      caption: 'Structured reading and paragraph analysis improve comprehension.',
      sourceTitle: 'Wikimedia Commons - Book icon',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Book-icon.svg',
      license: 'Public domain',
    },
  ];
}

function enrichLesson(subjectId: DemoSubjectTrack['id'], lesson: DemoSubjectTrack['modules'][number]['lessons'][number]) {
  const baseOverview = lesson.summary ?? lesson.overview ?? '';
  return {
    ...lesson,
    overview: baseOverview,
    learningObjectives: lesson.learningObjectives ?? [
      `Identify the core idea of ${lesson.title.toLowerCase()}.`,
      'Explain the concept using evidence from examples.',
      'Apply the concept in a short formative check.',
    ],
    workedExample:
      lesson.workedExample ?? {
        prompt: `Worked example for ${lesson.title}`,
        explanation: `${baseOverview} In practice, students should explain why each supporting detail or scientific claim is evidence-based, then verify with a short check question.`,
      },
    miniCheck:
      lesson.miniCheck ?? {
        prompt: `Mini-check: which statement best reflects the lesson focus in "${lesson.title}"?`,
        options: [
          'A claim supported by clear evidence and reasoning.',
          'A random statement without support.',
          'An unrelated topic from another module.',
          'A guess without reviewing lesson content.',
        ],
        correctIndex: 0,
        explanation:
          'The strongest response uses lesson evidence, not unrelated or unsupported statements.',
      },
    imageBlocks: lesson.imageBlocks ?? lessonMedia(subjectId, lesson.id),
    citations: lesson.citations ?? (subjectId === 'science' ? scienceCitations : englishCitations),
  };
}

export const demoSubjects: DemoSubjectTrack[] = rawDemoSubjects.map((subject) => ({
  ...subject,
  modules: subject.modules.map((moduleEntry) => ({
    ...moduleEntry,
    lessons: moduleEntry.lessons.map((lesson) => enrichLesson(subject.id, lesson)),
  })),
}));

export function getDemoSubject(subjectId: DemoSubjectTrack['id'] | null): DemoSubjectTrack | null {
  if (!subjectId) return null;
  return demoSubjects.find((subject) => subject.id === subjectId) ?? null;
}
