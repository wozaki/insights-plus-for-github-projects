// GitHub Project Insights - URL Parser Module
// Responsibility: Parse GitHub Project Insights URLs to extract organization/user, project number, and insight number

export interface ParsedProjectInsightsUrl {
  /** Organization or user prefix (e.g., "orgs:myorg" or "users:myuser") */
  orgOrUser: string;
  projectNumber: string;
  /** Insight number, or "default" if not specified in URL */
  insightNumber: string;
}

/**
 * Parse a GitHub Project Insights URL to extract organization/user, project number, and insight number
 * 
 * Supports URLs in the format:
 * - https://github.com/orgs/{org-name}/projects/{project-number}/insights/{insight-number}
 * - https://github.com/users/{user-name}/projects/{project-number}/insights/{insight-number}
 * - https://github.com/orgs/{org-name}/projects/{project-number}/insights (default chart)
 * - https://github.com/users/{user-name}/projects/{project-number}/insights (default chart)
 * 
 * @param url The URL to parse (defaults to window.location.href)
 * @returns Parsed URL information, or null if parsing fails
 */
export function parseProjectInsightsUrl(url: string = window.location.href): ParsedProjectInsightsUrl | null {
  try {
    const urlObj = new URL(url);
    
    // Check if it's a GitHub URL
    if (urlObj.hostname !== 'github.com') {
      return null;
    }
    
    const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
    
    // Minimum path structure: [orgs|users, org-or-user-name, projects, project-number, insights]
    if (pathParts.length < 5) {
      return null;
    }
    
    const [type, orgOrUserName, projectsKeyword, projectNumber, insightsKeyword, ...rest] = pathParts;
    
    // Validate the path structure
    if (type !== 'orgs' && type !== 'users') {
      return null;
    }
    
    if (projectsKeyword !== 'projects' || insightsKeyword !== 'insights') {
      return null;
    }
    
    // Validate that project number is numeric
    if (!/^\d+$/.test(projectNumber)) {
      return null;
    }
    
    // Check if insight number is provided
    let insightNumber = 'default';
    if (rest.length > 0 && /^\d+$/.test(rest[0])) {
      insightNumber = rest[0];
    }
    
    return {
      orgOrUser: `${type}:${orgOrUserName}`,
      projectNumber,
      insightNumber,
    };
  } catch (error) {
    console.error('Failed to parse project insights URL:', error);
    return null;
  }
}
