# So that we can require funcs.rb
$LOAD_PATH.unshift File.expand_path(__dir__, __FILE__)

require 'funcs'
require 'spaceship'
require 'json'
require 'base64'

$appleId, $password, $bundleId, $teamId, $isEnterprise = ARGV[0].gsub(/\s+/m, ' ').strip.split(" ")

ENV['FASTLANE_TEAM_ID'] = $teamId

json_reply = with_captured_stderr{
  begin
    Spaceship::Portal.login($appleId, $password)
    Spaceship::Portal.client.team_id = $teamId
    cert = nil

    if $isEnterprise == 'true'
      cert = Spaceship::Portal.certificate.in_house.production.all.last
    else
      cert = Spaceship::Portal.certificate.production.all.last
    end

    if cert == nil
      $stderr.puts(JSON.generate({result:'failure',
                                  reason:'No cert available to make provision profile against',
                                  rawDump:'Make sure you were able to make a certificate prior to this step'}))
    else
      profile = nil

      if $isEnterprise == 'true'
        profile = Spaceship::Portal.provisioning_profile.in_house.create!(bundle_id: $bundleId, certificate: cert)
      else
        profile = Spaceship::Portal.provisioning_profile.app_store.create!(bundle_id: $bundleId, certificate: cert)
      end

      provisionProfile = profile.download
      $stderr.puts(JSON.generate({result:'success',
                                  provisioningProfileId: profile.id,
                                  provisioningProfile:Base64.encode64(provisionProfile)}))
    end

  rescue Spaceship::Client::UnexpectedResponse => e
    r = "#{e.error_info['userString']} #{e.error_info['resultString']}"
    $stderr.puts(JSON.generate({result:'failure',
                                reason:r,
                                rawDump:e.error_info}))
  rescue Spaceship::Client::InvalidUserCredentialsError => invalid_cred
    $stderr.puts(JSON.generate({result:'failure',
                                reason:'Invalid credentials',
                                rawDump:invalid_cred.preferred_error_info}))
  rescue Exception => e
    $stderr.puts(JSON.generate({result:'failure',
                                reason:'Unknown reason',
                                rawDump:e.message}))
  end
}

$stderr.puts json_reply
