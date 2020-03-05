import { EventEmitter } from 'events';

export type Issue = Record<string, any>;

export default class Issues extends EventEmitter {
  issues: Record<string, Issue> = {};

  addIssue(issueId: string, issue: Issue): void {
    let newIssue = false;
    if (!this.issues[issueId]) {
      newIssue = true;
    }
    this.issues[issueId] = {
      ...issue,
      id: issueId,
    };
    if (newIssue) {
      this.emit('ADDED', this.issues[issueId]);
    } else {
      this.emit('UPDATED', this.issues[issueId]);
    }
  }

  clearIssue(issueId: string): void {
    const issue = this.issues[issueId];
    if (issue) {
      delete this.issues[issueId];
      this.emit('DELETED', issue);
    }
  }

  getIssueList(): { cursor: string; node: Issue }[] {
    return Object.keys(this.issues).map(key => ({
      cursor: key,
      node: this.issues[key],
    }));
  }
}
