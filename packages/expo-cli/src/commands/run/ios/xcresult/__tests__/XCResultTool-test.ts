import fs from 'fs';
import path from 'path';

import { ActionsInvocationRecord } from '../XCResult.types';
import { transformXCResults } from '../XCResultTool';

describe(transformXCResults, () => {
  it(`transforms ActionsInvocationRecord`, async () => {
    const fixture = JSON.parse(
      await fs.promises.readFile(
        path.join(__dirname, 'fixtures/ActionsInvocationRecord.json'),
        'utf8'
      )
    );

    const parsed = transformXCResults(fixture) as ActionsInvocationRecord;
    expect(parsed.actions[0].buildResult.metrics.warningCount).toBe(5);
    expect(parsed.actions[0].endedTime instanceof Date).toBe(true);

    // Some deeply nested item
    expect(
      parsed.issues.warningSummaries[0].documentLocationInCreatingWorkspace.concreteTypeName
    ).toBe('Xcode3ProjectDocumentLocation');
  });
  it(`transforms ActivityLogSection`, async () => {
    const fixture = JSON.parse(
      await fs.promises.readFile(path.join(__dirname, 'fixtures/ActivityLogSection.json'), 'utf8')
    );

    const parsed = transformXCResults(fixture) as ActionsInvocationRecord;
    // console.log(JSON.stringify(parsed));
    await fs.promises.writeFile(
      path.join(__dirname, 'output.json'),
      JSON.stringify(parsed, null, 2),
      'utf8'
    );
    // expect(parsed.actions[0].buildResult.metrics.warningCount).toBe(5);
    // expect(parsed.actions[0].endedTime instanceof Date).toBe(true);

    // // Some deeply nested item
    // expect(
    //   parsed.issues.warningSummaries[0].documentLocationInCreatingWorkspace.concreteTypeName
    // ).toBe('Xcode3ProjectDocumentLocation');
  });
});
