import { ProjectPrivacy } from '@expo/config';
import { User } from '@expo/xdl';
import { v4 as uuidv4 } from 'uuid';

interface ProjectData {
  accountName: string;
  projectName: string;
  privacy?: ProjectPrivacy;
}

async function _ensureProjectExistsAsync(_user: User, _data: ProjectData): Promise<string> {
  return uuidv4();
}

const ensureProjectExistsAsync = jest.fn(_ensureProjectExistsAsync);

export { ensureProjectExistsAsync };
