// Rewrites the Date Field Alerts fixture items in the e2e project so their
// dates are relative to today. Needs a token with the `project` scope; the fixture issues are public.

import { execFileSync } from 'node:child_process';
import { DATE_ALERT_ITEMS, FIXTURE_REPO, PROJECT, dateFromToday } from './project';

const START_FIELD = 'Start Date';
const END_FIELD = 'End Date';
const STATUS_FIELD = 'Status';

interface ProjectMeta {
  projectId: string;
  fieldIds: Record<string, string>;
  statusOptionIds: Record<string, string>;
}

export function resolveToken(): string {
  const token = process.env.E2E_GITHUB_TOKEN;
  if (token) return token;
  try {
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
  } catch {
    throw new Error('Set E2E_GITHUB_TOKEN (scope: project) or log in with `gh auth login -s project`.');
  }
}

async function graphql<T>(token: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (!res.ok || body.errors?.length) {
    throw new Error(`GitHub GraphQL failed: ${body.errors?.map((e) => e.message).join('; ') ?? res.status}`);
  }
  return body.data as T;
}

async function loadProjectMeta(token: string): Promise<ProjectMeta> {
  const data = await graphql<{
    user: {
      projectV2: {
        id: string;
        fields: { nodes: Array<{ id?: string; name?: string; options?: Array<{ id: string; name: string }> }> };
      };
    };
  }>(
    token,
    `query($owner: String!, $number: Int!) {
      user(login: $owner) {
        projectV2(number: $number) {
          id
          fields(first: 50) {
            nodes {
              ... on ProjectV2FieldCommon { id name }
              ... on ProjectV2SingleSelectField { options { id name } }
            }
          }
        }
      }
    }`,
    { owner: PROJECT.owner, number: PROJECT.number },
  );

  const project = data.user.projectV2;
  const fieldIds: Record<string, string> = {};
  let statusOptionIds: Record<string, string> = {};
  for (const field of project.fields.nodes) {
    if (!field.id || !field.name) continue;
    fieldIds[field.name] = field.id;
    if (field.name === STATUS_FIELD && field.options) {
      statusOptionIds = Object.fromEntries(field.options.map((o) => [o.name, o.id]));
    }
  }
  for (const name of [START_FIELD, END_FIELD, STATUS_FIELD]) {
    if (!fieldIds[name]) throw new Error(`Field "${name}" not found in project ${PROJECT.number}`);
  }
  return { projectId: project.id, fieldIds, statusOptionIds };
}

async function issueNodeIds(token: string): Promise<Map<number, { id: string; state: string } | undefined>> {
  const aliases = DATE_ALERT_ITEMS.map((item) => `i${item.issue}: issue(number: ${item.issue}) { id state }`).join('\n');
  const data = await graphql<{ repository: Record<string, { id: string; state: string }> }>(
    token,
    `query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { ${aliases} } }`,
    { owner: FIXTURE_REPO.owner, name: FIXTURE_REPO.name },
  );
  return new Map(DATE_ALERT_ITEMS.map((item) => [item.issue, data.repository[`i${item.issue}`]]));
}

async function setDate(token: string, meta: ProjectMeta, itemId: string, field: string, offset: number | null) {
  const fieldId = meta.fieldIds[field];
  if (offset === null) {
    await graphql(
      token,
      `mutation($p: ID!, $i: ID!, $f: ID!) {
        clearProjectV2ItemFieldValue(input: { projectId: $p, itemId: $i, fieldId: $f }) { clientMutationId }
      }`,
      { p: meta.projectId, i: itemId, f: fieldId },
    );
    return;
  }
  await graphql(
    token,
    `mutation($p: ID!, $i: ID!, $f: ID!, $d: Date!) {
      updateProjectV2ItemFieldValue(input: { projectId: $p, itemId: $i, fieldId: $f, value: { date: $d } }) { clientMutationId }
    }`,
    { p: meta.projectId, i: itemId, f: fieldId, d: dateFromToday(offset) },
  );
}

export async function seedDateAlertItems(token: string = resolveToken()): Promise<void> {
  const meta = await loadProjectMeta(token);
  const issues = await issueNodeIds(token);

  for (const item of DATE_ALERT_ITEMS) {
    const issue = issues.get(item.issue);
    if (!issue) throw new Error(`Issue #${item.issue} not found in ${FIXTURE_REPO.owner}/${FIXTURE_REPO.name}`);
    const wantClosed = item.status === 'Done';
    if (wantClosed !== (issue.state === 'CLOSED')) {
      throw new Error(`Issue #${item.issue} should be ${wantClosed ? 'closed' : 'open'} for status "${item.status}"`);
    }

    // Adding an item that is already in the project returns the existing item.
    const added = await graphql<{ addProjectV2ItemById: { item: { id: string } } }>(
      token,
      `mutation($p: ID!, $c: ID!) { addProjectV2ItemById(input: { projectId: $p, contentId: $c }) { item { id } } }`,
      { p: meta.projectId, c: issue.id },
    );
    const itemId = added.addProjectV2ItemById.item.id;

    const optionId = meta.statusOptionIds[item.status];
    if (!optionId) throw new Error(`Status option "${item.status}" not found`);
    await graphql(
      token,
      `mutation($p: ID!, $i: ID!, $f: ID!, $o: String!) {
        updateProjectV2ItemFieldValue(input: { projectId: $p, itemId: $i, fieldId: $f, value: { singleSelectOptionId: $o } }) { clientMutationId }
      }`,
      { p: meta.projectId, i: itemId, f: meta.fieldIds[STATUS_FIELD], o: optionId },
    );
    await setDate(token, meta, itemId, START_FIELD, item.start);
    await setDate(token, meta, itemId, END_FIELD, item.end);
  }
}
