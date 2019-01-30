def with_captured_stderr
  old_stderr = $stderr
  $stderr = StringIO.new
  yield
  $stderr.string
ensure
  $stderr = old_stderr
end

def dump_error(e)
  { type: e.class.to_s, message: e.message, backtrace: e.backtrace }
end
