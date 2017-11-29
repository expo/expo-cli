# So that we can require funcs.rb
$LOAD_PATH.unshift File.expand_path(__dir__, __FILE__)

require 'funcs'
require 'spaceship'
require 'json'
# This provides the ask function which asks enduser for creds
require 'highline/import'
require 'base64'

$appleId, $password, $bundleId = ARGV

json_reply = with_captured_stderr{
  begin
    Spaceship::Portal.login($appleId, $password)
    # First check for it, if it exists, then grab it and use it.
    filtered_profiles = Spaceship::Portal.provisioning_profile.app_store.find_by_bundle_id(bundle_id:$bundleId)
    if !filtered_profiles.empty?
      profile = filtered_profiles.last
      if profile.valid? && profile.certificate_valid?
        provisionProfile = profile.download
        $stderr.puts(JSON.generate({result:'success',
                                    provisionProfile:Base64.encode64(provisionProfile)}))
      else
        r = 'Provisioning profile exists but either it or the associated certificate is invalid'
        d = "profile.valid?: #{profile.valid?}, profile.certificate_valid?:#{profile.certificate_valid?}"
        $stderr.puts(JSON.generate({result:'failure',
                                    reason:r,
                                    rawDump:d }))
      end
    else
      cert = Spaceship::Portal.certificate.production.all.last
      if cert == nil
        $stderr.puts(JSON.generate({result:'failure',
                                    reason:'No cert available to make provision profile against',
                                    rawDump:''}))
      else
        profile = Spaceship::Portal.provisioning_profile.app_store.create!(bundle_id: $bundleId,
                                                                           certificate: cert)
        provisionProfile = profile.download
        $stderr.puts(JSON.generate({result:'success',
                                    provisioningProfile:Base64.encode64(provisionProfile)}))
      end

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
