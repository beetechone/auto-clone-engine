from loguru import logger
import sys, os

def setup_logging():
    logger.remove()
    logger.add(sys.stdout, level=os.getenv("LOG_LEVEL","INFO"), serialize=True, backtrace=True, diagnose=False)
    return logger
