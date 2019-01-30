require 'spaceship'
require 'json'
require 'base64'
require_relative 'funcs'

$action, $appleId, $password, $teamId, $isEnterprise, $bundleId, $extraArgs = ARGV
ENV['FASTLANE_TEAM_ID'] = $teamId
ENV['SPACESHIP_AVOID_XCODE_API'] = '1'

def create()
  certs = $isEnterprise == 'true' \
    ? Spaceship::Portal.certificate.in_house.all \
    : Spaceship::Portal.certificate.production.all

  cert = nil
  if $extraArgs == '__last__'
    cert = certs.last
  else
    cert = certs.find do |c|
      c.raw_data['serialNum'] == $extraArgs
    end
  end

  if cert == nil
    {
      result: 'failure',
      reason: 'No cert available to make provision profile against',
      rawDump: 'Make sure you were able to make a certificate prior to this step'
    }
  else
    profile = $isEnterprise == 'true' \
      ? Spaceship::Portal.provisioning_profile.in_house.create!(bundle_id: $bundleId, certificate: cert) \
      : Spaceship::Portal.provisioning_profile.app_store.create!(bundle_id: $bundleId, certificate: cert)
    profile_content = profile.download
    {
      provisioningProfileId: profile.id,
      provisioningProfile: Base64.encode64(profile_content),
    }
  end
end

def revoke()
  result = $isEnterprise == 'true' \
    ? Spaceship::Portal.provisioning_profile.in_house.find_by_bundle_id(bundle_id: $bundleId) \
    : Spaceship::Portal.provisioning_profile.app_store.find_by_bundle_id(bundle_id: $bundleId)
  if result.length != 0
    provisioning_profile = result[0]
    provisioning_profile.delete!
  end
end

$result = nil

with_captured_stderr{
  begin
    Spaceship::Portal.login($appleId, $password)
    Spaceship::Portal.client.team_id = $teamId

    if $action == 'create'
      provisioningProfile = create()
      if provisioningProfile.key?('result')
        $result = provisioningProfile
      else
        $result = { result: 'success', **provisioningProfile }
      end
    elsif $action == 'revoke'
      revoke()
      $result = { result: 'success' }
    else
      $result = {
        result: 'failure',
        reason: "Unknown action requested: #{$action}"
      }
    end
  rescue Spaceship::Client::UnexpectedResponse => e
    $result = {
      result: 'failure',
      reason: 'Unexpected response',
      rawDump: e.error_info || dump_error(e)
    }
  rescue Spaceship::Client::InvalidUserCredentialsError => invalid_cred
    $result = {
      result: 'failure',
      reason: 'Invalid credentials',
      rawDump: invalid_cred.preferred_error_info
    }
  rescue Exception => e
    $result = {
      result: 'failure',
      reason: 'Unknown reason',
      rawDump: dump_error(e)
    }
  end
}

$stderr.puts JSON.generate($result)
