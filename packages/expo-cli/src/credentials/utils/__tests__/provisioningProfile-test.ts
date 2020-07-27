import provisioningProfileUtils from '../provisioningProfile';
import { provisioningProfileBase64 } from './tests-fixtures';

describe('provisioningProfileUtils', () => {
  describe('readAppleTeam', () => {
    it('should return correct teamId', () => {
      const team = provisioningProfileUtils.readAppleTeam(provisioningProfileBase64);
      expect(team).toEqual({
        teamId: 'QL76XYH73P',
        teamName: 'Alicja Warchał',
      });
    });
    it('should throw parsing error on incorrect file', () => {
      expect(() => provisioningProfileUtils.readAppleTeam('aWV5Zmd3eXVlZmdl')).toThrowError(
        'Provisioning profile is malformed'
      );
    });
  });
});
