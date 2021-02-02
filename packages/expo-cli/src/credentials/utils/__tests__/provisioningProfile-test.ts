import { testProvisioningProfileBase64 } from '../../__tests__/fixtures/mock-base64-data';
import * as provisioningProfileUtils from '../provisioningProfile';

const MALFORMED_PROVISIONING_PROFILE = 'aWV5Zmd3eXVlZmdl';

describe('provisioningProfileUtils', () => {
  describe('readAppleTeam', () => {
    it('returns correct teamId', () => {
      const team = provisioningProfileUtils.readAppleTeam(testProvisioningProfileBase64);
      expect(team).toEqual({
        teamId: 'QL76XYH73P',
        teamName: 'Alicja Warchał',
      });
    });

    it('throws an error if provisioning profile is maflormed', () => {
      expect(() =>
        provisioningProfileUtils.readAppleTeam(MALFORMED_PROVISIONING_PROFILE)
      ).toThrowError('Provisioning profile is malformed');
    });
  });

  describe('readProfileName', () => {
    it('returns correct profile name', () => {
      const profileName = provisioningProfileUtils.readProfileName(testProvisioningProfileBase64);
      expect(profileName).toEqual('org.reactjs.native.example.testapp.turtlev2 profil');
    });

    it('throws an error if provisioning profile is maflormed', () => {
      expect(() =>
        provisioningProfileUtils.readProfileName(MALFORMED_PROVISIONING_PROFILE)
      ).toThrowError('Provisioning profile is malformed');
    });
  });
});
