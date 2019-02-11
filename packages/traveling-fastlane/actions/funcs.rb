def with_captured_stderr
  old_stderr = $stderr
  $stderr = StringIO.new
  yield
  $stderr.string
ensure
  $stderr = old_stderr
end

def with_captured_output
  old_stdout, old_stderr = $stdout, $stderr
  $stdout, $stderr = StringIO.new, StringIO.new
  yield
ensure
  $stdout, $stderr = old_stdout, old_stderr
end

def dump_error(e)
  { type: e.class.to_s, message: e.message, backtrace: e.backtrace }
end
