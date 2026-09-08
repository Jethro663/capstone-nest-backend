"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  FileQuestion,
  Upload,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { assessmentService } from "@/services/assessment-service";
import type { SaveAssessmentEditorInput } from "@/types/assessment";
import type { AssignmentCreationContext } from "@/types/assignment-creation";
import {
  buildAssignmentRequest,
  emptyAssignmentSetup,
  type AssignmentSetup,
} from "./assignment-creation";

const fields =
  "mt-2 block min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
const stepNames = ["Format", "Class record", "Details"];
function getApiErrorMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message || (error instanceof Error ? error.message : fallback)
  );
}

export function NewAssignmentWizard({
  classId,
  actorId,
  onClose,
  onCreated,
}: {
  classId: string;
  actorId: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [context, setContext] = useState<AssignmentCreationContext | null>(
    null,
  );
  const [setup, setSetup] = useState(emptyAssignmentSetup);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<SaveAssessmentEditorInput | null>(
    null,
  );
  const submitting = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const recovery = assessmentService.getPendingCreation(actorId, classId);
        if (active) setPending(recovery);
        const data = await assessmentService.getCreationContext(classId);
        if (active) {
          setContext(data);
          setSetup((current) => ({
            ...current,
            quarter: data.defaultPeriod ?? "",
          }));
        }
      } catch (cause) {
        if (active)
          setError(
            getApiErrorMessage(
              cause,
              "Assignment setup could not be loaded. Close and try again.",
            ),
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [actorId, classId]);

  const period = context?.periods.find((entry) => entry.key === setup.quarter);
  const category = context?.categories.find(
    (entry) => entry.key === setup.category,
  );
  const slots =
    period?.workbook?.categories.find((entry) => entry.key === setup.category)
      ?.slots ?? [];
  const selectedSlot = setup.manualSlot
    ? slots.find((entry) => entry.itemId === setup.itemId && entry.isSelectable)
    : slots.find((entry) => entry.isSelectable);
  const placementValid = Boolean(
    period?.canPrepare && category && (!period.workbook || selectedSlot),
  );
  const destination =
    period && category
      ? `${period.label} → ${category.label} → ${selectedSlot ? `Slot ${selectedSlot.order}` : "first available slot"}`
      : "Choose where the score will appear";

  function go(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
    setError("");
  }
  function change<K extends keyof AssignmentSetup>(
    key: K,
    value: AssignmentSetup[K],
  ) {
    setSetup((current) => ({ ...current, [key]: value }));
  }
  async function submit(skip: boolean) {
    if (submitting.current) return;
    if (!pending && (!context?.defaultPeriod || !setup.type)) return;
    if (!pending && !skip) {
      if (!placementValid) {
        go(1);
        setError("Choose an available class-record destination.");
        return;
      }
      if (!setup.title.trim()) {
        setError("Enter an assignment name.");
        return;
      }
      if (
        !setup.noDueDate &&
        (!setup.dueDate ||
          !Number.isFinite(Date.parse(`${setup.dueDate}:00+08:00`)) ||
          Date.parse(`${setup.dueDate}:00+08:00`) <= Date.now())
      ) {
        setError("Choose a future due date and time, or select No due date.");
        return;
      }
      if (
        setup.type === "quiz" &&
        (!Number.isInteger(Number(setup.maxAttempts)) ||
          Number(setup.maxAttempts) < 1 ||
          Number(setup.maxAttempts) > 100)
      ) {
        setError("Maximum attempts must be a whole number from 1 to 100.");
        return;
      }
    }
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const request =
        pending ??
        buildAssignmentRequest(
          classId,
          crypto.randomUUID(),
          { ...setup, itemId: selectedSlot?.itemId ?? "" },
          context!.defaultPeriod!,
          skip,
        );
      const result = await assessmentService.createFromSetup(actorId, request);
      setPending(null);
      onCreated(result.assessment.id);
    } catch (cause) {
      const detail = cause as {
        response?: { status?: number; data?: { code?: string } };
      };
      try {
        setPending(assessmentService.getPendingCreation(actorId, classId));
      } catch {
        /* Keep the original error visible. */
      }
      setError(
        getApiErrorMessage(
          cause,
          "Creation could not be confirmed. Retry to recover the same draft.",
        ),
      );
      if (
        detail.response?.status === 409 ||
        detail.response?.data?.code === "ASSESSMENT_SLOT_UNAVAILABLE"
      ) {
        setDirection(-1);
        setStep(1);
        try {
          const refreshed = await assessmentService.getCreationContext(classId);
          setContext(refreshed);
          setSetup((current) => ({
            ...current,
            itemId: "",
            manualSlot: false,
          }));
        } catch {
          setError(
            "The destination changed, and availability could not be refreshed. Close and reopen setup.",
          );
          setContext(null);
        }
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !submitting.current) onClose();
      }}
    >
      <DialogContent
        className="flex h-dvh max-h-dvh max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[90dvh] sm:max-w-[740px] sm:rounded-lg"
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <header className="border-b border-border px-6 pb-5 pt-6 pr-12">
          <DialogTitle>Create an assignment</DialogTitle>
          <DialogDescription className="mt-2">
            Set up the essentials, then build your activity. Your assignment
            starts as a draft.
          </DialogDescription>
          <ol
            aria-label="Creation progress"
            className="mt-5 flex gap-4 text-sm"
          >
            {stepNames.map((name, index) => (
              <li
                key={name}
                aria-current={step === index ? "step" : undefined}
                className={
                  step === index
                    ? "font-semibold text-primary"
                    : "text-muted-foreground"
                }
              >
                {index + 1}. {name}
              </li>
            ))}
          </ol>
        </header>
        <div
          className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:min-h-[330px]"
          aria-busy={busy || loading}
        >
          {error && (
            <p
              role="alert"
              className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          {pending ? (
            <section>
              <h2 className="text-xl font-semibold">Recover your assignment</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                A previous creation request has not been confirmed. Retry it to
                open the same draft before starting another assignment.
              </p>
              <p className="mt-4 font-medium">
                {pending.settings.title || "Untitled assignment"} ·{" "}
                {pending.settings.type === "file_upload"
                  ? "File upload"
                  : "Questions"}
              </p>
              <Button
                className="mt-6"
                disabled={busy}
                onClick={() => void submit(false)}
              >
                {busy ? "Recovering…" : "Retry creation"}
              </Button>
            </section>
          ) : loading ? (
            <p role="status" className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
              Loading available class-record slots…
            </p>
          ) : !context?.defaultPeriod ? (
            <p className="text-sm text-muted-foreground">
              {context
                ? "This class has no editable period. Reopen the class or workbook before creating an assignment."
                : "Close this window and try loading setup again."}
            </p>
          ) : (
            <AnimatePresence initial={false} mode="wait" custom={direction}>
              <motion.section
                key={step}
                custom={direction}
                variants={{
                  enter: (value: number) => ({
                    opacity: 0,
                    x: reducedMotion ? 0 : value * 18,
                  }),
                  visible: { opacity: 1, x: 0 },
                  exit: (value: number) => ({
                    opacity: 0,
                    x: reducedMotion ? 0 : value * -18,
                  }),
                }}
                initial="enter"
                animate="visible"
                exit="exit"
                transition={{ duration: reducedMotion ? 0 : 0.18 }}
                onAnimationComplete={() => heading.current?.focus()}
              >
                <p className="sr-only" role="status">
                  Step {step + 1} of 3: {stepNames[step]}
                </p>
                <h2
                  ref={heading}
                  tabIndex={-1}
                  className="text-xl font-semibold outline-none"
                >
                  {
                    [
                      "Choose an assignment format",
                      "Class record setup",
                      "Name and schedule",
                    ][step]
                  }
                </h2>
                {step === 0 && (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      aria-pressed={setup.type === "quiz"}
                      onClick={() => {
                        change("type", "quiz");
                        go(1);
                      }}
                      className="rounded-lg border border-border p-5 text-left hover:border-primary aria-pressed:border-primary aria-pressed:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <FileQuestion
                        aria-hidden
                        className="mb-4 h-6 w-6 text-primary"
                      />
                      <span className="block font-semibold">
                        Question assignment
                      </span>
                      <span className="mt-3 block text-sm leading-6 text-muted-foreground">
                        Students answer questions directly in Nexora. Use
                        automatic or teacher grading, multiple attempts, timers,
                        and question randomization.
                      </span>
                      <span className="mt-3 block text-sm">
                        Best for quizzes, written responses, and practice.
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={setup.type === "file_upload"}
                      onClick={() => {
                        change("type", "file_upload");
                        go(1);
                      }}
                      className="rounded-lg border border-border p-5 text-left hover:border-primary aria-pressed:border-primary aria-pressed:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Upload
                        aria-hidden
                        className="mb-4 h-6 w-6 text-primary"
                      />
                      <span className="block font-semibold">
                        File upload assignment
                      </span>
                      <span className="mt-3 block text-sm leading-6 text-muted-foreground">
                        Students upload a document, image, or PDF. Review their
                        latest submission, optionally use a rubric, and enter
                        the score.
                      </span>
                      <span className="mt-3 block text-sm">
                        Best for projects, portfolios, and performance outputs.
                      </span>
                    </button>
                    <p className="text-sm text-muted-foreground sm:col-span-2">
                      Both formats can sync scores to your class record. The
                      format is fixed after creation.
                    </p>
                  </div>
                )}
                {step === 1 && (
                  <div className="mt-5 space-y-5">
                    <p className="text-sm text-muted-foreground">
                      Choose where this{" "}
                      {setup.type === "file_upload"
                        ? "file upload"
                        : "question"}{" "}
                      assignment’s score will appear.
                    </p>
                    <label className="block text-sm font-medium">
                      Academic period
                      <select
                        className={fields}
                        value={setup.quarter}
                        onChange={(event) =>
                          setSetup((current) => ({
                            ...current,
                            quarter: event.target
                              .value as AssignmentSetup["quarter"],
                            itemId: "",
                            manualSlot: false,
                          }))
                        }
                      >
                        {context.periods.map((entry) => (
                          <option
                            key={entry.key}
                            value={entry.key}
                            disabled={!entry.canPrepare}
                          >
                            {entry.label}
                            {!entry.canPrepare
                              ? ` — ${entry.readOnlyReason}`
                              : !entry.canRelease
                                ? " — draft only until active"
                                : " — active"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm font-medium">
                      Class-record category
                      <select
                        className={fields}
                        value={setup.category}
                        onChange={(event) =>
                          setSetup((current) => ({
                            ...current,
                            category: event.target
                              .value as AssignmentSetup["category"],
                            itemId: "",
                            manualSlot: false,
                          }))
                        }
                      >
                        <option value="">Choose a category</option>
                        {context.categories.map((entry) => (
                          <option key={entry.key} value={entry.key}>
                            {entry.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {setup.category && (
                      <>
                        {period?.workbook ? (
                          <>
                            <label className="block text-sm font-medium">
                              Slot placement
                              <select
                                aria-label="Slot placement"
                                className={fields}
                                value={
                                  setup.manualSlot ? "manual" : "automatic"
                                }
                                onChange={(event) =>
                                  setSetup((current) => ({
                                    ...current,
                                    manualSlot: event.target.value === "manual",
                                    itemId: "",
                                  }))
                                }
                              >
                                <option value="automatic">
                                  Next available slot (recommended)
                                </option>
                                <option value="manual">
                                  Choose a specific slot
                                </option>
                              </select>
                            </label>
                            {setup.manualSlot && (
                              <label className="block text-sm font-medium">
                                Class-record slot
                                <select
                                  aria-label="Class-record slot"
                                  className={fields}
                                  value={setup.itemId}
                                  onChange={(event) =>
                                    change("itemId", event.target.value)
                                  }
                                >
                                  <option value="">Choose a slot</option>
                                  {slots.map((slot) => (
                                    <option
                                      key={slot.itemId}
                                      value={slot.itemId}
                                      disabled={!slot.isSelectable}
                                    >
                                      Slot {slot.order} —{" "}
                                      {slot.isSelectable
                                        ? slot.title
                                        : slot.assessmentTitle ||
                                          "Manual scores recorded"}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            )}
                            {!slots.some((slot) => slot.isSelectable) && (
                              <p
                                role="status"
                                className="text-sm text-destructive"
                              >
                                This category is full. Choose another category
                                or skip setup and arrange placement in the
                                editor.
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            A {period?.label} class record will be created with
                            this draft. It will use the first available{" "}
                            {category?.label} slot.
                          </p>
                        )}
                        <p
                          className="rounded-md border border-border bg-muted p-3 text-sm"
                          aria-live="polite"
                        >
                          {placementValid
                            ? destination
                            : "Select an available slot to continue."}
                        </p>
                      </>
                    )}
                    {period && !period.canRelease && (
                      <p className="text-sm text-muted-foreground">
                        You can prepare this assignment now. Publishing is
                        available when this period becomes active.
                      </p>
                    )}
                  </div>
                )}
                {step === 2 && (
                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <label className="block text-sm font-medium sm:col-span-2">
                      Assignment name
                      <input
                        className={fields}
                        maxLength={255}
                        value={setup.title}
                        onChange={(event) =>
                          change("title", event.target.value)
                        }
                        placeholder="For example, Chapter 2 reflection"
                      />
                    </label>
                    <fieldset>
                      <legend className="text-sm font-medium">
                        Due date · Asia/Manila (UTC+8)
                      </legend>
                      <label className="mt-3 flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={setup.noDueDate}
                          onChange={(event) =>
                            change("noDueDate", event.target.checked)
                          }
                        />
                        No due date — keep open
                      </label>
                      {!setup.noDueDate && (
                        <>
                          <label className="mt-3 block text-sm">
                            Due date and time
                            <input
                              type="datetime-local"
                              className={fields}
                              value={setup.dueDate}
                              onChange={(event) =>
                                change("dueDate", event.target.value)
                              }
                            />
                          </label>
                          <label className="mt-3 flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={setup.closeWhenDue}
                              onChange={(event) =>
                                change("closeWhenDue", event.target.checked)
                              }
                            />
                            Close submissions when due
                          </label>
                        </>
                      )}
                    </fieldset>
                    {setup.type === "quiz" ? (
                      <label className="block text-sm font-medium">
                        Maximum attempts
                        <input
                          aria-label="Maximum attempts"
                          className={fields}
                          type="number"
                          min={1}
                          max={100}
                          step={1}
                          value={setup.maxAttempts}
                          onChange={(event) =>
                            change("maxAttempts", event.target.value)
                          }
                        />
                        <span className="mt-2 block font-normal text-muted-foreground">
                          How many times each student can take this assignment
                          (1–100).
                        </span>
                      </label>
                    ) : (
                      <p className="rounded-md border border-border p-3 text-sm">
                        Students can submit revisions while the assignment is
                        open. The latest submission is graded.
                      </p>
                    )}
                    <div className="border-t border-border pt-4 text-sm sm:col-span-2">
                      <p className="font-medium">
                        {setup.type === "quiz"
                          ? "Question assignment"
                          : "File upload assignment"}
                      </p>
                      <p className="mt-1">{destination}</p>
                      <p className="mt-1 text-muted-foreground">
                        {setup.noDueDate
                          ? "No due date"
                          : `${setup.dueDate.replace("T", " ")} · Asia/Manila`}{" "}
                        · Draft, hidden from students
                      </p>
                    </div>
                  </div>
                )}
              </motion.section>
            </AnimatePresence>
          )}
        </div>
        {!pending && context?.defaultPeriod && !loading && (
          <footer className="border-t border-border px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {step > 0 ? (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => go(step - 1)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Choose a format to continue
                </span>
              )}
              {step === 1 && (
                <Button
                  disabled={busy || !placementValid}
                  onClick={() => go(2)}
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              {step === 2 && (
                <Button disabled={busy} onClick={() => void submit(false)}>
                  {busy
                    ? "Creating…"
                    : setup.type === "quiz"
                      ? "Create question assignment"
                      : "Create file upload assignment"}
                </Button>
              )}
            </div>
            {step > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void submit(true)}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  Skip setup &amp; start editing
                </button>
                <p className="mt-1 text-xs text-muted-foreground">
                  Creates an unpublished, unplaced draft. Students cannot see
                  it.
                </p>
              </div>
            )}
          </footer>
        )}
      </DialogContent>
    </Dialog>
  );
}
