# (@dsokal)
# This is a slightly modified `manage_provisioning_profiles.rb` that's going to be used in eas-cli.
# I didn't want to modify the original script because I didn't want to spend time on modifying expo-cli.
# We're moving away from traveling-fastlane anyway.

require 'spaceship'
require 'json'
require 'base64'
require_relative 'funcs'

$action, $appleId, $password, $teamId, $profileType, $bundleId, *$extraArgs = ARGV
ENV['FASTLANE_TEAM_ID'] = $teamId
ENV['SPACESHIP_AVOID_XCODE_API'] = '1'

def get_certificate_provider()
  if $profileType == 'in_house_dist'
    Spaceship::Portal.certificate.in_house
  elsif $profileType == 'in_house_adhoc'
    Spaceship::Portal.certificate.in_house
  elsif $profileType == 'app_store_dist'
    Spaceship::Portal.certificate.production
  elsif $profileType == 'app_store_adhoc'
    Spaceship::Portal.certificate.production
  else
    raise ArgumentError, '$profileType must be one of: in_house_dist, in_house_adhoc, app_store_dist, app_store_adhoc'
  end
end

def get_profile_provider()
  if $profileType == 'in_house_dist'
    Spaceship::Portal.provisioning_profile.in_house
  elsif $profileType == 'in_house_adhoc'
    Spaceship::Portal.provisioning_profile.ad_hoc
  elsif $profileType == 'app_store_dist'
    Spaceship::Portal.provisioning_profile.app_store
  elsif $profileType == 'app_store_adhoc'
    Spaceship::Portal.provisioning_profile.ad_hoc
  else
    raise ArgumentError, '$profileType must be one of: in_house_dist, in_house_adhoc, app_store_dist, app_store_adhoc'
  end
end

def find_dist_cert(dist_cert_serial)
  certs = get_certificate_provider().all
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
    profile = get_profile_provider().create!(bundle_id: $bundleId, certificate: cert, name: profile_name)
    profile_content = profile.download
    {
      provisioningProfileId: profile.id,
      provisioningProfile: Base64.encode64(profile_content),
      devices: profile.devices.map{|device| get_device_info(device)}

    }
  end
end

def revoke()
  result = profile = get_profile_provider().find_by_bundle_id(bundle_id: $bundleId)
  if result.length != 0
    provisioning_profile = result[0]
    provisioning_profile.delete!
  end
end

def find_profile_by_id(profile_id, bundle_id)
  profiles = get_profile_provider().find_by_bundle_id(bundle_id: bundle_id)
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
    devices: profile.devices.map{|device| get_device_info(device)},
  }
end

def list(bundle_id)
  profiles = get_profile_provider().find_by_bundle_id(bundle_id: bundle_id)
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
    devices: profile.devices.map{|device| get_device_info(device)},
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

def get_device_info(device)
  {
    id: device.id,
    name: device.name,
    udid: device.udid,
    platform: device.platform,
    status: device.status,
    deviceType: device.device_type,
    model: device.model,
  }
end


$result = nil

with_captured_stderr{
  begin
    Spaceship::Portal.login($appleId, $password)
    Spaceship::Portal.client.team_id = $teamId

    if $action == 'create'
      dist_cert_serial = $extraArgs[0]
      profile_name = $extraArgs[1]
      cert = find_dist_cert(dist_cert_serial)
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
        profiles: list($bundleId),
      }
    elsif $action == 'use-existing'
      profile_id = $extraArgs[0]
      dist_cert_serial = $extraArgs[1]
      cert = find_dist_cert(dist_cert_serial)
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
