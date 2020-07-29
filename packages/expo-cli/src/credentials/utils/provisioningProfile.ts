import plist, { PlistArray, PlistObject } from '@expo/plist';

interface AppleTeam {
  teamId: string;
  teamName: string;
}

function readAppleTeam(dataBase64: string): AppleTeam {
  let profilePlist;
  try {
    const buffer = Buffer.from(dataBase64, 'base64');
    const profile = buffer.toString('utf-8');
    profilePlist = plist.parse(profile) as PlistObject;
  } catch (error) {
    throw new Error('Provisioning profile is malformed');
  }
  const teamId = (profilePlist['TeamIdentifier'] as PlistArray)?.[0] as string;
  const teamName = profilePlist['TeamName'] as string;
  if (!teamId) {
    throw new Error('Team identifier is missing from provisoning profile');
  }
  return { teamId, teamName };
}

export default { readAppleTeam };
