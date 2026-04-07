import {
  advanceDemoState,
  createInitialDemoState,
  determineOutcomeBand,
} from '@/lib/demo-engine';

describe('demo-engine', () => {
  function finishModule(stateIn: ReturnType<typeof createInitialDemoState>, scorePercent: number) {
    let state = stateIn;
    state = advanceDemoState(state, { type: 'next_lesson', lessonCount: 3 });
    state = advanceDemoState(state, { type: 'next_lesson', lessonCount: 3 });
    state = advanceDemoState(state, { type: 'next_lesson', lessonCount: 3 });
    state = advanceDemoState(state, { type: 'submit_module_assessment', scorePercent });
    return state;
  }

  it('classifies score bands using the demo threshold policy', () => {
    expect(determineOutcomeBand(95)).toBe('excellent');
    expect(determineOutcomeBand(80)).toBe('good');
    expect(determineOutcomeBand(75)).toBe('good');
    expect(determineOutcomeBand(74)).toBe('nice_try');
  });

  it('blocks entering module lessons before subject selection', () => {
    const initial = createInitialDemoState();
    const blocked = advanceDemoState(initial, { type: 'start_modules' });

    expect(blocked).toEqual(initial);
    expect(blocked.scene).toBe('intro');
  });

  it('routes high-score branch to chatbot-capable completion', () => {
    let state = createInitialDemoState();
    state = advanceDemoState(state, { type: 'begin_demo' });
    state = advanceDemoState(state, { type: 'select_subject', subjectId: 'english' });

    state = finishModule(state, 80);
    state = finishModule(state, 82);
    state = finishModule(state, 78);
    state = advanceDemoState(state, { type: 'submit_quarter_exam', scorePercent: 88 });

    expect(state.scene).toBe('outcome');
    expect(state.outcomeBand).toBe('good');

    state = advanceDemoState(state, { type: 'continue_from_outcome' });
    expect(state.scene).toBe('completed_high');
  });

  it('routes low-score branch through teacher plan and lxp completion', () => {
    let state = createInitialDemoState();
    state = advanceDemoState(state, { type: 'begin_demo' });
    state = advanceDemoState(state, { type: 'select_subject', subjectId: 'science' });

    state = finishModule(state, 62);
    state = finishModule(state, 64);
    state = finishModule(state, 68);
    state = advanceDemoState(state, { type: 'submit_quarter_exam', scorePercent: 72 });

    expect(state.scene).toBe('outcome');
    expect(state.outcomeBand).toBe('nice_try');

    state = advanceDemoState(state, { type: 'continue_from_outcome' });
    expect(state.scene).toBe('teacher_plan');

    state = advanceDemoState(state, {
      type: 'apply_ai_plan',
      plan: {
        source: 'fallback',
        weakConcepts: ['Evidence-based explanations'],
        recommendedModules: ['Science Module 2'],
        teacherSummary: 'Focus on the weakest concepts before retrying.',
        lxpQuestions: [],
      },
    });
    expect(state.scene).toBe('lxp_session');

    state = advanceDemoState(state, { type: 'submit_lxp', scorePercent: 79 });
    expect(state.scene).toBe('completed_pass');
  });
});
