import { EventEmitter } from 'events';

export default class Issues extends EventEmitter {
  constructor() {
    super();
    this.issues = {};
  }

  addIssue(issueId, issue) {
    this.issues[issueId] = {
      ...issue,
      id: issueId,
    };
    this.emit('ADDED', this.issues[issueId]);
  }

  clearIssue(issueId) {
    const issue = this.issues[issueId];
    if (issue) {
      delete this.issues[issueId];
      this.emit('DELETED', issue);
    }
  }

  getIssueList() {
    return Object.keys(this.issues).map(key => this.issues[key]);
  }
}
