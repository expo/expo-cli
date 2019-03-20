require 'spaceship'
require 'json'
require 'base64'
require_relative 'funcs'

$appleId, $password, $teamId = ARGV
ENV['FASTLANE_TEAM_ID'] = $teamId

def list_devices()
  with_captured_stderr {
    begin
      Spaceship::Portal.login($appleId, $password)
      Spaceship::Portal.client.team_id = $teamId
      return { result: 'success', devices: Spaceship::Portal.device.all.map { |device| device.raw_data } }
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


$stderr.puts JSON.generate(list_devices)
