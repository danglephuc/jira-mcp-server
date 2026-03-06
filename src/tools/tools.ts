import { JiraClient } from '../jira/client.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { ToolsetGroup } from '../types/toolsets.js';
import { getIssuesTool } from './issue/getIssues.js';
import { getIssueTool } from './issue/getIssue.js';
import { getProjectsTool } from './issueMetadata/getProjects.js';
import { getIssueTypesTool } from './issueMetadata/getIssueTypes.js';
import { getIssueStatusesTool } from './issueMetadata/getIssueStatuses.js';
import { getPrioritiesTool } from './issueMetadata/getPriorities.js';
import { getFieldsTool } from './issueMetadata/getFields.js';

export function allTools(
  client: JiraClient,
  helper: TranslationHelper
): ToolsetGroup {
  return {
    toolsets: [
      {
        name: 'issue',
        description: 'Tools for querying Jira issues (list and single issue).',
        enabled: false,
        tools: [getIssuesTool(client, helper), getIssueTool(client, helper)],
      },
      {
        name: 'issue_metadata',
        description:
          'Tools for querying Jira issue metadata (projects, issue types, statuses, priorities, fields).',
        enabled: false,
        tools: [
          getProjectsTool(client, helper),
          getIssueTypesTool(client, helper),
          getIssueStatusesTool(client, helper),
          getPrioritiesTool(client, helper),
          getFieldsTool(client, helper),
        ],
      },
    ],
  };
}
