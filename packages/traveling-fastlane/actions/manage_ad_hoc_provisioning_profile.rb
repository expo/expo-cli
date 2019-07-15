require 'spaceship'
require 'json'
require 'base64'
require 'optparse'
require 'set'
require_relative 'funcs'

ENV['SPACESHIP_AVOID_XCODE_API'] = '1'

options = {}
OptionParser.new do |opts|
  opts.banner = "Usage: example.rb [options]"

  opts.on("-p", "--profile-id PROFILE_ID", "select a profile by id") do |profile_id|
    options[:profileId] = profile_id
  end

  opts.on("-ai", "--apple-id APPLE_ID", "apple id to login with") do |apple_id|
    options[:appleId] = apple_id
  end

  opts.on("-ap", "--apple-password APPLE_PASSWORD", "apple password to login with") do |apple_password|
    options[:applePassword] = apple_password
  end
end.parse!

$teamId, $udidsString, $bundleId, $certSerialNumber = ARGV
$udids = $udidsString.split(',')
$profileId, $appleId, $applePassword = options.values_at(:profileId, :appleId, :applePassword)
$result = nil

def find_dist_cert(serial_number, isEnterprise)
  certs = if isEnterprise == 'true'
    Spaceship::Portal.certificate.in_house.all
  else
    Spaceship::Portal.certificate.production.all
  end

  if serial_number == '__last__'
    certs.last
  else
    certs.find do |c|
      c.raw_data['serialNum'] == serial_number
    end
  end
end

def register_missing_devices(udids)
  all_ios_profile_devices = Spaceship.device.all_ios_profile_devices
  already_added = all_ios_profile_devices.select { |d| udids.include?(d.udid) }
  already_added_udids = already_added.map { |i| i.udid }

  devices = [*already_added]

  udids_to_add = udids - already_added_udids
  udids_to_add.each { |udid|
    devices.push Spaceship.device.create!(name: "iOS Device (added by Expo)", udid: udid)
  }

  devices
end

def find_profile_by_id(profile_id, bundle_id)
  Spaceship::Portal.provisioning_profile.ad_hoc.find_by_bundle_id(bundle_id: bundle_id).detect{|profile| profile.id == profile_id}
end

def find_profile_by_bundle_id(bundle_id)
  expo_profiles = Spaceship::Portal.provisioning_profile.ad_hoc.find_by_bundle_id(bundle_id: bundle_id)
  expo_profiles = expo_profiles.select{ |profile|
    profile.name.start_with?('*[expo]') and profile.status != 'Expired'
  }
  # find profiles associated with our development cert
  expo_profiles_with_cert = expo_profiles.select{ |profile|
    profile.certificates.any?{|cert| cert.raw_data['serialNumber'] == $certSerialNumber} # this api only returns field 'serialNumber', but not 'serialNum'
  }

  if !expo_profiles_with_cert.empty?
    # there is an expo managed profile with our desired certificate
    # return the profile that will be valid for the longest duration
    { profile: expo_profiles_with_cert.sort_by{|profile| profile.expires}.last, didUpdate: false}
  elsif !expo_profiles.empty? 
    # there is an expo managed profile, but it doesnt have our desired certificate
    # append the certificate and update the profile 
    dist_cert = find_dist_cert($certSerialNumber, in_house?($teamId))
    profile = expo_profiles.sort_by{|profile| profile.expires}.last
    profile.certificates = [dist_cert]
    {profile: profile.update!, didUpdate: true}
  else
     # there is no valid provisioning profile available
    {profile: nil , didUpdate: false}
  end

end

def download_provisioning_profile(profile)
  profile_content = profile.download
  {
    id: profile.id,
    content: Base64.encode64(profile_content),
  }
end

def in_house?(team_id)
  team = Spaceship::Portal.client.teams.find { |t| t['teamId'] == team_id }
  team['type'] === 'In-House'
end

with_captured_output{
  begin
    if ENV['FASTLANE_SESSION']      
      # Spaceship::Portal doesn't seem to have a method for initializing portal client
      # without supplying Apple ID username/password (or i didn't find one). Fortunately,
      # we can pass here whatever we like, as long as we set FASTLANE_SESSION env variable.
      Spaceship::Portal.login('fake-login', 'fake-password')
    elsif $appleId && $applePassword
      Spaceship::Portal.login($appleId, $applePassword)
    else
      raise ArgumentError, 'Must pass in an Apple Session or Apple login/password'
    end

    Spaceship::Portal.client.team_id = $teamId

    # Then we register all missing devices on the Apple Developer Portal. They are identified by UDIDs.
    devices = register_missing_devices($udids)

    # If no profile id is passed, try to find a suitable provisioning profile for the App ID.
    if $profileId 
      existing_profile = find_profile_by_id($profileId, $bundleId)
      didUpdate = false
      # Fail if we cannot find the profile that was specifically requested
      if !existing_profile
        raise ArgumentError, "Could not find profile with profile id #{$profileId} for bundle id #{$bundleId}"
      end
    else
      existing_profile, didUpdate = find_profile_by_bundle_id($bundleId).values_at(:profile, :didUpdate)
    end

    if existing_profile
      # We need to verify whether the existing profile includes all user's devices.
      device_udids_in_profile = Set.new(existing_profile.devices.map { |d| d.udid })
      all_device_udids = Set.new($udids)
      if device_udids_in_profile == all_device_udids and existing_profile.valid?
        profile = download_provisioning_profile(existing_profile)
        $result = { 
          result: 'success',
          provisioningProfileUpdateTimestamp: (DateTime.now.to_s() if didUpdate),
          provisioningProfileName: existing_profile.name,
          provisioningProfileId: profile[:id],
          provisioningProfile: profile[:content],
        }.reject{ |k,v| v.nil? }
      else
        # We need to add new devices to the list and create a new provisioning profile.
        existing_profile.devices = devices
        existing_profile.update!

        updated_profile = find_profile_by_bundle_id($bundleId)[:profile]
        profile = download_provisioning_profile(updated_profile)
        $result = {
          result: 'success',
          provisioningProfileUpdateTimestamp: DateTime.now.to_s(),
          provisioningProfileName: updated_profile.name,
          provisioningProfileId: profile[:id],
          provisioningProfile: profile[:content],
        }
      end
    else
      # We need to find user's distribution certificate to make a provisioning profile for it.
      dist_cert = find_dist_cert($certSerialNumber, in_house?($teamId))

      if dist_cert == nil
        # If the distribution certificate doesn't exist, the user must have deleted it, we can't do anything here :(
        $result = {
          result: 'failure',
          reason: 'No distribution certificate available to make provisioning profile against',
        }
      else
        # If the provisioning profile for the App ID doesn't exist, we just need to create a new one!
        new_profile = Spaceship::Portal.provisioning_profile.ad_hoc.create!(
          name: "*[expo] #{$bundleId} AdHoc #{DateTime.now.to_s()}", # apple drops [ if its the first char (!!)
          bundle_id: $bundleId,
          certificate: dist_cert,
          devices: devices
        )
        profile = download_provisioning_profile(new_profile)
        $result = {
          result: 'success',
          provisioningProfileUpdateTimestamp: DateTime.now.to_s(),
          provisioningProfileCreateTimestamp: DateTime.now.to_s(),
          provisioningProfileName: new_profile.name,
          provisioningProfileId: profile[:id],
          provisioningProfile: profile[:content],
        }
      end
    end
  rescue Spaceship::Client::UnexpectedResponse => e
    $result = {
      result: 'failure',
      reason: 'Unexpected response',
      rawDump: e.error_info || dump_error(e)
    }
  rescue Spaceship::Client::InvalidUserCredentialsError => e
    $result = {
      result: 'failure',
      type: 'session-expired',
      reason: 'Apple Session expired',
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
