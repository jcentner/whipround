/**
 * Minimal GitHub REST client (fetch-based, no dependencies) for triaging
 * campaign-suggestion issues. Token comes from the environment only.
 */
import process from "node:process";

const REPO = process.env.WHIPROUND_REPO ?? "jcentner/whipround";
const API = "https://api.github.com";

export const SUGGESTION_LABELS = [
  "suggestion",
  "shortlist",
  "blessed",
  "rejected",
  "done",
] as const;
export type SuggestionLabel = (typeof SUGGESTION_LABELS)[number];

export interface IssueSummary {
  number: number;
  title: string;
  labels: string[];
  url: string;
}
export interface IssueDetail extends IssueSummary {
  body: string;
}

function token(): string {
  const t = process.env.GITHUB_TOKEN;
  if (!t) throw new Error("GITHUB_TOKEN is not set");
  return t;
}

async function gh(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${API}/repos/${REPO}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token()}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "whipround-admin",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(
      `GitHub ${init?.method ?? "GET"} ${path} → ${res.status} ${res.statusText}`,
    );
  }
  return res.status === 204 ? null : res.json();
}

interface RawIssue {
  number: number;
  title: string;
  html_url: string;
  body?: string | null;
  pull_request?: unknown;
  labels?: Array<string | { name?: string }>;
}

function labelNames(labels: RawIssue["labels"]): string[] {
  return (labels ?? []).map((l) => (typeof l === "string" ? l : (l.name ?? "")));
}

export async function listSuggestions(label?: string): Promise<IssueSummary[]> {
  const q = new URLSearchParams({ state: "open", per_page: "100" });
  q.set("labels", label ?? "suggestion");
  const data = (await gh(`/issues?${q.toString()}`)) as RawIssue[];
  return data
    .filter((i) => !i.pull_request)
    .map((i) => ({
      number: i.number,
      title: i.title,
      labels: labelNames(i.labels),
      url: i.html_url,
    }));
}

export async function getIssue(n: number): Promise<IssueDetail> {
  const i = (await gh(`/issues/${n}`)) as RawIssue;
  return {
    number: i.number,
    title: i.title,
    labels: labelNames(i.labels),
    url: i.html_url,
    body: i.body ?? "",
  };
}

export async function addLabel(n: number, label: string): Promise<void> {
  await gh(`/issues/${n}/labels`, {
    method: "POST",
    body: JSON.stringify({ labels: [label] }),
  });
}
