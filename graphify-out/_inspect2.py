import inspect, sys
from graphify.detect import detect_incremental
src = inspect.getsource(detect_incremental)
sys.stdout.buffer.write(src[4000:].encode("utf-8"))
