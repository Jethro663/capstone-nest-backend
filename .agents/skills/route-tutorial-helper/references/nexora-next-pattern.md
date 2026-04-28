# Nexora Next.js Pattern

Use this pattern for `next-frontend` App Router pages in `capstone-nest-react-lms`.

## Page Structure

Add route-local types and page data near existing route constants:

```tsx
type GuideScreen = 'overview' | 'queue' | 'detail';

const guidePages: Array<{
  title: string;
  description: string;
  screen: GuideScreen;
  steps: Array<{
    action: string;
    body: string;
    tone?: 'default' | 'caution' | 'success';
  }>;
}> = [
  {
    title: 'Start with the page filter',
    description: 'Choose the class first so the page shows the right students.',
    screen: 'overview',
    steps: [
      {
        action: 'Choose',
        body: 'Select one class from the selector before reading the queue.',
      },
      {
        action: 'Check',
        body: 'Read the summary numbers so you know the class status first.',
      },
      {
        action: 'Review',
        body: 'Use table actions only after checking the student status.',
        tone: 'caution',
      },
    ],
  },
];
```

Add a screenshot component in the same file unless the guide is reused across multiple routes:

```tsx
function RouteGuideScreenshot({ screen }: { screen: GuideScreen }) {
  return (
    <div className={`teacher-intervention-workspace__manual-shot route-guide-shot is-${screen}`}>
      <div className="teacher-intervention-workspace__manual-window">
        <span />
        <span />
        <span />
      </div>
      {screen === 'overview' ? (
        <>
          <div className="route-guide-summary">
            <div>
              <small>Active</small>
              <strong>2</strong>
            </div>
          </div>
          <em className="teacher-intervention-workspace__manual-pin is-filter">Class filter</em>
        </>
      ) : null}
    </div>
  );
}
```

Add state inside the page component:

```tsx
const [helpOpen, setHelpOpen] = useState(false);
const [helpPage, setHelpPage] = useState(0);
```

Place the trigger in the existing top-right page actions:

```tsx
<button
  type="button"
  className="teacher-intervention-workspace__help"
  onClick={() => {
    setHelpPage(0);
    setHelpOpen(true);
  }}
  aria-label="Module help"
>
  <CircleHelp className="h-4 w-4" />
</button>
```

Use the existing dialog pattern:

```tsx
<Dialog
  open={helpOpen}
  onOpenChange={(open) => {
    setHelpOpen(open);
    if (open) setHelpPage(0);
  }}
>
  <DialogContent className="teacher-intervention-workspace__manual-dialog">
    <DialogHeader>
      <DialogTitle>Teacher guide: Page Name</DialogTitle>
      <DialogDescription>
        Read this one page at a time. Each example points to the part of the page being explained.
      </DialogDescription>
    </DialogHeader>

    <div className="teacher-intervention-workspace__manual-progress" aria-live="polite">
      <span>Page {helpPage + 1} of {guidePages.length}</span>
      <div>
        {guidePages.map((page, index) => (
          <button
            key={page.title}
            type="button"
            className={index === helpPage ? 'is-active' : undefined}
            onClick={() => setHelpPage(index)}
            aria-label={`Open guide page ${index + 1}`}
          />
        ))}
      </div>
    </div>

    <div className="teacher-intervention-workspace__manual-layout">
      <RouteGuideScreenshot screen={guidePages[helpPage].screen} />
      <section className="teacher-intervention-workspace__manual-copy">
        <p className="teacher-intervention-workspace__manual-kicker">Teacher instruction manual</p>
        <h3>{guidePages[helpPage].title}</h3>
        <p>{guidePages[helpPage].description}</p>
        <div className="route-guide-steps">
          {guidePages[helpPage].steps.map((step, index) => (
            <div
              key={`${step.action}-${step.body}`}
              className={`route-guide-step ${step.tone ? `is-${step.tone}` : ''}`}
            >
              <span className="route-guide-step__index">{index + 1}</span>
              <div>
                <strong>{step.action}</strong>
                <p>{step.body}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="teacher-intervention-workspace__manual-reminder">
          Simple rule: choose the class, check the status, then act.
        </p>
      </section>
    </div>

    <DialogFooter>{/* Previous / Next / Close buttons */}</DialogFooter>
  </DialogContent>
</Dialog>
```

## CSS Pattern

Reuse existing `.teacher-intervention-workspace__manual-*` classes when present. Add only route-specific screenshot classes for the inner mock UI.

For mini tables and summaries:

```css
.route-guide-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--intervention-border);
  border-radius: 0.45rem;
  background: #ffffff;
}

.route-guide-summary > div {
  display: grid;
  gap: 0.16rem;
  min-width: 0;
  border-right: 1px solid var(--intervention-border-soft);
  padding: 0.62rem 0.55rem;
}

.route-guide-summary small,
.route-guide-table strong {
  color: var(--intervention-muted);
  font-size: 0.55rem;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
}

.route-guide-summary strong,
.route-guide-table span {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--intervention-strong);
}
```

Avoid putting all labels and values in one text node such as `Active 2Completed 8Average Delta`. Split labels and values into separate elements.

For guided instruction text:

```css
.route-guide-steps {
  display: grid;
  gap: 0.62rem;
  margin-top: 0.2rem;
}

.route-guide-step {
  display: grid;
  grid-template-columns: 1.9rem minmax(0, 1fr);
  gap: 0.68rem;
  align-items: start;
  border: 1px solid var(--intervention-border-soft);
  border-left: 3px solid var(--intervention-red);
  border-radius: 0.48rem;
  background: #ffffff;
  padding: 0.68rem 0.74rem;
}

.route-guide-step__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.55rem;
  height: 1.55rem;
  border-radius: 999px;
  background: var(--intervention-red);
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 900;
}

.route-guide-step strong {
  display: block;
  color: var(--intervention-strong);
  font-size: 0.86rem;
  font-weight: 900;
}

.route-guide-step p {
  margin: 0.12rem 0 0;
  color: var(--intervention-muted);
  font-size: 0.82rem;
  line-height: 1.45;
}

.route-guide-step.is-caution {
  border-left-color: #b7791f;
  background: #fffaf0;
}

.route-guide-step.is-caution .route-guide-step__index {
  background: #b7791f;
}
```

The instruction column should feel like a guided checklist or timeline. Avoid unstyled paragraphs that simply tell the teacher what to do.

## Test Pattern

Extend the route's focused test file:

```tsx
fireEvent.click(screen.getByRole('button', { name: /module help/i }));

expect(await screen.findByText('Teacher guide: Page Name')).toBeInTheDocument();
expect(screen.getByText('Page 1 of 4')).toBeInTheDocument();
expect(screen.getByText('Start with the page filter')).toBeInTheDocument();

fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
expect(screen.getByText('Page 2 of 4')).toBeInTheDocument();

fireEvent.click(screen.getByRole('button', { name: 'Close guide' }));
await waitFor(() => {
  expect(screen.queryByText('Teacher guide: Page Name')).not.toBeInTheDocument();
});
```

## Verification

Run the narrowest valid checks:

```powershell
npx jest --runTestsByPath "app/(dashboard)/dashboard/path/page.test.tsx" --runInBand
npx eslint "app/(dashboard)/dashboard/path/page.tsx" "app/(dashboard)/dashboard/path/page.test.tsx"
git diff --check -- "next-frontend/app/(dashboard)/dashboard/path/page.tsx" "next-frontend/app/globals.css"
```
