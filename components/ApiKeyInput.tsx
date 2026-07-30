"use client";

import { useEffect, useState } from "react";
import {
  clearStoredApiKey,
  getStoredApiKey,
  getStoredModel,
  setStoredApiKey,
  setStoredModel,
} from "@/lib/api-key";
import { DEFAULT_MODEL_ID, MODEL_OPTIONS } from "@/lib/gemini";

type ApiKeyInputProps = {
  onKeyChange?: (key: string) => void;
  onModelChange?: (modelId: string) => void;
  serverHasDefault?: boolean;
};

export function ApiKeyInput({
  onKeyChange,
  onModelChange,
  serverHasDefault = false,
}: ApiKeyInputProps) {
  const [value, setValue] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL_ID);
  const [saved, setSaved] = useState(false);
  const [show, setShow] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const existing = getStoredApiKey();
    const existingModel = getStoredModel();
    setValue(existing);
    setModel(existingModel);
    setSaved(Boolean(existing));
    setHydrated(true);
    setCollapsed(serverHasDefault && !existing);
    onKeyChange?.(existing);
    onModelChange?.(existingModel);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once
  }, [serverHasDefault]);

  const save = () => {
    const trimmed = value.trim();
    setStoredApiKey(trimmed);
    setStoredModel(model);
    setSaved(Boolean(trimmed));
    onKeyChange?.(trimmed);
    onModelChange?.(model);
  };

  const clear = () => {
    clearStoredApiKey();
    setValue("");
    setSaved(false);
    onKeyChange?.("");
    if (serverHasDefault) setCollapsed(true);
  };

  const onSelectModel = (id: string) => {
    setModel(id);
    setStoredModel(id);
    onModelChange?.(id);
  };

  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-5xl px-6 pb-6">
        <div className="h-24 border border-border bg-card/20" />
      </div>
    );
  }

  return (
    <section id="api-key" className="mx-auto w-full max-w-5xl px-6 pb-2">
      <div className="border border-border bg-card/40 p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
              Settings
            </p>
            <h3 className="mt-2 font-serif text-xl text-foreground">
              {serverHasDefault ? "Ready to analyze" : "Google AI Studio"}
            </h3>
            <p className="mt-1 max-w-lg text-sm text-muted">
              {serverHasDefault
                ? "A shared free API key is configured on the server — you can analyze right away. Optionally use your own key and pick a model below."
                : "Paste a free AI Studio key and pick a model. Key stays in this browser only."}{" "}
              {!serverHasDefault && (
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline-offset-2 hover:underline"
                >
                  Get a free key
                </a>
              )}
            </p>
          </div>
          {serverHasDefault && (
            <p className="text-xs uppercase tracking-[0.14em] text-accent">
              Default key active
            </p>
          )}
          {!serverHasDefault && saved && (
            <p className="text-xs uppercase tracking-[0.14em] text-accent">
              Key saved locally
            </p>
          )}
        </div>

        {collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="mt-5 text-sm text-accent underline-offset-2 hover:underline"
          >
            Advanced: use your own API key / change model
          </button>
        ) : (
          <>
            <label className="mt-5 block text-xs uppercase tracking-[0.14em] text-muted">
              Model
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {MODEL_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onSelectModel(opt.id)}
                  className={`rounded-full border px-4 py-2 text-left text-sm transition ${
                    model === opt.id
                      ? "border-accent bg-accent text-accent-dark"
                      : "border-border text-muted hover:border-accent hover:text-accent"
                  }`}
                >
                  <span className="font-medium">{opt.label}</span>
                  <span
                    className={`mt-0.5 block text-[11px] ${
                      model === opt.id
                        ? "text-accent-dark/70"
                        : "text-muted/80"
                    }`}
                  >
                    {opt.hint}
                  </span>
                </button>
              ))}
            </div>

            <label className="mt-5 block text-xs uppercase tracking-[0.14em] text-muted">
              {serverHasDefault
                ? "Your own API key (optional)"
                : "API key"}
            </label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <input
                  type={show ? "text" : "password"}
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    setSaved(false);
                  }}
                  placeholder={
                    serverHasDefault
                      ? "Leave blank to use the shared default key"
                      : "Paste AIza… or AQ.… key from AI Studio"
                  }
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full border border-border bg-background/80 px-4 py-3 pr-20 text-sm text-foreground outline-none placeholder:text-muted/60 focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-accent"
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>
              <button
                type="button"
                onClick={save}
                disabled={!value.trim()}
                className="rounded-full bg-accent px-6 py-3 text-sm font-semibold tracking-wide text-accent-dark transition hover:brightness-110 disabled:opacity-50"
              >
                Save key
              </button>
              {(saved || serverHasDefault) && (
                <button
                  type="button"
                  onClick={clear}
                  className="rounded-full border border-border px-5 py-3 text-sm text-muted transition hover:border-accent hover:text-accent"
                >
                  {saved ? "Clear" : "Hide"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
