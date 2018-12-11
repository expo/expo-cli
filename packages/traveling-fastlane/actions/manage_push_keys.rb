require 'spaceship'
require 'json'
require 'base64'
require_relative 'funcs'

$action, $appleId, $password, $teamId, $extraArgs = ARGV
ENV['FASTLANE_TEAM_ID'] = $teamId

def list()
  keys = Spaceship::Portal::Key.all
  keys.map{ |key|
    {
      id: key.id,
      name: key.name,
    }
  }
end

def create(name)
  # (dsokal)
  # don't remove the following line until a new version of fastlane with my fix is released
  Spaceship::Portal::Key.all

  key = Spaceship::Portal::Key.create(name: name, apns: true)
  key_p8 = key.download
  {
    apnsKeyP8: key_p8,
    apnsKeyId: key.id,
  }
end

def revoke(ids)
  for id in ids do
    key = Spaceship::Portal::Key.find(id)
    key.revoke!
  end
end

$result = nil

with_captured_stderr{
  begin
    Spaceship::Portal.login($appleId, $password)
    Spaceship::Portal.client.team_id = $teamId

    if $action == 'list'
      $result = {
        result: 'success',
        keys: list(),
      }
    elsif $action == 'create'
      key = create($extraArgs)
      $result = { result: 'success', **key }
    elsif $action == 'revoke'
      ids = $extraArgs.split(',')
      revoke(ids)
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
