require 'spaceship'
require 'json'
require_relative 'funcs'

$appleId, $password = ARGV
$result = nil

with_captured_stderr{
  begin
    account = Spaceship::Portal.login($appleId, $password)

    # copied from spaceship/lib/spaceship/spaceauth_runner.rb START
    itc_cookie_content = Spaceship::Portal.client.store_cookie
    cookies = YAML.safe_load(
      itc_cookie_content,
      [HTTP::Cookie, Time], # classes whitelist
      [],                   # symbols whitelist
      true                  # allow YAML aliases
    )
    cookies.select! do |cookie|
      cookie.name.start_with?("myacinfo") || cookie.name == 'dqsid'
    end
    cookie_yaml = cookies.to_yaml
    # copied from spaceship/lib/spaceship/spaceauth_runner.rb STOP

    $result = JSON.generate({
      result: 'success',
      teams: account.teams,
      fastlaneSession: cookie_yaml
    })
  rescue Spaceship::Client::InvalidUserCredentialsError => invalid_cred
    $result = JSON.generate({
      result: 'failure',
      reason: 'Invalid credentials',
      rawDump: invalid_cred.message
    })
  rescue Exception => e
    $result = JSON.generate({
      result: 'failure',
      reason: 'Unknown reason',
      rawDump: e.message
    })
  end
}

$stderr.puts $result
