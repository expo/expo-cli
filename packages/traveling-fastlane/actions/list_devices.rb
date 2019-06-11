require 'spaceship'
require 'json'
require 'base64'
require 'optparse'
require_relative 'funcs'

options = {}
OptionParser.new do |opts|
  opts.banner = "Usage: example.rb [options]"

  opts.on("-p", "--all-ios-profile-devices", "all devices that can be used for iOS profiles") do |ios_profile_devices|
    options[:iosProfileDevices] = ios_profile_devices
  end

end.parse!

$appleId, $password, $teamId = ARGV
ENV['FASTLANE_TEAM_ID'] = $teamId

def get_devices(options)
  # if no options were specified, return all devices by default
  if options.empty?
    return Spaceship::Portal.device.all.map { |device| device.raw_data }
  end

  # merge devices from all options
  devices = Set.new()
  if options[:iosProfileDevices]
    ios_profile_devices = Spaceship::Portal.device.all_ios_profile_devices.map { |device| device.raw_data }
    devices.merge(ios_profile_devices)
  end

  return devices.to_a
end

def list_devices(options)
  with_captured_stderr {
    begin
      Spaceship::Portal.login($appleId, $password)
      Spaceship::Portal.client.team_id = $teamId
      return { result: 'success', devices: get_devices(options) }
    rescue Spaceship::Client::UnexpectedResponse => e
      return {
        result: 'failure',
        reason: 'Unexpected response',
        rawDump: e.error_info || dump_error(e)
      }
    rescue Spaceship::Client::InvalidUserCredentialsError => invalid_cred
      return {
        result: 'failure',
        reason: 'Invalid credentials',
        rawDump: invalid_cred.preferred_error_info
      }
    rescue Exception => e
      return {
        result: 'failure',
        reason: 'Unknown reason',
        rawDump: dump_error(e)
      }
    end
  }
end


$stderr.puts JSON.generate(list_devices(options))
