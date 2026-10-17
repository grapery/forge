import { creativeControlOptions, creativeRuneCount, hasValidCreativeControls, type CreativeControlField, type CreativeControls } from "../../lib/workflow-creative-controls"

type Props = { value: CreativeControls; onChange: (value: CreativeControls) => void; t: (key: string) => string }

export function CreativeControlsForm({ value, onChange, t }: Props) {
  return <section aria-labelledby="creative-controls-title" className="mx-auto max-w-5xl px-5 py-6">
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
      <h2 id="creative-controls-title" className="text-base font-semibold tracking-tight">{t("creativeDefaultsTitle")}</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("creativeDefaultsHelp")}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("creativeSystemManaged")}</p>
    </div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {(Object.keys(creativeControlOptions) as CreativeControlField[]).map((key) => <label key={key} htmlFor={`creative-${key}`} className="grid gap-2 text-sm font-medium">
        {t(`creative_${key}`)}
        <select id={`creative-${key}`} value={value[key]} onChange={(event) => onChange({ ...value, [key]: event.target.value })} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal">
          {creativeControlOptions[key].map((option) => <option key={option} value={option}>{t(`creativeOption_${option}`)}</option>)}
        </select>
      </label>)}
    </div>
    <div className="mt-7 border-t border-border pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-sm font-semibold">{t("creativeExamplesTitle")}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{t("creativeExamplesHelp")}</p></div>
        <button type="button" disabled={value.examples.length >= 3} onClick={() => onChange({ ...value, examples: [...value.examples, { input: "", output: "" }] })} className="min-h-10 rounded-full border border-border px-4 text-sm disabled:opacity-40">{t("creativeExampleAdd")}</button>
      </div>
      {value.examples.length === 0 && <p className="mt-3 text-sm text-muted-foreground">{t("creativeExamplesOptional")}</p>}
      <div className="mt-4 grid gap-4">{value.examples.map((example, index) => <fieldset key={index} className="rounded-xl border border-border bg-muted/25 p-4">
        <legend className="px-1 text-xs font-medium">{t("creativeExample")} {index + 1}</legend>
        <div className="grid gap-4 md:grid-cols-2">{(["input", "output"] as const).map((field) => <label key={field} htmlFor={`creative-example-${index}-${field}`} className="grid gap-2 text-sm">
          <span>{t(`creativeExample_${field}`)} <span className="text-xs text-muted-foreground">{creativeRuneCount(example[field])}/{field === "input" ? 500 : 1500}</span></span>
          <textarea id={`creative-example-${index}-${field}`} rows={4} value={example[field]} onChange={(event) => onChange({ ...value, examples: value.examples.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: event.target.value } : item) })} className="min-h-28 resize-y rounded-lg border border-border bg-background p-3 text-sm leading-6" />
        </label>)}</div>
        <button type="button" aria-label={`${t("creativeExampleRemove")} ${index + 1}`} onClick={() => onChange({ ...value, examples: value.examples.filter((_, itemIndex) => itemIndex !== index) })} className="mt-2 min-h-10 text-xs text-muted-foreground underline-offset-4 hover:underline">{t("creativeExampleRemove")}</button>
      </fieldset>)}</div>
      {!hasValidCreativeControls(value) && <p role="alert" className="mt-3 text-sm text-destructive">{t("creativeExamplesInvalid")}</p>}
    </div>
  </section>
}
