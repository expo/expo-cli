require 'spaceship'
require 'json'
require 'base64'
require_relative 'funcs'

$action, $appleId, $password, $teamId, $isEnterprise, $bundleId, *$extraArgs = ARGV
ENV['FASTLANE_TEAM_ID'] = $teamId
ENV['SPACESHIP_AVOID_XCODE_API'] = '1'

def find_dist_cert(dist_cert_serial, is_enterprise)
  certs = is_enterprise == 'true' \
  ? Spaceship::Portal.certificate.in_house.all \
  : Spaceship::Portal.certificate.production.all

  certs.find do |c|
    c.raw_data['serialNum'] == dist_cert_serial
  end
end

def create(cert, profile_name)
  if cert == nil
    {
      result: 'failure',
      reason: 'No cert available to make provision profile against',
      rawDump: 'Make sure you were able to make a certificate prior to this step'
    }
  else
    profile = $isEnterprise == 'true' \
      ? Spaceship::Portal.provisioning_profile.in_house.create!(bundle_id: $bundleId, certificate: cert, name: profile_name) \
      : Spaceship::Portal.provisioning_profile.app_store.create!(bundle_id: $bundleId, certificate: cert, name: profile_name)
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

def find_profile_by_id(profile_id, bundle_id)
  profiles = $isEnterprise == 'true' \
    ? Spaceship::Portal.provisioning_profile.in_house.find_by_bundle_id(bundle_id: bundle_id) \
    : Spaceship::Portal.provisioning_profile.app_store.find_by_bundle_id(bundle_id: bundle_id)

  profiles.detect{|profile| profile.id == profile_id}
end

def assign_dist_cert(profile, dist_cert)
  if dist_cert == nil
    {
      result: 'failure',
      reason: 'No cert available to make provision profile against',
      rawDump: 'Make sure you were able to make a certificate prior to this step'
    }
  end
  # assign our dist cert to the existing profile
  profile.certificates = [dist_cert]
  profile =  profile.update!

  {
    provisioningProfileId: profile.id,
    provisioningProfile: Base64.encode64(profile.download),
  }
end

def list(bundle_id, is_enterprise)
  profiles = nil
  if is_enterprise == 'true'
    profiles = Spaceship::Portal.provisioning_profile.in_house.find_by_bundle_id(bundle_id: bundle_id)
  else 
    profiles = Spaceship::Portal.provisioning_profile.app_store.find_by_bundle_id(bundle_id: bundle_id)
  end
  profiles.map{|profile| get_profile_info(profile)}
end

def get_profile_info(profile)
  {
    name: profile.name,
    status: profile.status,
    expires: profile.expires.to_time.to_i,
    distributionMethod: profile.distribution_method,
    certificates: list_dist_certs(profile.certificates),
    provisioningProfileId: profile.id,
    provisioningProfile: Base64.encode64(profile.download),
  }
end

def list_dist_certs(certs)
  certs.map do |cert|
    cert_info = {
      id: cert.id,
      name: cert.name,
      status: cert.status,
      ownerType: cert.owner_type,
      ownerName: cert.owner_name,
      ownerId: cert.owner_id,
      serialNumber: cert.raw_data['serialNum'],
    }
    cert_info['created'] = cert.created.to_time.to_i if not cert.created.nil?
    cert_info['expires'] = cert.expires.to_time.to_i if not cert.expires.nil?
    cert_info
  end
end


$result = nil

with_captured_stderr{
  begin
    Spaceship::Portal.login($appleId, $password)
    Spaceship::Portal.client.team_id = $teamId

    if $action == 'create'
      dist_cert_serial = $extraArgs[0]
      profile_name = $extraArgs[1]
      cert = find_dist_cert(dist_cert_serial, $isEnterprise)
      provisioningProfile = create(cert, profile_name)
      if provisioningProfile.key?('result')
        $result = provisioningProfile
      else
        $result = { result: 'success', **provisioningProfile }
      end
    elsif $action == 'revoke'
      revoke()
      $result = { result: 'success' }
    elsif $action == 'list'
      $result = {
        result: 'success',
        profiles: list($bundleId, $isEnterprise),
      }
    elsif $action == 'use-existing'
      profile_id = $extraArgs[0]
      dist_cert_serial = $extraArgs[1]
      cert = find_dist_cert(dist_cert_serial, $isEnterprise)
      provisioningProfile = find_profile_by_id(profile_id, $bundleId)
      provisioningProfile = assign_dist_cert(provisioningProfile, cert)
      if provisioningProfile.key?('result')
        $result = provisioningProfile
      else
        $result = { result: 'success', **provisioningProfile }
      end
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
