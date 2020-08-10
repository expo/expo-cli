import { ProjectPrivacy } from '@expo/config';
import { RobotUser, User } from '@expo/xdl';
import { v4 as uuidv4 } from 'uuid';

const { getProjectData: actualGetProjectData } = jest.requireActual('../projects');

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
const getProjectData = jest.fn(actualGetProjectData);

export { ensureProjectExistsAsync, getProjectData };
