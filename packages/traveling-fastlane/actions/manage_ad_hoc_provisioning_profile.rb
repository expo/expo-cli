require 'spaceship'
require 'json'
require 'base64'
require 'set'
require_relative 'funcs'

ENV['SPACESHIP_AVOID_XCODE_API'] = '1'

$teamId, $udidsString, $bundleId, $certSerialNumber = ARGV
$udids = $udidsString.split(',')

$result = nil

def find_dist_cert(serialNumber, isEnterprise)
  certs = if isEnterprise == 'true'
    Spaceship::Portal.certificate.in_house.all
  else
    Spaceship::Portal.certificate.production.all
  end

  if $certSerialNumber == '__last__'
    certs.last
  else
    certs.find do |c|
      c.raw_data['serialNum'] == $certSerialNumber
    end
  end
end

def register_missing_devices(udids)
  all_iphones = Spaceship.device.all_iphones
  already_added = all_iphones.select { |d| d.enabled? and udids.include?(d.udid) }
  already_added_udids = already_added.map { |i| i.udid }

  devices = [*already_added]

  udids_to_add = udids - already_added_udids
  udids_to_add.each { |udid|
    devices.push Spaceship.device.create!(name: "iPhone (added by Expo)", udid: udid)
  }

  devices
end

def find_profile_by_bundle_id(bundle_id)
  Spaceship::Portal.provisioning_profile.ad_hoc.find_by_bundle_id(bundle_id: bundle_id).first
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
    # Spaceship::Portal doesn't seem to have a method for initializing portal client
    # without supplying Apple ID username/password (or i didn't find one). Fortunately,
    # we can pass here whatever we like, as long as we set FASTLANE_SESSION env variable.
    Spaceship::Portal.login('fake-login', 'fake-password')
    Spaceship::Portal.client.team_id = $teamId

    # Then we register all missing devices on the Apple Developer Portal. They are identified by UDIDs.
    devices = register_missing_devices($udids)

    # Then we try to find an already existing provisioning profile for the App ID.
    existing_profile = find_profile_by_bundle_id($bundleId)
    if existing_profile
      # We need to verify whether the existing profile includes all user's devices.
      device_udids_in_profile = Set.new(existing_profile.devices.map { |d| d.udid })
      all_device_udids = Set.new($udids)
      if device_udids_in_profile == all_device_udids and existing_profile.valid?
        $result = { result: 'success' }
      else
        # We need to add new devices to the list and create a new provisioning profile.
        existing_profile.devices = devices
        existing_profile.update!

        updated_profile = find_profile_by_bundle_id($bundleId)
        profile = download_provisioning_profile(updated_profile)
        $result = {
          result: 'success',
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
          bundle_id: $bundleId,
          certificate: dist_cert,
          devices: devices
        )
        profile = download_provisioning_profile(new_profile)
        $result = {
          result: 'success',
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
