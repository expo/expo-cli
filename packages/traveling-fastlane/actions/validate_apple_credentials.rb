$LOAD_PATH.unshift File.expand_path(__dir__, __FILE__)

require 'funcs'
require 'spaceship'
require 'json'

$appleId, $password = ARGV[0].gsub(/\s+/m, ' ').strip.split(" ")

json_reply = with_captured_stderr{
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

    $stderr.puts (JSON.generate({
      result: 'success',
      teams: account.teams,
      fastlaneSession: cookie_yaml
    }))
  rescue Spaceship::Client::InvalidUserCredentialsError => invalid_cred
    $stderr.puts (JSON.generate({
      result:'failure',
      reason:'Invalid credentials',
      rawDump:invalid_cred.message
    }))
  rescue Exception => e
    $stderr.puts (JSON.generate({
      result:'failure',
      reason:'Unknown reason',
      rawDump:e.message
    }))
  end
}

$stderr.puts json_reply
