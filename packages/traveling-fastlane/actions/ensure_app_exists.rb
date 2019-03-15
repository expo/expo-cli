require 'spaceship'
require 'json'
require 'base64'
require_relative 'funcs'

$appleId, $password, $teamId, $bundleId, $name = ARGV
ENV['FASTLANE_TEAM_ID'] = $teamId

def ensure_app_exists()
  app = Spaceship::Portal.app.find $bundleId
  if app == nil
    Spaceship::Portal.app.create!(bundle_id: $bundleId, name: $name)
    true
  else
    false
  end
end

$result = nil

with_captured_stderr{
  begin
    Spaceship::Portal.login($appleId, $password)
    Spaceship::Portal.client.team_id = $teamId
    created = ensure_app_exists()
    $result = { result: 'success', created: created }
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
