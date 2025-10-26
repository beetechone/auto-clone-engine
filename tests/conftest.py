import sys
from pathlib import Path

# Add the root directory to Python path so tests can import apps module
root_dir = Path(__file__).parent.parent
sys.path.insert(0, str(root_dir))
