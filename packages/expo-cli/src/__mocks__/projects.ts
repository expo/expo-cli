import { RobotUser, User } from '@expo/api';
import { ProjectPrivacy } from '@expo/config';
import { v4 as uuidv4 } from 'uuid';

const { getProjectOwner: actualGetProjectOwner } = jest.requireActual('../projects');

interface ProjectData {
  accountName: string;
  projectName: string;
  privacy?: ProjectPrivacy;
}

async function _ensureProjectExistsAsync(
  _user: User | RobotUser,
  _data: ProjectData
): Promise<string> {
  return uuidv4();
}

const ensureProjectExistsAsync = jest.fn(_ensureProjectExistsAsync);
const getProjectOwner = jest.fn(actualGetProjectOwner);

export { ensureProjectExistsAsync, getProjectOwner };
